"""Contacts & Birthdays module."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import re

from database import get_db, Contact

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None   # MM-DD or YYYY-MM-DD
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    notes: Optional[str] = None


def days_until_birthday(bday_str: str) -> Optional[int]:
    """Return days until next birthday from today."""
    if not bday_str:
        return None
    try:
        today = date.today()
        parts = bday_str.replace("/", "-").split("-")
        if len(parts) == 3:
            month, day = int(parts[1]), int(parts[2])
        elif len(parts) == 2:
            month, day = int(parts[0]), int(parts[1])
        else:
            return None
        next_bday = date(today.year, month, day)
        if next_bday < today:
            next_bday = date(today.year + 1, month, day)
        return (next_bday - today).days
    except Exception:
        return None


def parse_vcf(content: str) -> list[dict]:
    """
    Parse one or more vCard entries from a .vcf file.
    Handles vCard 2.1, 3.0 and 4.0.
    Returns a list of contact dicts.
    """
    contacts = []
    # Split into individual vCards
    cards = re.split(r'END:VCARD', content, flags=re.IGNORECASE)

    for card in cards:
        card = card.strip()
        if not card:
            continue

        def get_field(pattern: str) -> Optional[str]:
            m = re.search(pattern, card, re.IGNORECASE | re.MULTILINE)
            return m.group(1).strip() if m else None

        # Full name — prefer FN, fall back to N
        name = get_field(r'^FN[^:]*:(.+)$')
        if not name:
            n = get_field(r'^N[^:]*:(.+)$')
            if n:
                # N field: Last;First;Middle;Prefix;Suffix
                parts = [p.strip() for p in n.split(';')]
                name_parts = [p for p in [parts[1] if len(parts) > 1 else '',
                                           parts[0] if len(parts) > 0 else ''] if p]
                name = ' '.join(name_parts) or None

        if not name:
            continue   # Skip cards with no parseable name

        # Email — take first EMAIL field
        email = get_field(r'^EMAIL[^:]*:(.+)$')

        # Phone — take first TEL field
        phone = get_field(r'^TEL[^:]*:(.+)$')
        if phone:
            # Clean up common formatting
            phone = re.sub(r'[^\d\+\(\)\-\s]', '', phone).strip()

        # Birthday — BDAY field
        birthday = None
        bday_raw = get_field(r'^BDAY[^:]*:(.+)$')
        if bday_raw:
            bday_raw = bday_raw.strip().replace('--', '')  # vCard 4.0 uses --MMDD
            # Try YYYY-MM-DD or YYYYMMDD
            m = re.match(r'(\d{4})-?(\d{2})-?(\d{2})', bday_raw)
            if m:
                birthday = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            else:
                # Might be just MM-DD
                m = re.match(r'(\d{2})-?(\d{2})$', bday_raw)
                if m:
                    birthday = f"{m.group(1)}-{m.group(2)}"

        # Notes
        note = get_field(r'^NOTE[^:]*:(.+)$')

        contacts.append({
            "name":     name,
            "email":    email,
            "phone":    phone,
            "birthday": birthday,
            "notes":    note,
        })

    return contacts


@router.get("")
async def list_contacts(search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Contact).order_by(Contact.name)
    if search:
        q = q.where(or_(
            Contact.name.ilike(f"%{search}%"),
            Contact.email.ilike(f"%{search}%"),
        ))
    result = await db.execute(q)
    rows = result.scalars().all()
    contacts = []
    for r in rows:
        contacts.append({
            "id": r.id, "name": r.name, "email": r.email,
            "phone": r.phone, "birthday": r.birthday, "notes": r.notes,
            "days_until_birthday": days_until_birthday(r.birthday) if r.birthday else None,
        })
    return contacts


@router.get("/birthdays/upcoming")
async def upcoming_birthdays(days: int = 30, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.birthday != None))
    rows = result.scalars().all()
    upcoming = []
    for r in rows:
        d = days_until_birthday(r.birthday)
        if d is not None and d <= days:
            upcoming.append({
                "id": r.id, "name": r.name, "birthday": r.birthday,
                "days_until": d, "email": r.email,
            })
    return sorted(upcoming, key=lambda x: x["days_until"])


@router.post("")
async def create_contact(payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = Contact(**payload.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return {"id": contact.id, "name": contact.name, "status": "created"}


@router.post("/import/vcf")
async def import_vcf(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Import contacts from a .vcf vCard file (supports multiple cards per file)."""
    if not file.filename.lower().endswith('.vcf'):
        raise HTTPException(400, "Please upload a .vcf file")

    content_bytes = await file.read()
    # Try UTF-8 first, fall back to latin-1 (common in older exports)
    try:
        content = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content = content_bytes.decode('latin-1')

    parsed = parse_vcf(content)
    if not parsed:
        raise HTTPException(400, "No contacts found in this file")

    # Get existing names to detect duplicates
    existing_result = await db.execute(select(Contact.name))
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported, skipped = [], []
    for c in parsed:
        if c["name"].lower() in existing_names:
            skipped.append(c["name"])
            continue
        contact = Contact(
            name=c["name"],
            email=c["email"],
            phone=c["phone"],
            birthday=c["birthday"],
            notes=c["notes"],
        )
        db.add(contact)
        imported.append(c["name"])
        existing_names.add(c["name"].lower())

    await db.commit()

    return {
        "imported": len(imported),
        "skipped":  len(skipped),
        "imported_names": imported,
        "skipped_names":  skipped,
    }


@router.patch("/{contact_id}")
async def update_contact(contact_id: int, payload: ContactUpdate,
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(contact, field, val)
    contact.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "updated"}


@router.delete("/{contact_id}")
async def delete_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    await db.delete(contact)
    await db.commit()
    return {"status": "deleted"}



class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None   # MM-DD or YYYY-MM-DD
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    notes: Optional[str] = None


def days_until_birthday(bday_str: str) -> Optional[int]:
    """Return days until next birthday from today."""
    if not bday_str:
        return None
    try:
        today = date.today()
        # Support MM-DD or YYYY-MM-DD
        parts = bday_str.replace("/", "-").split("-")
        if len(parts) == 3:
            month, day = int(parts[1]), int(parts[2])
        elif len(parts) == 2:
            month, day = int(parts[0]), int(parts[1])
        else:
            return None
        next_bday = date(today.year, month, day)
        if next_bday < today:
            next_bday = date(today.year + 1, month, day)
        return (next_bday - today).days
    except Exception:
        return None


@router.get("")
async def list_contacts(search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Contact).order_by(Contact.name)
    if search:
        q = q.where(or_(
            Contact.name.ilike(f"%{search}%"),
            Contact.email.ilike(f"%{search}%"),
        ))
    result = await db.execute(q)
    rows = result.scalars().all()
    contacts = []
    for r in rows:
        contacts.append({
            "id": r.id, "name": r.name, "email": r.email,
            "phone": r.phone, "birthday": r.birthday, "notes": r.notes,
            "days_until_birthday": days_until_birthday(r.birthday) if r.birthday else None,
        })
    return contacts


@router.get("/birthdays/upcoming")
async def upcoming_birthdays(days: int = 30, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.birthday != None))
    rows = result.scalars().all()
    upcoming = []
    for r in rows:
        d = days_until_birthday(r.birthday)
        if d is not None and d <= days:
            upcoming.append({
                "id": r.id, "name": r.name, "birthday": r.birthday,
                "days_until": d, "email": r.email,
            })
    return sorted(upcoming, key=lambda x: x["days_until"])


@router.post("")
async def create_contact(payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = Contact(**payload.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return {"id": contact.id, "name": contact.name, "status": "created"}


@router.patch("/{contact_id}")
async def update_contact(contact_id: int, payload: ContactUpdate,
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(contact, field, val)
    contact.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "updated"}


@router.delete("/{contact_id}")
async def delete_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    await db.delete(contact)
    await db.commit()
    return {"status": "deleted"}
