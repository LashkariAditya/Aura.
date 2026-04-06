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
                background: "var(--background)",
                foreground: "var(--foreground)",
                muted: "var(--muted)",
                border: "var(--border)",
                brand: "var(--brand)",
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['Inter', 'sans-serif'],
            },
            letterSpacing: {
                'tightest': '-0.02em',
                'widest': '0.3em',
                'mega-widest': '0.4em',
            },
        },
    },
    plugins: [],
}
