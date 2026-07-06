/** @type {import('tailwindcss').Config} */
// Colors and fonts here mirror src/styles/tokens.css — tokens.css is the
// source of truth; Tailwind just exposes the same values as utilities.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cardinal: {
          DEFAULT: '#8C1515', // --c-accent
          dark: '#6D1010',
          light: '#B1040E',
          wash: '#F7E6E4', // --c-accent-wash
        },
        stone: {
          50: '#F7F6F5', // --c-paper
          100: '#EFEDEC', // --c-paper-sunken
          200: '#E9E6E3', // --c-rule
          300: '#D6D2CE', // --c-rule-strong
          400: '#98928D', // --c-ink-faint
          500: '#736E6A',
          600: '#5F5B58', // --c-ink-muted
          700: '#474441',
          800: '#33302E',
          900: '#221F1E', // --c-ink
        },
        sand: '#D2C295',
        palo: {
          teal: '#008566',
          green: '#1AA35A', // --c-series-1
        },
        olive: '#8F993E',
      },
      fontFamily: {
        serif: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,39,51,0.04), 0 2px 8px rgba(29,39,51,0.06)', // --shadow-card
        'card-hover': '0 2px 4px rgba(29,39,51,0.08), 0 8px 24px rgba(29,39,51,0.12)', // --shadow-popover
      },
    },
  },
  plugins: [],
}
