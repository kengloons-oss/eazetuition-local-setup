/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/global.css",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#030014',
        accent: '#AB8BFF',
      },
    },
  },
  plugins: [],
};
