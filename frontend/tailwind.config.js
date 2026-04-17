
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: '#1DB954',
        dark: '#121212',
        darker: '#000000',
        surface: '#282828'
      }
    },
  },
  plugins: [],
}