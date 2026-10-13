# FreteCerto · Fase 1 (base, auth y datos)

Next.js 15 (App Router) + TypeScript + Tailwind + Supabase. Incluye login, alta de empresa, repositorios,
cálculos de precio/margen/equilibrio/peso volumétrico (con tests) y la pantalla de operaciones en modo lectura.

## Puesta en marcha
1. Creá un proyecto en Supabase y, en el SQL Editor, corré en orden:
   `supabase/migrations/0001_schema.sql` y `supabase/migrations/0002_onboarding.sql`.
2. Copiá `.env.example` a `.env.local` y completá la URL y la clave anon.
3. `npm install` y `npm run dev` → http://localhost:3000
4. Creá tu cuenta en /login; vas a pasar por /onboarding para crear la empresa (quedás como dueño).
5. `npm test` corre los tests de cálculo y formato; `npm run typecheck` revisa los tipos.

## Deploy en Vercel
Importá el repo y cargá las dos variables de entorno. Sin más configuración.

## Decisiones
- **Repositorios** (`lib/repos`): la UI no conoce Supabase; los datos se validan con Zod.
- **Cálculos puros** (`lib/calc`): sin red ni base, por eso se testean rápido. Los mismos que usan los prototipos.
- **Seguridad en la base**: RLS por empresa y roles; el middleware solo mejora la experiencia, no es la barrera.
- **Estados con ícono y texto**, tablas que en el celular son tarjetas y objetivos táctiles de 44 px o más.

## Pendiente (próximas fases)
shadcn/ui (`npx shadcn@latest init` cuando haga falta), tipos generados (`supabase gen types typescript`),
tabla con filtros y orden, cotizador, remitos, alertas, modo chofer y PWA.

## A validar con tu contador
Alícuota de Ingresos Brutos, facturación y remito electrónico por ARCA, Carta de Porte.

## Fase 2 (cobranza y operaciones)
- `/operaciones`: indicadores de plata, búsqueda, filtros por estado, orden, paginación (10 por página) y avance de estado. Los filtros viven en la URL.
- `/operaciones/nueva`: alta de operación (cliente, ruta, chofer y unidad existentes o nuevos). El número sale de `siguiente_numero()`.
- `/operaciones/[id]`: detalle, historial, foto del remito firmado (se comprime en el celular) y botón de próximo paso.
- `/cobranza`: por cliente, cuánto te deben, cuánto falta facturar, días promedio de cobro y puntaje.
- Facturar sin remito firmado no se bloquea: se avisa. Si querés bloquearlo, agregá la regla en `operaciones_guard()`.
- Para probar subida de fotos: el bucket `remitos` lo crea `0001_schema.sql`.

## Fase 3 (cotizador, Google Maps y remitos)
- `/configuracion` (Ajustes): CUIT, domicilio y punto de venta, margen objetivo, gasoil, viático, Ingresos Brutos, y costos por unidad y por chofer.
  **Cargalo primero**: el cotizador toma de acá los valores.
- `/cotizaciones/nueva`: cotizador por viaje, por kilo o por paquete, con peso volumétrico, tarifa mínima, ocupación, costo de volver vacío, tarifa de prueba,
  vigencia y envío por WhatsApp. Los números se recalculan en el servidor con la misma función pura (`lib/calc/cotizacion.ts`).
- `/cotizaciones`: estado visible (enviada, sin respuesta a los 3 y 7 días, vencida), seguimiento por WhatsApp y "Aceptada: crear operación".
- **Google Maps**: poné `GOOGLE_MAPS_API_KEY` (solo servidor) y activá Places API (New) y Routes API. Los km se guardan en `rutas` para no pagar dos veces.
  Sin clave, todo anda: los km se cargan a mano. El límite de pedidos es en memoria; para producción usá Upstash o similar.
- `/operaciones/[id]/remito`: emite el remito X en PDF (jsPDF en el servidor), lo guarda en Storage con número correlativo y lo registra. En el celular se comparte con el menú del sistema.
- Remito electrónico de ARCA y Carta de Porte: siguen fuera. Validalos con tu contador antes de usar esto como comprobante legal.

## Fase 4 (alertas reales)
- Corré también `supabase/migrations/0003_alertas.sql` (suma el mensaje de WhatsApp a las alertas y el odómetro automático).
- **Reglas** (`lib/alertas.ts`, funciones puras con tests): vencimientos (avisa a los 30, 7 y 1 días y al vencer), cotizaciones sin respuesta (3 y 7 días) o vencidas,
  demoras de carga (más de 2 h es urgente), entregas sin facturar (2 y 5 días; si falta el remito firmado, el aviso va al chofer), facturas vencidas y service por km (a 1.000 km y al pasarse).
  Cada alerta avisa una vez por umbral y se cierra sola cuando deja de aplicar (renovaste, facturaste, etc.).
- **Tarea programada**: `vercel.json` llama a `/api/cron/alertas` todos los días a las 11:00 UTC (8:00 en Argentina). Definí `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` y, para los mails, `RESEND_API_KEY` y `RESEND_FROM`.
  En el plan gratis de Vercel solo se permite una corrida diaria; para más frecuencia hace falta el plan Pro.
- **Mail**: resumen con las alertas nuevas al dueño y a los despachantes (Resend).
- **WhatsApp**: cada alerta trae el botón con el mensaje armado para el chofer o el cliente que corresponda. El envío automático requiere WhatsApp Business API (cuenta aprobada y plantillas de Meta): no está incluido.
- `/alertas` (con cantidad de urgentes en el menú) y `/alertas/controles` (vencimientos y service). El botón "Actualizar ahora" corre las reglas al instante, sin mail.

## Fase 5 (seguimiento público y modo chofer)
- Corré `supabase/migrations/0004_fase5.sql` (nueva versión de `seguimiento_publico` y de la vista del chofer).
- **Link "seguí tu carga"** (`/seguimiento/[token]`, sin login): estado en pasos, hora estimada de llegada y última actualización, que se refresca sola cada minuto.
  Solo muestra empresa, número, ruta y estado: nunca precios, cliente, chofer ni patente. Facturada y cobrada se muestran como "entregada".
  El link está en el detalle de cada operación, con copiar y envío por WhatsApp. Es privado por ser un código largo y al azar; quien lo tenga puede verlo.
- **Modo chofer** (`/chofer`): el chofer ve solo sus viajes (sin importes ni costos, lo garantiza la vista de la base), toca Cargué → Salí → Entregué (pide confirmación) y sube la foto del remito firmado.
- **Acceso de choferes**: en Ajustes, el dueño ingresa el mail del chofer; se crea la cuenta con una clave temporal que se muestra una sola vez (hace falta `SUPABASE_SERVICE_ROLE_KEY`). El chofer puede cambiarla en "Mi clave".
- Pendiente: sin señal no funciona (se agrega con la PWA y una cola sin conexión en la Fase 6), quitar el acceso a un chofer, y guardar la ubicación en cada paso.

## Fase 6 (rentabilidad, PWA y calidad)
- Corré `supabase/migrations/0005_rentabilidad.sql`.
- **`/rentabilidad`**: margen por ruta, cliente, chofer o unidad en los últimos 30 días, 90 días o todo el historial, con costo por km, % de km vacíos y % de entregas a horario.
  Marca qué conviene mantener, revisar o rechazar (`lib/rentabilidad.ts`). Rechazar solo se sugiere con pérdida sostenida en 3 viajes o más; con menos, avisa que son pocos datos.
  Los costos son los estimados salvo que cargues el **costo real** en el detalle de la operación (nuevo): conviene hacerlo al cerrar cada viaje.
- **App instalable (PWA)**: manifest, íconos (incluido maskable), `sw.js`, página sin conexión y botón "Instalar" en Ajustes y en el modo chofer. En iPhone se explica el paso a mano.
- **Modo chofer sin señal**: Cargué / Salí / Entregué y la foto del remito se guardan en el celular (IndexedDB) y se mandan solos, en orden, al volver la conexión.
  Con señal, el chofer abre cada viaje una vez para que quede disponible sin conexión (se hace solo al entrar a "Mis viajes"). Si quedan pasos sin enviar, avisa antes de cerrar sesión.
- **Qué guarda el service worker**: archivos estáticos y las pantallas del chofer. Nunca el panel de gestión, `/api` ni los pedidos a Supabase. Al cerrar sesión se borran las pantallas guardadas.
- **Calidad**: `npm test` (lógica pura), `npm run e2e` (Playwright: cotizar, operación hasta el cobro, remito, alerta y accesibilidad con axe; necesita un Supabase de PRUEBA y `E2E_EMAIL`/`E2E_PASSWORD`),
  `npm run lighthouse` (LHCI sobre `/login` y `/offline`, exige ≥ 90 en las 4 categorías).
  Cabeceras de seguridad en `next.config.mjs`; `robots.txt` deja visible solo el ingreso.
- Límites: sin señal no se pueden crear operaciones ni cotizaciones (solo los pasos y fotos del chofer), y el service worker no sincroniza en segundo plano con la app cerrada.
