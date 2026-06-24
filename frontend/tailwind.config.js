/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // FlowGuide calm palette
        flow: {
          50:  '#f0f9f4',
          100: '#dcf0e6',
          200: '#bbe2cf',
          300: '#8dcdb0',
          400: '#5ab38c',
          500: '#389872',
          600: '#287a5b',
          700: '#21624a',
          800: '#1d4e3c',
          900: '#194132',
        },
        mist: {
          50:  '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        breathe: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
      }
    },
  },
  plugins: [],
}
