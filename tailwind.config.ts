import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        canvas: "#FAFAF7",
        surface: "#FFFFFF",
        elevated: "#F5F5F2",
        ink: {
          DEFAULT: "#0F1011",
          soft: "#1F2024",
          mute: "#6B7280",
          faint: "#9CA3AF",
        },
        line: {
          DEFAULT: "#E5E5E0",
          strong: "#D4D4CE",
          soft: "#EFEFEB",
        },
        brand: {
          DEFAULT: "#7C2424",
          deep: "#5E1B1B",
          soft: "#A04545",
          wash: "#7C24240D",
          tint: "#7C242414",
        },
        success: {
          DEFAULT: "#15803D",
          wash: "#15803D14",
        },
        warn: {
          DEFAULT: "#A16207",
          wash: "#A1620714",
        },
        firm: {
          blue: "#1F4E79",
          green: "#2E7D32",
          red: "#C62828",
          accentBlue: "#1565C0",
          ink: "#0F172A",
          muted: "#64748B",
        },
      },
      borderRadius: {
        lg: "6px",
        md: "4px",
        sm: "3px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.025em",
        widest2: "0.08em",
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(15, 16, 17, 0.04), 0 0 0 1px rgba(15, 16, 17, 0.06)",
        elev: "0 1px 2px 0 rgba(15, 16, 17, 0.04), 0 0 0 1px rgba(15, 16, 17, 0.08)",
        focus: "0 0 0 3px rgba(124, 36, 36, 0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.32s cubic-bezier(0.2, 0.6, 0.2, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;