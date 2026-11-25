/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === OFFICIAL MAN & MACHINE BRAND RED ===
        "primary-container":        "#EB3E2E",
        "primary-fixed":            "#EB3E2E",
        "primary-fixed-dim":        "#FF493B",
        "on-primary-fixed":         "#F5F5F5",
        "on-primary-fixed-variant": "#7F1D1D",
        "on-primary-container":     "#F5F5F5",

        // === NEUTRAL CHARCOAL SECONDARY ===
        "secondary-container":      "#202020",
        "secondary":                "#B8B8B8",
        "on-secondary":             "#F5F5F5",
        "on-secondary-container":   "#B8B8B8",
        "secondary-fixed":          "#181818",
        "secondary-fixed-dim":      "#858585",
        "on-secondary-fixed":       "#090909",
        "on-secondary-fixed-variant":"#252525",

        // === OFFICIAL OBSIDIAN & CHARCOAL BACKGROUNDS ===
        "background":               "#090909",
        "surface":                  "#090909",
        "surface-dim":              "#090909",
        "surface-container-lowest": "#090909",
        "surface-container-low":    "#111111",
        "surface-container":        "#181818",
        "surface-container-high":   "#202020",
        "surface-container-highest":"#252525",
        "surface-bright":           "#202020",
        "surface-variant":          "#202020",
        "surface-tint":             "#EB3E2E",

        // === TEXT / ON COLORS ===
        "primary":                  "#F5F5F5",
        "on-primary":               "#090909",
        "on-background":            "#F5F5F5",
        "on-surface":               "#F5F5F5",
        "on-surface-variant":       "#B8B8B8",
        "tertiary":                 "#F5F5F5",
        "on-tertiary":              "#090909",
        "tertiary-container":       "#202020",
        "on-tertiary-container":    "#858585",
        "tertiary-fixed":           "#181818",
        "tertiary-fixed-dim":       "#858585",
        "on-tertiary-fixed":        "#090909",
        "on-tertiary-fixed-variant":"#303030",

        // === BORDERS & OUTLINES ===
        "outline":                  "#303030",
        "outline-variant":          "#252525",

        // === UTILITY ===
        "inverse-surface":          "#F5F5F5",
        "inverse-on-surface":       "#090909",
        "inverse-primary":          "#EB3E2E",

        // === ERROR ===
        "error":                    "#ffb4ab",
        "on-error":                 "#690005",
        "error-container":          "#93000a",
        "on-error-container":       "#ffdad6",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      spacing: {
        "space-xl": "2.5rem",
        "space-lg": "1.5rem",
        "margin": "1rem",
        "space-xs": "0.25rem",
        "margin-desktop": "4rem",
        "gutter-desktop": "1.5rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "margin-tablet": "2rem",
        "gutter": "1rem"
      },
      fontFamily: {
        "body-lg": ["Inter", "sans-serif"],
        "headline-md": ["'Oswald'", "sans-serif"],
        "label-lg": ["Inter", "sans-serif"],
        "display": ["'Oswald'", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["'Oswald'", "sans-serif"],
        "display-mobile": ["'Oswald'", "sans-serif"],
        "headline-sm": ["'Oswald'", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-lg": ["'Oswald'", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "18px", letterSpacing: "0.08em", fontWeight: "600" }],
        "display": ["56px", { lineHeight: "60px", letterSpacing: "-0.025em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "34px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-mobile": ["38px", { lineHeight: "42px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "26px", letterSpacing: "0em", fontWeight: "600" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.12em", fontWeight: "700" }],
        "headline-lg": ["36px", { lineHeight: "42px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-md": ["15px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "400" }]
      }
    },
  },
  plugins: [],
};
