/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Verde principal (idêntico ao existente)
        lexiona: {
          50:  '#f0faf5',
          100: '#d6f2e4',
          200: '#aee4cc',
          300: '#77cead',
          400: '#42b48a',
          500: '#2e9168',  // primário
          600: '#267a58',
          700: '#1e6045',
          800: '#174c36',
          900: '#0f3023',
          950: '#071a12',
        },
        // Acento dourado (landing page → agora no app também)
        gold: {
          50:  '#fdf8ee',
          100: '#f8edcc',
          200: '#f0d98b',
          300: '#e8c053',
          400: '#d4a853',  // principal
          500: '#c4922a',
          600: '#a77320',
          700: '#85561a',
          800: '#6b4217',
          900: '#543416',
        },
        // Verde floresta (backgrounds escuros da LP)
        forest: {
          900: '#0d2b1e',
          800: '#132e21',
          700: '#1a3d2c',
        },
        // Creme (fundo alternativo)
        cream: '#faf8f0',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(15, 48, 35, 0.08)',
        'card-hover': '0 6px 24px rgba(15, 48, 35, 0.14)',
        'page': '0 1px 3px rgba(15, 48, 35, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
      },
    },
  },
  plugins: [],
}
