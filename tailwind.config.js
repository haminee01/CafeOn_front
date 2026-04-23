/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5f4631",
        secondary: "#b69a7a",
        warning: "#dc4b4b",
        background: "#f6f4f1",
        surface: "#ffffff",
        "text-primary": "#1f2937",
        "text-muted": "#6b7280",
      },
      boxShadow: {
        soft: "0 8px 28px rgba(17, 24, 39, 0.06)",
      },
      borderRadius: {
        xl2: "1.125rem",
      },
    },
  },
  plugins: [],
};
