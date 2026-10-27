// TEMPORAL: prueba qué sitios responden desde Vercel
export const maxDuration = 60;
export const preferredRegion = "gru1";
export async function GET() {
  const urls = ["https://apps.loteriasantafe.gov.ar:8443/Extractos/paginas/mostrarQuini6.xhtml?display=0", "https://www.loteriasantafe.gov.ar/quini-6-2/", "https://www.quini-6-resultados.com.ar/", "https://jasper2.loteriasantafe.gov.ar/visualizaExtracto.php?param_ID_sor=4003420", "https://loteria.gba.gob.ar/resultados"];
  const out = await Promise.all(urls.map(async (u) => { const t = Date.now(); try { const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(12000) }); return `${u.slice(8, 60)} → ${r.status} ${(await r.text()).length}B ${Date.now() - t}ms`; } catch (e) { const x = e as { message?: string; cause?: { code?: string } }; return `${u.slice(8, 60)} → ERROR ${x.cause?.code ?? x.message} ${Date.now() - t}ms`; } }));
  return Response.json(out);
}
