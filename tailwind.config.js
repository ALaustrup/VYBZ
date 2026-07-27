/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark ink — overlays, media stages, expanded player.
        ink: {
          950: "#070B14",
          900: "#0E1524",
          800: "#172033",
          700: "#243049",
          600: "#354463",
        },
        // Daylight paper — primary app chrome / panels.
        paper: {
          50: "#F7F9FF",
          100: "#EEF3FF",
          200: "#DDE6FF",
          300: "#C2D0F5",
          400: "#9AADD9",
          500: "#6B7FA8",
          700: "#2A3550",
          900: "#0F172A",
        },
        veil: {
          50: "rgb(var(--accent-rgb) / <alpha-value>)",
          100: "rgb(var(--accent-rgb) / <alpha-value>)",
          200: "rgb(var(--accent-rgb) / <alpha-value>)",
          300: "rgb(var(--accent-rgb) / <alpha-value>)",
          400: "rgb(var(--accent-rgb) / <alpha-value>)",
          500: "rgb(var(--accent-rgb) / <alpha-value>)",
          600: "rgb(var(--accent-rgb) / <alpha-value>)",
          700: "rgb(var(--accent-rgb) / <alpha-value>)",
          800: "rgb(var(--accent-rgb) / <alpha-value>)",
          900: "rgb(var(--accent-rgb) / <alpha-value>)",
        },
        feel: "#00D68F",
        wild: "#FF3B6E",
        shroud: "rgb(var(--accent-rgb) / <alpha-value>)",
        glow: "#00C2FF",
        coral: {
          400: "#FF6B4A",
          500: "#FF4D2E",
        },
        aqua: {
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#00C2FF",
        },
        steel: {
          100: "#F1F4FA",
          200: "#D7DEEC",
          300: "#A8B3C9",
          400: "#6B7894",
          500: "#45506A",
          600: "#2A3348",
          700: "#161C2C",
        },
      },
      fontFamily: {
        display: [
          '"Atkinson Hyperlegible"',
          "Lexend",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "Lexend",
          '"Atkinson Hyperlegible"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "Lexend",
          '"Atkinson Hyperlegible"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
      borderColor: {
        DEFAULT: "var(--hairline)",
      },
      boxShadow: {
        glow: "0 0 28px -10px rgb(var(--accent-rgb) / 0.55)",
        "glow-feel": "0 0 34px -12px rgba(0, 214, 143, 0.45)",
        "glow-wild": "0 0 34px -12px rgba(255, 59, 110, 0.45)",
        "glow-shroud": "0 0 34px -12px rgb(var(--accent-rgb) / 0.5)",
        card: "0 22px 50px -28px rgba(15, 30, 70, 0.28)",
        "btn-primary":
          "inset 0 1px 0 0 rgba(255,255,255,0.55), 0 12px 28px -14px rgb(var(--accent-rgb) / 0.55)",
        "btn-solid":
          "inset 0 1px 0 0 rgba(255,255,255,0.7), 0 10px 22px -14px rgba(15, 30, 70, 0.22)",
      },
      backgroundImage: {
        "veil-radial":
          "radial-gradient(circle at 18% 8%, rgb(var(--accent-rgb) / 0.16), transparent 42%), radial-gradient(circle at 88% 92%, rgba(255, 77, 46, 0.10), transparent 48%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.02)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
