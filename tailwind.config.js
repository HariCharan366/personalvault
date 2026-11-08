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
        obsidian: {
          950: '#06080d',
          900: '#0b0f17',
          850: '#101622',
          800: '#161e2e',
          750: '#1c263a',
          700: '#243149',
          600: '#344566',
          500: '#485e8a',
          400: '#6882b5',
          300: '#94a9d4',
          200: '#c5d3f0',
          100: '#e6edfb',
        },
        vault: {
          950: '#06080d',
          900: '#0b0f17',
          850: '#101622',
          800: '#161e2e',
          750: '#1c263a',
          700: '#243149',
          600: '#344566',
          500: '#485e8a',
          400: '#6882b5',
          300: '#94a9d4',
          200: '#c5d3f0',
          100: '#e6edfb',
        },
        emerald: {
          450: '#05e595',
          500: '#10b981',
          550: '#059669',
        },
        neon: {
          mint: '#00F5A0',
          cyan: '#00D9F5',
          teal: '#14B8A6',
          violet: '#A855F7',
          amber: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-brand': '0 0 25px -4px rgba(0, 245, 160, 0.28)',
        'glow-cyan': '0 0 25px -4px rgba(0, 217, 245, 0.28)',
        'glow-sm': '0 0 12px -2px rgba(16, 185, 129, 0.22)',
        'glow-lg': '0 0 45px -8px rgba(0, 245, 160, 0.35)',
        'glass-card': '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
