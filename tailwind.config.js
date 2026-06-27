/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core surface palette — "Smoked Glass": refined graphite/charcoal,
        // cooler and less suffocating than pure black, so frosted panels and the
        // living background read as premium dark glass rather than a void.
        ink: {
          950: "#0a0b0f",
          900: "#0f1117",
          800: "#161922",
          700: "#1f2430",
          600: "#2a3040",
        },
        // Signature violet glow used across the brand.
        veil: {
          50: "#f4effe",
          100: "#e7dcfd",
          200: "#cbb2fb",
          300: "#a87cf8",
          400: "#8b4ff2",
          500: "#7129e6",
          600: "#5d18c4",
          700: "#4a149b",
          800: "#371472",
          900: "#26104d",
        },
        // Reaction accents.
        feel: "#34f5a0", // Unveil — green (reveal)
        wild: "#ff3b5c", // legacy red (kept for some accents)
        shroud: "#6366f1", // Veil — indigo (re-shroud)
        glow: "#c77dff",
        // Iridescent secondary accent — pairs with violet for the "Smoked Glass"
        // sheen on the living background and focal highlights.
        aqua: {
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
        },
      },
      fontFamily: {
        // Device-native stacks so type renders in each platform's optimal UI
        // font: SF Pro on Apple, Segoe UI on Windows, Roboto on Android. Sharp,
        // familiar, premium — and zero web-font network cost.
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
      boxShadow: {
        // Softer, restrained glow — reserved for focal elements only.
        glow: "0 0 28px -12px rgba(139, 79, 242, 0.45)",
        "glow-feel": "0 0 34px -12px rgba(52, 245, 160, 0.4)",
        "glow-wild": "0 0 34px -12px rgba(255, 59, 92, 0.4)",
        "glow-shroud": "0 0 34px -12px rgba(99, 102, 241, 0.4)",
        card: "0 20px 50px -24px rgba(0, 0, 0, 0.8)",
      },
      backgroundImage: {
        "veil-radial":
          "radial-gradient(circle at 18% 8%, rgba(113,41,230,0.13), transparent 42%), radial-gradient(circle at 88% 92%, rgba(199,125,255,0.09), transparent 48%)",
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
