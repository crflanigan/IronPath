import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

export default {
  /*
   * `hover:` styles apply only on devices that can actually hover, i.e. a
   * mouse or trackpad. Phones skip them.
   *
   * On an iPhone, a finger sliding across buttons sets `:hover` on whatever is
   * under it. In a dialog the highlight also trails ahead of the finger, so a
   * swipe up the template picker lit up one row after another, plus the gears.
   * Every `hover:` in the app is decoration that a phone has no use for: none
   * reveals a control. Pressed states (`active:`) are left alone.
   */
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        /*
         * v2 neutrals. Every screen was written against Tailwind's `gray`
         * (`bg-white dark:bg-gray-800`, `text-gray-600`, ...), so redefining
         * the scale re-tints the whole app at once: a cool ink ramp whose
         * dark end is near-black with a blue cast, in place of the flat
         * mid-greys that made dark mode look like a wireframe.
         */
        gray: {
          50: "#f5f7f9",
          100: "#edf0f3",
          200: "#e0e5ea",
          300: "#c9d1d9",
          400: "#94a0ad",
          500: "#687583",
          600: "#4a5562",
          700: "#252e39",
          800: "#131920",
          900: "#090d12",
          950: "#05070a",
        },
        green: colors.emerald,
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary-hsl) / <alpha-value>)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        sheen: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      boxShadow: {
        card: "0 1px 2px rgb(9 13 18 / 0.04), 0 10px 28px -16px rgb(9 13 18 / 0.18)",
        glow: "0 8px 24px -8px color-mix(in srgb, var(--primary) 65%, transparent)",
        float: "0 12px 40px -12px rgb(9 13 18 / 0.35)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "rise-in": "rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        sheen: "sheen 2.4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
