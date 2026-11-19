// Aviso de novedades: el cartelito que avisa a todos cuando la app suma algo nuevo (lo ven los vecinos y lo prepara el panel).
export const TITULO_NOVEDAD = "🆕 Lomas Hoy sumó algo nuevo";
export const MAX_TEXTO_NOVEDAD = 160;
export const SEGUNDOS_NOVEDAD = 6;
export type Novedad = { id: string; texto: string; enlace: string; activo: boolean; creado: string };
export type NovedadPublica = { id: string; texto: string; enlace: string };

// Las secciones internas se escriben como su código de ?v= (ej. "escuelas"); también se acepta "?v=escuelas" o el enlace completo de la app.
// Lo demás tiene que ser una dirección https (se abre en otra pestaña). Devuelve null si el enlace no sirve.
export type Destino = { tipo: "seccion"; vista: string } | { tipo: "url"; url: string };
export function destinoDe(enlace: string, origen = ""): Destino | null {
  const e = enlace.trim();
  if (!e) return null;
  if (/^[a-z0-9][a-z0-9:-]{0,40}$/i.test(e)) return { tipo: "seccion", vista: e.toLowerCase() };
  const q = /^\?v=([a-z0-9][a-z0-9:-]{0,40})$/i.exec(e);
  if (q) return { tipo: "seccion", vista: q[1].toLowerCase() };
  try {
    const u = new URL(e);
    if (u.protocol !== "https:") return null;
    const v = u.searchParams.get("v");
    if (v && /^[a-z0-9][a-z0-9:-]{0,40}$/i.test(v) && (u.origin === origen || u.hostname === "lomas-hoy.vercel.app")) return { tipo: "seccion", vista: v.toLowerCase() };
    return { tipo: "url", url: u.toString() };
  } catch { return null; }
}
