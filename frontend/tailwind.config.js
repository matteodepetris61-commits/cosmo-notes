/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#070913',
          800: '#0d1124',
          700: '#171e3d',
          600: '#252f5e',
          500: '#3d4b8f'
        },
        stellar: {
          cyan: '#38bdf8',
          purple: '#c084fc',
          pink: '#f472b6',
          amber: '#fbbf24',
          emerald: '#34d399'
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.2))' }
        }
      }
    },
  },
  plugins: [],
}
