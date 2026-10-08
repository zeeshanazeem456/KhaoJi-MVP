import type { Config } from "tailwindcss";

/**
 * KhaoJi tokens — taken from Pakistani truck art and dhaba signboards.
 * chili  = brand surfaces (header, shop signs)
 * haldi  = the one primary action on a screen
 * neel   = deep truck-art blue for status / night panels
 * patti  = green for open / online / success
 * gulabi = truck-art pink, used for home kitchens
 * chai   = warm ink for text
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chili: { DEFAULT: "#D9301F", dark: "#B02316", light: "#FDE9E6" },
        haldi: { DEFAULT: "#FFC72C", dark: "#E5A800", light: "#FFF4D6" },
        neel: { DEFAULT: "#0E4D64", dark: "#093647", light: "#E3F0F4" },
        patti: { DEFAULT: "#13804A", light: "#E2F4EA" },
        gulabi: { DEFAULT: "#C2185B", light: "#FCE4EE" },
        chai: { DEFAULT: "#2A1810", muted: "#6B5B53", line: "#EAE3DF" },
        // kept so older class names still resolve
        brand: { DEFAULT: "#D9301F", dark: "#B02316", light: "#FDE9E6" },
        ink: { DEFAULT: "#2A1810", muted: "#6B5B53" },
      },
      fontFamily: {
        sign: ["Bungee", "Impact", "sans-serif"],
        sans: ["'Rubik Variable'", "Rubik", "system-ui", "sans-serif"],
        urdu: ["'Noto Nastaliq Urdu'", "serif"],
      },
      boxShadow: {
        sticker: "3px 3px 0 0 #2A1810",
        "sticker-sm": "2px 2px 0 0 #2A1810",
      },
      borderRadius: { panel: "28px" },
    },
  },
  plugins: [],
} satisfies Config;
