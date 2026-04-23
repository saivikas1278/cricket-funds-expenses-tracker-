/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricketGreen: '#2D6A4F',
        flatBg: '#FFFFFF',
        flatSecondary: '#F1F5F9'
      },
    },
  },
  plugins: [],
}
