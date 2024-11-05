/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
		  fontFamily: {
			  serif: ['adobe-caslon-pro', 'serif'],
			  display: ['fatfrank', 'sans-serif'],
			},
		},
  },
  plugins: [],
}

