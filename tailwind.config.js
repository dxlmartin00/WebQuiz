/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          950: '#0a0f1d',
        }
      },
      boxShadow: {
        'flat': '2px 2px 0px 0px rgba(15, 23, 42, 1)',
        'flat-sm': '1px 1px 0px 0px rgba(15, 23, 42, 1)',
        'flat-lg': '4px 4px 0px 0px rgba(15, 23, 42, 1)',
      }
    },
  },
  plugins: [],
};
