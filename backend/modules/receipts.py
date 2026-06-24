"""Receipt Tracker module — upload, OCR, categorise, store."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional
import os, re, shutil
from datetime import datetime

from database import get_db, Receipt

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

UPLOAD_DIR = os.path.expanduser("~/.flowguide/receipts")
os.makedirs(UPLOAD_DIR, exist_ok=True)

CATEGORIES = [
    "Uncategorised", "Food & Groceries", "Transport", "Accommodation",
    "Health & Medical", "Office & Supplies", "Entertainment", "Utilities",
    "Clothing", "Education", "Software & Subscriptions", "Other"
]


def extract_text_from_file(filepath: str) -> str:
    """Extract raw text from PDF or image using available tools."""
    ext = os.path.splitext(filepath)[1].lower()
    text = ""
    try:
        if ext == ".pdf":
            import pdfplumber
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
        elif ext in (".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"):
            import pytesseract
            from PIL import Image
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
    except Exception as e:
        text = f"[OCR error: {e}]"
    return text.strip()


def parse_receipt_text(text: str) -> dict:
    """Heuristic extraction of merchant, amount, date from raw text."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    merchant = lines[0] if lines else "Unknown"

    # Amount — find largest currency-like number
    amounts = re.findall(r'(?:€|\$|£|EUR|USD|GBP)?\s*(\d{1,6}[.,]\d{2})', text)
    amount = None
    if amounts:
        candidates = [float(a.replace(",", ".")) for a in amounts]
        amount = max(candidates)

    # Currency
    currency = "EUR"
    for sym, code in [("€", "EUR"), ("$", "USD"), ("£", "GBP")]:
        if sym in text:
            currency = code
            break
    for code in ["EUR", "USD", "GBP", "CHF"]:
        if code in text.upper():
            currency = code
            break

    # Date
    date_str = None
    date_patterns = [
        r'\b(\d{4}[-/]\d{2}[-/]\d{2})\b',
        r'\b(\d{2}[-/.]\d{2}[-/.]\d{4})\b',
        r'\b(\d{1,2}\s+\w+\s+\d{4})\b',
    ]
    for pat in date_patterns:
        m = re.search(pat, text)
        if m:
            date_str = m.group(1)
            break

    return {"merchant": merchant, "amount": amount, "currency": currency, "date": date_str}


class ReceiptUpdate(BaseModel):
    merchant: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


@router.get("/categories")
async def get_categories():
    return CATEGORIES


@router.post("/upload")
async def upload_receipt(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"):
        raise HTTPException(400, "Unsupported file type")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    raw_text = extract_text_from_file(filepath)
    parsed   = parse_receipt_text(raw_text)

    receipt = Receipt(
        filename=safe_name,
        merchant=parsed["merchant"],
        amount=parsed["amount"],
        currency=parsed["currency"],
        date=parsed["date"],
        raw_text=raw_text,
        category="Uncategorised",
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)

    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "merchant": receipt.merchant,
        "amount": receipt.amount,
        "currency": receipt.currency,
        "date": receipt.date,
        "raw_text": receipt.raw_text[:500] if receipt.raw_text else "",
        "category": receipt.category,
    }


@router.get("")
async def list_receipts(category: Optional[str] = None, limit: int = 50,
                        db: AsyncSession = Depends(get_db)):
    q = select(Receipt).order_by(desc(Receipt.created_at)).limit(limit)
    if category:
        q = q.where(Receipt.category == category)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {"id": r.id, "filename": r.filename, "merchant": r.merchant,
         "amount": r.amount, "currency": r.currency, "date": r.date,
         "category": r.category, "notes": r.notes,
         "created_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.patch("/{receipt_id}")
async def update_receipt(receipt_id: int, payload: ReceiptUpdate,
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(receipt, field, val)
    await db.commit()
    return {"status": "updated"}


@router.delete("/{receipt_id}")
async def delete_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    filepath = os.path.join(UPLOAD_DIR, receipt.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    await db.delete(receipt)
    await db.commit()
    return {"status": "deleted"}


@router.get("/summary")
async def spending_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Receipt.category, func.sum(Receipt.amount), func.count(Receipt.id))
        .group_by(Receipt.category)
    )
    rows = result.all()
    return [
        {"category": r[0], "total": round(r[1] or 0, 2), "count": r[2]}
        for r in rows
    ]
