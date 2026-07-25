/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core surface palette — "Smoked Glass" on neutral graphite. A true mid
        // dark-gray base (no hue bias) so each page's accent reads as a hint of
        // color over calm glass rather than the base fighting the accent.
        ink: {
          950: "#191c22",
          900: "#20242c",
          800: "#2a2f39",
          700: "#353b47",
          600: "#424956",
        },
        // Brand accent — DYNAMIC. Every veil-* utility resolves to the current
        // page's accent via the --accent-rgb CSS variable (set per route in
        // App.tsx from the page's taskbar-icon color). The ramp collapses to a
        // single hue; lightness is expressed through the utility's alpha.
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
        // Reaction / semantic accents (fixed — they convey meaning, not theme).
        feel: "#34f5a0",
        wild: "#ff3b5c",
        shroud: "rgb(var(--accent-rgb) / <alpha-value>)",
        glow: "#a87cf8",
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
        // Instrument pair — elegant display serif + crisp UI sans (no Inter/Roboto).
        display: [
          '"Instrument Serif"',
          "Georgia",
          '"Times New Roman"',
          "serif",
        ],
        body: [
          '"Instrument Sans"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.015em",
      },
      // Bare `border` (no color class) falls back to the frosted glass hairline
      // instead of currentColor — keeps stray borders on-theme automatically.
      borderColor: {
        DEFAULT: "var(--hairline)",
      },
      boxShadow: {
        // Restrained accent glow — follows the per-page accent.
        glow: "0 0 28px -12px rgb(var(--accent-rgb) / 0.5)",
        "glow-feel": "0 0 34px -12px rgba(52, 245, 160, 0.4)",
        "glow-wild": "0 0 34px -12px rgba(255, 59, 92, 0.4)",
        "glow-shroud": "0 0 34px -12px rgb(var(--accent-rgb) / 0.45)",
        card: "0 20px 50px -24px rgba(0, 0, 0, 0.8)",
        // Glass button depth — a crisp top highlight + a soft accent halo so
        // primary actions glow their page color rather than read as a solid fill.
        "btn-primary":
          "inset 0 1px 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.22), 0 10px 26px -16px rgb(var(--accent-rgb) / 0.6)",
        "btn-solid":
          "inset 0 1px 0 0 rgba(255,255,255,0.10), inset 0 -1px 0 0 rgba(0,0,0,0.30), 0 8px 18px -12px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        "veil-radial":
          "radial-gradient(circle at 18% 8%, rgb(var(--accent-rgb) / 0.10), transparent 42%), radial-gradient(circle at 88% 92%, rgb(var(--accent-rgb) / 0.07), transparent 48%)",
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
