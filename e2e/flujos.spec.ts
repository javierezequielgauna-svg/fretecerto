import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const EMAIL = process.env.E2E_EMAIL;
const CLAVE = process.env.E2E_PASSWORD;
test.skip(!EMAIL || !CLAVE, "Definí E2E_EMAIL y E2E_PASSWORD (cuenta de dueño de un proyecto de PRUEBA)");

const unico = () => `E2E ${Date.now().toString(36)}`;
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });

async function ingresar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Mail").fill(EMAIL!);
  await page.getByLabel("Contraseña").fill(CLAVE!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/operaciones/);
}

/** Crea una operación por la pantalla y devuelve el cliente y la patente usados. */
async function crearOperacion(page: Page) {
  const cliente = unico();
  const patente = `E2E${Math.floor(Math.random() * 900 + 100)}`;
  await page.goto("/operaciones/nueva");
  await page.getByLabel("O escribí uno nuevo").fill(cliente);
  await page.getByLabel("Origen").fill("Córdoba");
  await page.getByLabel("Destino").fill("Villa María");
  await page.getByLabel(/Distancia en km/).fill("145");
  await page.getByLabel("O una patente nueva").fill(patente);
  await page.getByLabel(/Importe a cobrar/).fill("400000");
  await page.getByLabel(/Costo estimado/).fill("250000");
  await page.getByRole("button", { name: "Crear operación" }).click();
  await expect(page).toHaveURL(/\/operaciones\/[0-9a-f-]{36}$/);
  return { cliente, patente };
}

test.describe("flujos principales", () => {
  test.beforeEach(async ({ page }) => ingresar(page));

  test("cotizar, guardar y convertir en operación", async ({ page }) => {
    await page.goto("/cotizaciones/nueva");
    await page.getByLabel("O escribí uno nuevo").fill(unico());
    await page.getByLabel("Origen").fill("Córdoba");
    await page.getByLabel("Destino").fill("Villa María");
    await page.getByLabel(/Distancia, un sentido/).fill("145");
    await page.getByLabel(/^Gasoil/).fill("1450");
    await page.getByLabel(/^Consumo/).fill("35");
    await expect(page.getByText("Precio sugerido (sin IVA)")).toBeVisible();
    await expect(page.getByText(/Margen real .* Cumple tu objetivo/)).toBeVisible();
    await page.getByRole("button", { name: "Guardar como borrador" }).click();
    await expect(page.getByText(/Cotización COT-\d+ guardada/)).toBeVisible();

    await page.goto("/cotizaciones");
    await page.getByRole("button", { name: "Aceptada: crear operación" }).first().click();
    await expect(page).toHaveURL(/\/operaciones\/[0-9a-f-]{36}$/);
  });

  test("llevar una operación hasta el cobro y verla en cobranza", async ({ page }) => {
    const { cliente } = await crearOperacion(page);
    for (const [boton, estado] of [["Empezar a cargar", "En carga"], ["Salir a ruta", "En tránsito"], ["Marcar entregada", "Entregada"], ["Marcar facturada", "Facturada"], ["Registrar cobro", "Cobrada"]]) {
      await page.getByRole("button", { name: boton }).click();
      await expect(page.getByText(estado, { exact: true }).first()).toBeVisible();
    }
    await page.goto("/cobranza");
    await expect(page.getByText(cliente)).toBeVisible();
  });

  test("emitir un remito y guardar el PDF", async ({ page }) => {
    await crearOperacion(page);
    await page.getByRole("link", { name: "Hacer remito (PDF)" }).click();
    await page.getByLabel("Ítem 1").fill("Cajas de alimentos secos");
    await page.getByRole("button", { name: "Emitir remito y guardar PDF" }).click();
    await expect(page.getByText(/Remito .* emitido y guardado/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver PDF" }).first()).toBeVisible();
  });

  test("cargar un vencimiento y ver la alerta", async ({ page }) => {
    const { patente } = await crearOperacion(page);
    await page.goto("/alertas/controles");
    await page.getByLabel("De quién").selectOption({ label: patente });
    await page.getByLabel("Vence el").first().fill(enDias(3));
    await page.getByRole("button", { name: "Agregar vencimiento" }).click();
    await expect(page.getByText(/Guardado/)).toBeVisible();
    await page.goto("/alertas");
    await expect(page.getByText(new RegExp(`${patente}.*vence en 3 días`))).toBeVisible();
  });

  test("las pantallas principales no tienen problemas graves de accesibilidad", async ({ page }) => {
    for (const ruta of ["/operaciones", "/cotizaciones", "/cobranza", "/alertas", "/configuracion"]) {
      await page.goto(ruta);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical"), ruta).toEqual([]);
    }
  });
});
