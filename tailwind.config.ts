import type { Config } from "tailwindcss";

// All colours come from CSS tokens in src/app/tokens.css (OKLCH channels),
// so the accent can be swapped at runtime without rebuilding.
const token = (name: string) => `oklch(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        raised: token("raised"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        "surface-3": token("surface-3"),
        ink: token("ink"),
        "ink-2": token("ink-2"),
        muted: token("muted"),
        faint: token("faint"),
        accent: token("accent"),
        "accent-ink": token("accent-ink"),
        profit: token("profit"),
        loss: token("loss"),
        warn: token("warn"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.16,1,.3,1)",
      },
      maxWidth: {
        page: "1240px",
      },
      zIndex: {
        base: "1",
        raised: "10",
        nav: "40",
        overlay: "50",
        grain: "60",
      },
    },
  },
  plugins: [],
};

export default config;
