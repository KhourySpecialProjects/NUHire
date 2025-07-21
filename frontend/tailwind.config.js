/** @type {import('tailwindcss').Config} */


module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fff",
        foreground: "#fff",
        northeasternRed: "#D41A2A",
        northeasternBlack: "#000",
        northeasternWhite: "#fff",
        sand: "#fff",
        wood: "#D6C9B4",
        navy: "#000",
        redHeader: "#D41A2A",
      },
      fontFamily: {
        rubik: ["Rubik", "sans-serif"]
      }

    },
  },
  plugins: [],
}