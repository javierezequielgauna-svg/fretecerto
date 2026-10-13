/**
 * Google Maps Platform (Places API (New) y Routes API). SOLO SE USA DESDE EL SERVIDOR:
 * la clave no lleva NEXT_PUBLIC_ y nunca llega al navegador.
 */
const KEY = process.env.GOOGLE_MAPS_API_KEY;
export const googleConfigurado = (): boolean => !!KEY;

// Rectángulo que cubre la ciudad de Córdoba y el Gran Córdoba
const GRAN_CORDOBA = { low: { latitude: -31.75, longitude: -64.6 }, high: { latitude: -30.95, longitude: -63.9 } };

const conPais = (t: string) => (/argentina/i.test(t) ? t : `${t}, Argentina`);

export async function autocompletar(input: string): Promise<{ id: string; texto: string }[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({ input, languageCode: "es-AR", regionCode: "AR", locationRestriction: { rectangle: GRAN_CORDOBA } }),
  });
  if (!res.ok) throw new Error(`Places respondió ${res.status}`);
  const j = (await res.json()) as { suggestions?: { placePrediction: { placeId: string; text: { text: string } } }[] };
  return (j.suggestions ?? []).map((s) => ({ id: s.placePrediction.placeId, texto: s.placePrediction.text.text }));
}

export async function calcularRuta(origen: string, destino: string): Promise<{ km: number; minutos: number } | null> {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
    body: JSON.stringify({
      origin: { address: conPais(origen) },
      destination: { address: conPais(destino) },
      travelMode: "DRIVE",
      languageCode: "es-AR",
      regionCode: "AR",
    }),
  });
  if (!res.ok) throw new Error(`Routes respondió ${res.status}`);
  const r = ((await res.json()) as { routes?: { distanceMeters: number; duration: string }[] }).routes?.[0];
  if (!r) return null;
  return { km: Math.round(r.distanceMeters / 100) / 10, minutos: Math.round(parseInt(r.duration, 10) / 60) };
}
