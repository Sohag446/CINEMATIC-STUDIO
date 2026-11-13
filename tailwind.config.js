/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#0a0b0e',
          900: '#111318',
          850: '#161920',
          800: '#1c202a',
          750: '#232936',
          700: '#2c3344',
          600: '#3d475d',
          500: '#53607d',
          accent: '#8b5cf6',
          'accent-hover': '#7c3aed',
          'accent-light': '#a78bfa',
          'accent-glow': 'rgba(139, 92, 246, 0.25)',
          'purple-dark': '#5b21b6',
          'purple-deep': '#4c1d95',
          orange: '#e67e22',
          cyan: '#00d2ff',
          neon: '#00f0ff',
          success: '#2ecc71',
          warning: '#f1c40f',
          danger: '#e74c3c',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

