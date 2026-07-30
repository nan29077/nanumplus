import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf4", 100: "#d7f2e3", 200: "#b1e4cb", 300: "#7ecfac",
          400: "#49b389", 500: "#27986f", 600: "#1b7a5a", 700: "#16624a",
          800: "#144e3c", 900: "#114032",
        },
        warm: { 50: "#fdfaf5", 100: "#faf3e7" },
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,64,50,0.05), 0 4px 16px rgba(17,64,50,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
