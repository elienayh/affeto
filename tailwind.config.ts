import type { Config } from "tailwindcss";

// Tokens extraídos da logo e da fotografia de referência da Affeto Pães.
// Ver seção 3 do prompt-v2 para o racional de cada cor.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F3ECDD",
        gold: "#B7A05E",
        "brown-dark": "#3A2E1F",
        terracota: "#B8623F",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        soft: "1.25rem",
      },
      boxShadow: {
        warm: "0 8px 24px -8px rgba(58, 46, 31, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
