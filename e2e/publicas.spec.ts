import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("páginas sin sesión", () => {
  test("el ingreso carga y no tiene problemas graves de accesibilidad", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "FreteCerto" })).toBeVisible();
    await expect(page.getByLabel("Mail")).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("las rutas privadas mandan al ingreso", async ({ page }) => {
    await page.goto("/operaciones");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("la app es instalable: manifest con íconos", async ({ request }) => {
    const r = await request.get("/manifest.webmanifest");
    expect(r.ok()).toBe(true);
    const m = await r.json();
    expect(m.name).toBe("FreteCerto");
    expect(m.display).toBe("standalone");
    expect(m.icons.length).toBeGreaterThanOrEqual(3);
    expect((await request.get("/icons/icon-192.png")).ok()).toBe(true);
  });

  test("robots y service worker", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    expect(sw.headers()["cache-control"]).toContain("no-cache");
  });

  test("la página sin conexión se ve sin iniciar sesión", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  });

  test("un link de seguimiento inventado da 404", async ({ page }) => {
    const r = await page.goto("/seguimiento/00000000-0000-4000-8000-000000000000");
    expect(r?.status()).toBe(404);
  });
});
