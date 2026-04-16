import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06131d",
        panel: "#0a1d2a",
        mint: "#7ee081",
        sky: "#8fd4ff",
      },
      boxShadow: {
        glow: "0 24px 60px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(126,224,129,0.14), transparent 28%), radial-gradient(circle at top right, rgba(143,212,255,0.15), transparent 26%), linear-gradient(160deg, #08141f 0%, #061019 38%, #12293b 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
