// Escuelas y estudios (servidor). El listado sale del Padrón Oficial de Establecimientos Educativos (Nación) filtrado por Lomas de Zamora y se guarda acá adentro:
// no se consulta la fuente en cada visita, solo cuando toco "Actualizar el listado" en el panel. Encima del listado van mis cambios: editar, desactivar y agregar a mano.
import { redis } from "@/lib/servidor";
import { bajarPadron, leerPadron, type ResultadoPadron } from "@/lib/escuelas-padron";
import { INSCRIPCIONES_POR_DEFECTO, NIVELES, type Escuela, type EscuelaVista, type Inscripciones, type DatosEscuelas, type Nivel } from "@/lib/escuelas-comun";

type Base = ResultadoPadron & { actualizado: string };
type Cambio = Partial<Pick<Escuela, "nombre" | "sector" | "niveles" | "direccion" | "barrio" | "telefono">> & { desactivada?: boolean };
type Manual = Escuela & { desactivada?: boolean };

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

async function leer() {
  const [base, ed, man, insc] = await redis([["GET", "escuelas:base"], ["HGETALL", "escuelas:ed"], ["HVALS", "escuelas:man"], ["GET", "escuelas:insc"]]);
  const plano = (Array.isArray(ed) ? ed : []) as string[];
  const cambios = new Map<string, Cambio>();
  for (let i = 0; i < plano.length; i += 2) cambios.set(plano[i], JSON.parse(plano[i + 1]) as Cambio);
  return {
    base: base ? (JSON.parse(base as string) as Base) : null,
    cambios,
    manuales: ((man as string[]) ?? []).map((j) => JSON.parse(j) as Manual),
    insc: insc ? ({ ...INSCRIPCIONES_POR_DEFECTO, ...(JSON.parse(insc as string) as Partial<Inscripciones>) }) : INSCRIPCIONES_POR_DEFECTO,
  };
}

// Todo junto: el listado oficial con mis cambios y lo que agregué a mano
function juntar(d: Awaited<ReturnType<typeof leer>>): EscuelaVista[] {
  const base = (d.base?.escuelas ?? []).map((e): EscuelaVista => {
    const c = d.cambios.get(e.id);
    return c ? { ...e, ...c, id: e.id, editada: Object.keys(c).some((k) => k !== "desactivada"), desactivada: !!c.desactivada } : e;
  });
  const manuales = d.manuales.map((m): EscuelaVista => ({ ...m, manual: true }));
  return [...base, ...manuales].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// Lo que ven los vecinos (sin lo desactivado)
export async function publicas(): Promise<DatosEscuelas> {
  const d = await leer();
  const escuelas = juntar(d).filter((e) => !e.desactivada).map(({ manual: _m, desactivada: _d, editada: _e, ...e }) => e);
  return { inscripciones: d.insc, escuelas, actualizado: d.base?.actualizado ?? null, anio: d.base?.anio ?? null };
}

export async function paraPanel() {
  const d = await leer();
  return { inscripciones: d.insc, escuelas: juntar(d), actualizado: d.base?.actualizado ?? null, anio: d.base?.anio ?? null, fuente: d.base?.fuente ?? null, total: d.base?.total ?? 0 };
}

function datosValidos(c: Record<string, unknown>): { ok: true; v: Omit<Escuela, "id"> } | { ok: false; error: string } {
  const nombre = limpio(c.nombre, 120), direccion = limpio(c.direccion, 140), barrio = limpio(c.barrio, 60), telefono = limpio(c.telefono, 30).replace(/[^\d]/g, "");
  const niveles = (Array.isArray(c.niveles) ? c.niveles : []).filter((n): n is Nivel => NIVELES.includes(n as Nivel));
  if (nombre.length < 3) return { ok: false, error: "Escribí el nombre." };
  if (!niveles.length) return { ok: false, error: "Elegí al menos un nivel." };
  if (telefono && (telefono.length < 6 || telefono.length > 13)) return { ok: false, error: "El teléfono no parece válido." };
  return { ok: true, v: { nombre, sector: c.sector === "Estatal" ? "Estatal" : "Privada", niveles, direccion, barrio, telefono } };
}

export async function editar(id: string, c: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = datosValidos(c);
  if (!v.ok) return v;
  const [m] = await redis([["HGET", "escuelas:man", id]]);
  if (m) { await redis([["HSET", "escuelas:man", id, JSON.stringify({ ...(JSON.parse(m as string) as Manual), ...v.v, id })]]); return { ok: true }; }
  const d = await leer();
  if (!d.base?.escuelas.some((e) => e.id === id)) return { ok: false, error: "No se encontró." };
  await redis([["HSET", "escuelas:ed", id, JSON.stringify({ ...(d.cambios.get(id) ?? {}), ...v.v })]]);
  return { ok: true };
}
export async function desactivar(id: string, valor: boolean) {
  const [m] = await redis([["HGET", "escuelas:man", id]]);
  if (m) { await redis([["HSET", "escuelas:man", id, JSON.stringify({ ...(JSON.parse(m as string) as Manual), desactivada: valor })]]); return true; }
  const d = await leer();
  if (!d.base?.escuelas.some((e) => e.id === id)) return false;
  const nuevo: Cambio = { ...(d.cambios.get(id) ?? {}), desactivada: valor };
  if (!valor) delete nuevo.desactivada;
  // sin ningún cambio propio, se borra la anotación: vuelve a ser el dato oficial tal cual
  await redis([Object.keys(nuevo).length ? ["HSET", "escuelas:ed", id, JSON.stringify(nuevo)] : ["HDEL", "escuelas:ed", id]]);
  return true;
}
export async function volverAlOriginal(id: string) { const [n] = await redis([["HDEL", "escuelas:ed", id]]); return Number(n) > 0; }
export async function agregar(c: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = datosValidos(c);
  if (!v.ok) return v;
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await redis([["HSET", "escuelas:man", id, JSON.stringify({ ...v.v, id })]]);
  return { ok: true };
}
export async function borrarManual(id: string) { const [n] = await redis([["HDEL", "escuelas:man", id]]); return Number(n) > 0; }

export async function guardarInscripciones(c: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const lineas = (v: unknown, max: number) => String(v ?? "").split("\n").map((x) => limpio(x, max)).filter(Boolean);
  const enlaces = lineas(c.enlaces, 300).map((l) => { const [t, ...u] = l.split("|"); return { titulo: limpio(t, 80), url: limpio(u.join("|"), 300) }; }).filter((e) => e.titulo && /^https:\/\/\S+$/.test(e.url));
  const insc: Inscripciones = {
    fechas: limpio(c.fechas, 400), resumen: limpio(c.resumen, 200), detalle: limpio(c.detalle, 600), modalidad: limpio(c.modalidad, 300),
    papeles: lineas(c.papeles, 300).slice(0, 10), nota: limpio(c.nota, 400), enlaces: enlaces.slice(0, 6), actualizado: new Date().toISOString().slice(0, 10),
  };
  if (!insc.resumen && !insc.fechas) return { ok: false, error: "Escribí las fechas o el aviso de que todavía no se publicaron." };
  await redis([["SET", "escuelas:insc", JSON.stringify(insc)]]);
  return { ok: true };
}
export async function restaurarInscripciones() { await redis([["DEL", "escuelas:insc"]]); }

// Guarda un listado ya leído (lo usan el botón del panel y el script de carga)
export async function guardarBase(r: ResultadoPadron) {
  const base: Base = { ...r, actualizado: new Date().toISOString() };
  await redis([["SET", "escuelas:base", JSON.stringify(base)]]);
  return base;
}
// "Actualizar el listado": baja el padrón oficial más nuevo y lo reemplaza. Mis ediciones y lo agregado a mano se conservan.
export async function actualizarListado(): Promise<{ ok: true; total: number; anio: string; nuevas: number; sacadas: number } | { ok: false; error: string }> {
  try {
    const antes = new Set(((await leer()).base?.escuelas ?? []).map((e) => e.id));
    const { bytes, url } = await bajarPadron();
    const r = leerPadron(bytes, url);
    if (r.total < 100) return { ok: false, error: `El archivo oficial trajo solo ${r.total} establecimientos de Lomas: no se reemplazó el listado.` };
    await guardarBase(r);
    const ahora = new Set(r.escuelas.map((e) => e.id));
    return { ok: true, total: r.total, anio: r.anio, nuevas: [...ahora].filter((i) => !antes.has(i)).length, sacadas: [...antes].filter((i) => !ahora.has(i)).length };
  } catch (e) {
    console.error("actualizar escuelas:", e);
    return { ok: false, error: "No se pudo bajar el listado oficial ahora. Probá de nuevo más tarde." };
  }
}
