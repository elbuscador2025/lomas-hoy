// Busca coordenadas (OpenStreetMap, gratis) SOLO para ordenar por cercanía. Si no encuentra, devuelve null.
// "Cómo llegar" usa el texto de la dirección, no estas coordenadas.
const CAJA = { latMin: -34.86, latMax: -34.68, lngMin: -58.52, lngMax: -58.3 }; // alrededor del partido

export async function geocodificar(direccion, localidad) {
  if (!direccion) return null;
  const limpia = direccion.replace(/\b(e\/|esq\.?)\s.*$/i, "").replace(/(\d)\.(\d{3})/g, "$1$2").trim();
  const intentos = [
    `${direccion}, ${localidad}, Lomas de Zamora, Buenos Aires, Argentina`,
    `${limpia}, ${localidad}, Buenos Aires, Argentina`,
    `${limpia}, Lomas de Zamora, Buenos Aires, Argentina`,
  ];
  for (const q of intentos) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": "LomasHoy/1.0 (ramonantoniog745@gmail.com)" },
        signal: AbortSignal.timeout(15000),
      });
      const [p] = r.ok ? await r.json() : [];
      const lat = Number(p?.lat), lng = Number(p?.lon);
      if (p && lat > CAJA.latMin && lat < CAJA.latMax && lng > CAJA.lngMin && lng < CAJA.lngMax) return { lat, lng };
    } catch {}
    await new Promise((r) => setTimeout(r, 1100)); // regla de uso: 1 pedido por segundo
  }
  return null;
}
