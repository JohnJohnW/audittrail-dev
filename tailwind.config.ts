import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#171717",
          600: "#0a0a0a",
          700: "#000000",
        },
        accent: {
          DEFAULT: "#ff6b35",
          hover: "#e55a2b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
