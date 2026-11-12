// Control semanal de enlaces: una vez por semana (lo dispara el mismo despertador que actualiza los datos) se revisa que las páginas oficiales que usa la app sigan funcionando.
// Si un enlace falla dos semanas seguidas, me llega un aviso al celular con la sección y el enlace roto. En mi panel se ve el resultado del último control.
import { redis } from "@/lib/servidor";
import { notificarAdmin } from "@/lib/push";

export type Enlace = { seccion: string; url: string };
// Si se agrega a la app un enlace oficial nuevo, sumarlo acá. (No van: mapas de Google, WhatsApp, redes para compartir ni la API de cortes programados de Edesur, que se sabe que anda mal y la app ya lo avisa.)
export const ENLACES: Enlace[] = [
  { seccion: "Telemedicina", url: "https://telemedicina.lomasdezamora.gov.ar/registro" },
  { seccion: "Telemedicina", url: "https://telemedicina.lomasdezamora.gov.ar/login" },
  { seccion: "Telemedicina", url: "https://lomasdezamora.gov.ar/iframe/telemedicina.aspx" },
  { seccion: "Trámites municipales (Comunidad Lomas)", url: "https://comunidad.lomasdezamora.gov.ar/" },
  { seccion: "Trámites municipales (Comunidad Lomas)", url: "https://comunidad.lomasdezamora.gov.ar/registro" },
  { seccion: "Portal Empleo", url: "https://portalempleo.gob.ar/portada" },
  { seccion: "Castración", url: "https://lomasdezamora.gov.ar/hospital-animales" },
  { seccion: "Castración", url: "https://www.instagram.com/hospitaldeanimaleslomas" },
  { seccion: "Castración", url: "https://www.instagram.com/saludlomas" },
  { seccion: "COOP", url: "https://formularios.lomasdezamora.gov.ar/CentrosDeGestionDelMunicipio.aspx" },
  { seccion: "ANSES", url: "https://www.anses.gob.ar/turnos" },
  { seccion: "ANSES", url: "https://www.anses.gob.ar/oficinas-atencion-al-publico" },
  { seccion: "Luz", url: "https://www.enre.gov.ar/mapaCortes/datos/Datos_PaginaWeb.js" },
  { seccion: "Luz", url: "https://www.argentina.gob.ar/enre/estado-del-servicio-electrico-de-edesur" },
  { seccion: "Luz", url: "https://www.edesur.com.ar/servicios-al-cliente/cortes-programados/" },
  { seccion: "Agua", url: "https://cortes.web.aysa.com.ar/" },
  { seccion: "Agua", url: "https://aysa.com.ar/usuarios/canales_atencion" },
  { seccion: "Tren", url: "https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades" },
  { seccion: "Clima y alertas", url: "https://www.smn.gob.ar/alertas" },
  { seccion: "Clima y alertas", url: "https://ssl.smn.gob.ar/CAP/AR.php" },
  { seccion: "Clima y alertas", url: "https://open-meteo.com/" },
  { seccion: "Quiniela y Quini 6", url: "https://loteria.gba.gob.ar/resultados" },
  { seccion: "Quiniela y Quini 6", url: "https://quiniela.loteriadelaciudad.gob.ar/" },
  { seccion: "Quiniela y Quini 6", url: "https://www.lanacion.com.ar/loterias/quini-6/" },
  { seccion: "Noticias y Agenda", url: "https://www.lomasconectado.com/feed" },
  { seccion: "Noticias y Agenda", url: "https://www.diariolomas.com.ar/feed" },
  { seccion: "Guardias y salitas", url: "https://www.gba.gob.ar/saludprovincia/hospitales" },
  { seccion: "Guardias y salitas", url: "https://lomasdezamora.gov.ar/pdf/eje-salud/Listado-de-Hospitales-2024.pdf" },
  { seccion: "Guardias y salitas", url: "https://www.ms.gba.gov.ar/sitios/programaredes/wp-content/uploads/sites/236/2023/12/LOMAS-DE-ZAMORA-Guia-de-Servicios-de-Salud_actualizado-a-abril-2022.pdf" },
  { seccion: "Auto y trámites", url: "https://www.arba.gov.ar/Aplicaciones/AvisoDeudas.asp" },
  { seccion: "Auto y trámites", url: "https://sag.lomasdezamora.gov.ar/" },
  { seccion: "Auto y trámites", url: "https://lomasdezamora.eregulations.org/procedure/362?l=es" },
  { seccion: "Auto y trámites", url: "https://infraccionesba.gba.gob.ar/consulta-infraccion" },
  { seccion: "Auto y trámites", url: "https://webextra.lomasdezamora.gov.ar/infracciones/ConsultaFaltasNuevoMP.aspx" },
  { seccion: "Auto y trámites", url: "https://consultainfracciones.seguridadvial.gob.ar/" },
  { seccion: "Auto y trámites", url: "https://lomasdezamora.eregulations.org/procedure/32?l=es" },
  { seccion: "Auto y trámites", url: "https://lomasdezamora.eregulations.org/procedure/168?l=es" },
  { seccion: "Auto y trámites", url: "https://lomasdezamora.gov.ar/tramites/licencias-de-conducir" },
  { seccion: "Auto y trámites", url: "https://curso.seguridadvial.gob.ar/ansv/" },
  { seccion: "Auto y trámites", url: "https://vtv.gba.gob.ar/" },
  { seccion: "Auto y trámites", url: "https://portal.vtv.gba.gob.ar/cpanel/signin" },
  { seccion: "Auto y trámites", url: "https://vtv.gba.gob.ar/plantas" },
  { seccion: "Auto y trámites", url: "https://vtv.gba.gob.ar/costos" },
  { seccion: "Auto y trámites", url: "https://www.dnrpa.gov.ar/portal_dnrpa/seccionales2.php?registro=true" },
  { seccion: "Auto y trámites", url: "https://www2.jus.gov.ar/site" },
  { seccion: "Auto y trámites", url: "https://www.argentina.gob.ar/propiedadautomotor" },
  { seccion: "Auto y trámites", url: "https://www.dnrpa.gov.ar/portal_dnrpa/informacion/requisitos.php" },
  { seccion: "Auto y trámites", url: "https://www.dnrpa.gov.ar/portal_dnrpa/aranceles2.php" },
  { seccion: "Auto y trámites", url: "https://lomasdezamora.gov.ar/tramites/automotores-y-transito" },
  { seccion: "Jubilados", url: "https://www.pami.org.ar/talleresycursos/inicio" },
  { seccion: "Jubilados", url: "https://www.pami.org.ar/talleresycursos/talleres" },
  { seccion: "Jubilados", url: "https://www.pami.org.ar/talleresycursos/cursos-upami" },
  { seccion: "Jubilados", url: "https://www.pami.org.ar/talleresycursos/buenvivir" },
  { seccion: "Jubilados", url: "https://lomasdezamora.gov.ar/gestion/agencia-de-personas-adultas-mayores" },
  { seccion: "Jubilados", url: "https://lomasdezamora.gov.ar/gestion/centros-de-jubilados" },
  { seccion: "Jubilados", url: "https://lomasdezamora.gov.ar/registro-geriatrico" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/discapacidad" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/andis/cartilla-de-derechos-para-personas-con-discapacidad" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/servicio/como-obtener-el-certificado-unico-de-discapacidad-cud" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/salud/senadis/pensiones-informacion-y-tramites" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/salud/senadis/asociar-el-certificado-unico-de-discapacidad-cud-la-tarjeta-sube" },
  { seccion: "Discapacidad", url: "https://www.argentina.gob.ar/miargentina" },
  { seccion: "Discapacidad", url: "https://ldz.eregulations.org/procedure/79/29?l=es" },
  { seccion: "Discapacidad", url: "https://ldz.eregulations.org/procedure/462/438?l=es" },
  { seccion: "Discapacidad", url: "https://ldz.eregulations.org/procedure/463/441?l=es" },
];

export type ResultadoEnlace = { seccion: string; url: string; ok: boolean; detalle: string; semanas: number; sinVerificar?: boolean }; // semanas = cuántos controles seguidos viene fallando
export type EstadoEnlaces = { ultimo: string; total: number; resultados: ResultadoEnlace[] };
const SEMANA = 7 * 86400_000;
const TIEMPO = 7000;

// Un enlace "funciona" si la página responde (también si el sitio no deja entrar a los robots: 401, 403, 405 o 429, o redirige a un inicio de sesión).
// Falla si no existe (404, 410), si el sitio está caído (5xx), si no responde o si el nombre ya no existe.
export async function revisar(url: string): Promise<{ ok: boolean; detalle: string; sinVerificar?: boolean }> {
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; LomasHoy control de enlaces)", Accept: "text/html,*/*" }, signal: AbortSignal.timeout(TIEMPO) });
    r.body?.cancel().catch(() => {});
    if (r.status < 400 || [401, 403, 405, 429].includes(r.status)) return { ok: true, detalle: String(r.status) };
    return { ok: false, detalle: `error ${r.status}` };
  } catch (e) {
    const causa = (e as { cause?: { code?: string } }).cause?.code ?? "";
    // Algunos sitios oficiales mandan mal armada la cadena de certificados: los navegadores igual los abren, pero el servidor no puede ver qué página devuelven.
    // No se desactiva la verificación del certificado: esos enlaces quedan marcados como "sin poder verificar" (el sitio responde, pero no se sabe si la página existe).
    if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT/.test(causa)) return { ok: true, sinVerificar: true, detalle: "certificado incompleto del sitio: no se puede verificar desde el servidor" };
    return { ok: false, detalle: (e as Error).name === "TimeoutError" ? "no responde" : causa || "no se pudo conectar" };
  }
}

async function enlacesAControlar(): Promise<Enlace[]> {
  const lista = [...ENLACES];
  // los sitios web que figuran como fuente de los teléfonos (salitas, bomberos, comisarías, servicios): se arman desde la base
  const [x] = await redis([["HVALS", "lugares"]]);
  const vistos = new Set(lista.map((e) => e.url));
  for (const j of (x as string[]) ?? []) {
    try {
      const l = JSON.parse(j) as { fuenteUrl?: string; categoria?: string; nombre?: string };
      if (l.fuenteUrl && /^https?:\/\//.test(l.fuenteUrl) && !/google\.com\/maps/.test(l.fuenteUrl) && !vistos.has(l.fuenteUrl)) { vistos.add(l.fuenteUrl); lista.push({ seccion: `Teléfonos (${l.categoria ?? "lugares"})`, url: l.fuenteUrl }); }
    } catch {}
  }
  return lista;
}

async function enParalelo<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await f(items[k]); } }));
  return out;
}

export async function leerEstadoEnlaces(): Promise<EstadoEnlaces | null> {
  const [j] = await redis([["GET", "enlaces:estado"]]);
  return j ? (JSON.parse(j as string) as EstadoEnlaces) : null;
}

// Hace el control completo y guarda el resultado. Los que fallan se vuelven a probar una vez enseguida (por si fue un corte pasajero).
export async function controlarEnlaces(extra: Enlace[] = []): Promise<EstadoEnlaces> {
  const previo = await leerEstadoEnlaces();
  const antes = new Map((previo?.resultados ?? []).map((r) => [r.url, r.semanas]));
  const lista = [...(await enlacesAControlar()), ...extra]; // extra: solo para pruebas
  let res = await enParalelo(lista, 15, async (e) => ({ e, ...(await revisar(e.url)) }));
  const fallaron = res.filter((r) => !r.ok);
  if (fallaron.length) {
    await new Promise((r) => setTimeout(r, 3000));
    const otra = await enParalelo(fallaron, 15, async (r) => ({ e: r.e, ...(await revisar(r.e.url)) }));
    res = res.map((r) => (r.ok ? r : otra.find((o) => o.e.url === r.e.url) ?? r));
  }
  const resultados: ResultadoEnlace[] = res.map((r) => ({ seccion: r.e.seccion, url: r.e.url, ok: r.ok, detalle: r.detalle, semanas: r.ok ? 0 : (antes.get(r.e.url) ?? 0) + 1, ...(r.sinVerificar ? { sinVerificar: true } : {}) }));
  const estado: EstadoEnlaces = { ultimo: new Date().toISOString(), total: resultados.length, resultados };
  await redis([["SET", "enlaces:estado", JSON.stringify(estado)]]);
  // aviso para mí: los que ya fallan dos controles seguidos (se avisa una sola vez, cuando llegan a dos)
  const rotos = resultados.filter((r) => r.semanas === 2);
  if (rotos.length) {
    await notificarAdmin(
      rotos.length === 1 ? "Enlace roto hace dos semanas" : `${rotos.length} enlaces rotos hace dos semanas`,
      rotos.map((r) => `${r.seccion}: ${r.url}`).join(" · ").slice(0, 230),
      "/panel",
    ).catch((e) => console.error("aviso enlaces", e));
  }
  return estado;
}

// Lo llama el proceso automático en cada vuelta: solo hace algo si pasó una semana desde el último control (y nunca dos a la vez)
export async function controlarEnlacesSiToca() {
  const previo = await leerEstadoEnlaces();
  if (previo && Date.now() - new Date(previo.ultimo).getTime() < SEMANA - 3600_000) return;
  const [lock] = await redis([["SET", "enlaces:lock", "1", "NX", "EX", 300]]);
  if (lock !== "OK") return;
  try { await controlarEnlaces(); } finally { await redis([["DEL", "enlaces:lock"]]); }
}
