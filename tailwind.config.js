/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F6',
        charcoal: '#1A1A1A',
        gold: {
          DEFAULT: '#C5A059',
          dark: '#A6841F',
          light: '#E5D5A8'
        }
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
