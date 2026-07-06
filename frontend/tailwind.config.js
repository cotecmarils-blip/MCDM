/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      screens: {
        xs: '480px',
      },
      maxWidth: {
        '9xl': '96rem',
      },
      colors: {
        navy: {
          50: '#eef3f9',
          100: '#d6e3f0',
          200: '#adc7e1',
          300: '#84a9cf',
          400: '#5c89b5',
          500: '#3d6f9a',
          600: '#2f5880',
          700: '#25466a',
          800: '#1a3352',
          900: '#0f2240',
          950: '#081528',
        },
      },
      boxShadow: {
        xs: '0 1px 1px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.02)',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('sidebar-expanded', '.sidebar-expanded &');
    },
  ],
};
