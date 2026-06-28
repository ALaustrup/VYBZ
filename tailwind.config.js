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
        // Brand accent — refined to a professional indigo (was vivid purple).
        // Reads elegant and corporate-clean for buttons/accents while staying in
        // the brand's violet-adjacent family.
        veil: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
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
        // Industrial neutral — brushed-steel tones for solid buttons, hairlines,
        // and the "edgy/industrial" chrome that frames the violet brand glow.
        steel: {
          100: "#e8ebf2",
          200: "#c6ccda",
          300: "#9aa3b8",
          400: "#6c7488",
          500: "#4a5163",
          600: "#343a49",
          700: "#262b36",
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
        glow: "0 0 28px -12px rgba(99, 102, 241, 0.5)",
        "glow-feel": "0 0 34px -12px rgba(52, 245, 160, 0.4)",
        "glow-wild": "0 0 34px -12px rgba(255, 59, 92, 0.4)",
        "glow-shroud": "0 0 34px -12px rgba(99, 102, 241, 0.4)",
        card: "0 20px 50px -24px rgba(0, 0, 0, 0.8)",
        // Solid, tactile button depth — a crisp top highlight + grounded drop so
        // primary actions read as physical, pressable hardware (industrial feel).
        "btn-primary":
          "inset 0 1px 0 0 rgba(255,255,255,0.22), inset 0 -1px 0 0 rgba(0,0,0,0.28), 0 10px 22px -12px rgba(67,56,202,0.85)",
        "btn-solid":
          "inset 0 1px 0 0 rgba(255,255,255,0.10), inset 0 -1px 0 0 rgba(0,0,0,0.35), 0 8px 18px -12px rgba(0,0,0,0.9)",
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
