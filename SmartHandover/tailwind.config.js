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
                primary: "#258cf4", // Updated from HTML
                "background-light": "#f5f7f8", // Updated
                "background-dark": "#000000", // OLED Black
                "surface-dark": "#1C1C1E", // Asset Card Color
                "surface-dark-active": "#2C2C2E", // Asset Active Color
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                display: ["Manrope", "sans-serif"], // Added
            },
            backgroundImage: {
                'stripes-dark': 'repeating-linear-gradient(45deg, #2d2d2d, #2d2d2d 10px, #202020 10px, #202020 20px)',
                'stripes-light': 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px)',
            }
        },
    },
    plugins: [],
}
