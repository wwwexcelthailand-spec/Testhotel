import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5c2484",
          dark: "#421861",
          light: "#f5eef9",
          muted: "#eadcf3",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#fafafa",
          border: "#eeeeee",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "var(--font-noto-serif-thai)", "Georgia", "serif"],
        sans: ["var(--font-noto-sans-thai)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
