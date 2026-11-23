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
        // === PRIMARY ORANGE (from logo #D68138) ===
        "primary-container":        "#D68138",   // orange accent (CTA, highlights)
        "primary-fixed":            "#D68138",
        "primary-fixed-dim":        "#B56520",   // darker orange for hover
        "on-primary-fixed":         "#FFFFFF",   // white text on orange
        "on-primary-fixed-variant": "#6B2F00",   // dark orange for subtle text
        "on-primary-container":     "#6B2F00",

        // === NAVY BLUE (from logo #2C2E7F) ===
        "secondary-container":      "#2C2E7F",   // navy blue container
        "secondary":                "#8A8CC8",   // lighter lavender-blue for body text
        "on-secondary":             "#E8E8FF",
        "on-secondary-container":   "#C0C2F0",
        "secondary-fixed":          "#3D3F9A",
        "secondary-fixed-dim":      "#8A8CC8",
        "on-secondary-fixed":       "#0A0A30",
        "on-secondary-fixed-variant":"#2C2E7F",

        // === DARK NAVY BACKGROUNDS ===
        "background":               "#0A0A18",   // very dark navy
        "surface":                  "#0A0A18",
        "surface-dim":              "#0A0A18",
        "surface-container-lowest": "#050510",   // near black navy
        "surface-container-low":    "#10102A",   // dark navy card bg
        "surface-container":        "#171738",   // container bg
        "surface-container-high":   "#1E1E45",   // hover / elevated
        "surface-container-highest":"#282860",   // brightest container
        "surface-bright":           "#252558",   // bright surface
        "surface-variant":          "#282860",
        "surface-tint":             "#D68138",   // orange tint

        // === TEXT / ON COLORS ===
        "primary":                  "#FFFFFF",   // main white text
        "on-primary":               "#0A0A18",
        "on-background":            "#E8E8F8",
        "on-surface":               "#E8E8F8",
        "on-surface-variant":       "#9090B8",   // muted blue-grey text
        "tertiary":                 "#FFFFFF",
        "on-tertiary":              "#0A0A18",
        "tertiary-container":       "#1E1E45",
        "on-tertiary-container":    "#9090B8",
        "tertiary-fixed":           "#3D3F9A",
        "tertiary-fixed-dim":       "#8A8CC8",
        "on-tertiary-fixed":        "#0A0A18",
        "on-tertiary-fixed-variant":"#2C2E7F",

        // === BORDERS & OUTLINES ===
        "outline":                  "#3A3A70",   // subtle navy border
        "outline-variant":          "#25256A",   // faint border

        // === UTILITY ===
        "inverse-surface":          "#E8E8F8",
        "inverse-on-surface":       "#0A0A18",
        "inverse-primary":          "#7A3800",

        // === ERROR (unchanged) ===
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
        "headline-md": ["'Space Grotesk'", "sans-serif"],
        "label-lg": ["'Space Grotesk'", "sans-serif"],
        "display": ["'Space Grotesk'", "sans-serif"],
        "label-md": ["'Space Grotesk'", "sans-serif"],
        "headline-lg-mobile": ["'Space Grotesk'", "sans-serif"],
        "display-mobile": ["'Space Grotesk'", "sans-serif"],
        "headline-sm": ["'Space Grotesk'", "sans-serif"],
        "label-sm": ["'Space Grotesk'", "sans-serif"],
        "headline-lg": ["'Space Grotesk'", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "18px", letterSpacing: "0.08em", fontWeight: "600" }],
        "display": ["56px", { lineHeight: "60px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "34px", letterSpacing: "-0.01em", fontWeight: "700" }],
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
}
