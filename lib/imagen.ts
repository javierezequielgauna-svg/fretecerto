/** Mantiene la proporción y no agranda: la foto del celular (4000 px) baja a ~1600 px. */
export function dimensionesEscaladas(ancho: number, alto: number, maxLado = 1600): { ancho: number; alto: number } {
  const escala = Math.min(1, maxLado / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** Reduce y comprime a JPEG en el navegador: una foto de remito pasa de ~5 MB a ~300 KB. */
export async function comprimirImagen(file: File, maxLado = 1600, calidad = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file); // respeta la orientación EXIF en navegadores modernos
  const { ancho, alto } = dimensionesEscaladas(bmp.width, bmp.height, maxLado);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, ancho, alto);
  bmp.close();
  return new Promise((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la imagen"))), "image/jpeg", calidad),
  );
}
