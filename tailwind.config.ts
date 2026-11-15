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
          dark: "#065F46",     // Hijau tua: judul, navigasi, blok footer
          action: "#047857",   // Hijau aksi: tombol dan link
          bright: "#34D399",   // Hijau terang: hanya di atas latar hijau tua
          bg: "#F7F5EF",       // Latar: background halaman
          text: "#14201B",     // Teks: teks utama
          border: "#D9D6CB",   // Garis: border dan pemisah
          accent: "#D99A00",   // Aksen: penanda hari ini, ultah, label diubah
          danger: "#B3261E",   // Peringatan: void kas, error
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
