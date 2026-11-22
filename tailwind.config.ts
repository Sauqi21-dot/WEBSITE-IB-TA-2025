import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ib: {
          bg: "#FAFAF8",          // Latar
          text: "#14201B",        // Teks utama
          muted: "#5B6660",       // Teks sekunder
          border: "#E4E4DE",      // Garis
          action: "#047857",      // Aksen
          "action-hover": "#065F46", // Hover aksen
          danger: "#B3261E",      // Galat
          dark: "#14201B",        // Teks utama (kompatibilitas)
        },
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "serif"],
        sans: ["var(--font-source-sans-3)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
