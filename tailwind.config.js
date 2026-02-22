/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        "soft-purple": "#8E86FF",
        "light-bg": "#F4F6FB",
        "card-light": "#FFFFFF",
        "dark-bg": "#121212",
        "dark-card": "#1E1E1E",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        "border-light": "#E5E7EB",
        "border-dark": "#2A2A2A",
      },
    },
  },
  plugins: [],
};
