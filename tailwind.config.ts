import type { Config } from "tailwindcss";

// Los colores salen de variables CSS (app/globals.css): el modo oscuro cambia solo las variables.
// La función permite usar transparencias (bg-ok/15) con colores que son variables CSS.
const c =
  (variable: string) =>
  ({ opacityValue }: { opacityValue?: string | number }) =>
    opacityValue === undefined
      ? `var(${variable})`
      : `color-mix(in srgb, var(${variable}) ${Number(opacityValue) * 100}%, transparent)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("--bg"),
        surface: c("--surface"),
        ink: c("--ink"),
        muted: c("--muted"),
        line: c("--line"),
        brand: c("--brand"),
        "brand-ink": c("--brand-ink"),
        ok: c("--ok"),
        warn: c("--warn"),
        bad: c("--bad"),
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
