import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 50: "#f0f7f2", 100: "#dcece1", 200: "#bbd9c6", 300: "#8ebea1", 400: "#5e9d78", 500: "#3e805b", 600: "#2d6647", 700: "#24523a", 800: "#1e4230", 900: "#193628", 950: "#0c1e16" },
        emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b" },
        sage: { 50: "#f6f8f4", 100: "#eaefe5", 200: "#d5dfcc", 300: "#b6c7a8", 400: "#93aa80", 500: "#748d61", 600: "#5a704b" },
        charcoal: { 50: "#f7f7f8", 100: "#eeeef0", 200: "#d9dadf", 300: "#b8bac3", 400: "#8f929f", 500: "#6f7282", 600: "#585b69", 700: "#474955", 800: "#3d3f48", 900: "#26272e", 950: "#18181c" },
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px -4px rgba(16,24,40,.08)",
        glow: "0 0 0 1px rgba(16,185,129,.15), 0 12px 40px -12px rgba(16,185,129,.35)",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
      },
      animation: { fadeUp: "fadeUp .5s ease-out both", shimmer: "shimmer 1.6s linear infinite", pulseDot: "pulseDot 1.6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
