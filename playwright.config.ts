import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta. Necesitan la app corriendo contra un proyecto de Supabase DE PRUEBA
 * (nunca el de producción) con las migraciones aplicadas.
 *   E2E_URL        app ya desplegada (si no, se levanta con `npm run build && npm run start`)
 *   E2E_EMAIL / E2E_PASSWORD   cuenta de un dueño de prueba que ya creó su empresa
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: process.env.E2E_URL ?? "http://localhost:3000", trace: "on-first-retry", locale: "es-AR", timezoneId: "America/Argentina/Cordoba" },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_URL ? undefined : { command: "npm run build && npm run start", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 240_000 },
});
