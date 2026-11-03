// BLOQUES: las "reglas" son muy simples y sin física. Cada pieza ocupa una caja; al soltarla se acomoda sola:
//  1) se alinea con los bordes o el centro de las piezas cercanas (o a una grilla), y 2) cae derecho hasta apoyarse en el piso o encima de lo que tenga abajo.
// Ventanas y puertas son "pegatinas": si se sueltan sobre un bloque, quedan pegadas a él (y lo siguen si el bloque se mueve).
export type Tipo = "cuadrado" | "rectangulo" | "triangulo" | "arco" | "circulo" | "techo" | "puerta" | "ventana" | "rueda" | "arbol" | "muneco" | "perrito";
// ancho y alto en "unidades" (una unidad = el lado del cuadrado)
export const MEDIDAS: Record<Tipo, [number, number]> = {
  cuadrado: [1, 1], rectangulo: [2, 1], triangulo: [1, 1], arco: [2, 1], circulo: [1, 1], techo: [2, 1],
  puerta: [0.55, 0.9], ventana: [0.5, 0.5], rueda: [0.9, 0.9], arbol: [1.2, 2], muneco: [0.7, 1.5], perrito: [1.3, 0.9],
};
export const PEGATINAS: Tipo[] = ["puerta", "ventana"];
const ANFITRIONES: Tipo[] = ["cuadrado", "rectangulo"]; // donde se pueden pegar la puerta y la ventana
export const MAX_PIEZAS = 40;

export type Pieza = { id: number; t: Tipo; c: string; rot: number; x: number; y: number; host?: number; ox?: number; oy?: number };
export const esPegatina = (t: Tipo) => PEGATINAS.includes(t);
export const medida = (t: Tipo, rot: number, u: number) => { const [w, h] = MEDIDAS[t]; return rot % 2 ? { w: h * u, h: w * u } : { w: w * u, h: h * u }; };

const TOL = 16; // cuánto "imanta" a los bordes cercanos (px)
const SOLAPE = 6; // cuánto tienen que superponerse en horizontal para considerar que una pieza apoya en otra

// Acomoda todas las piezas: las que caen, apoyan; las pegatinas siguen a su bloque. "suelo" es la altura (y) del piso.
export function asentar(piezas: Pieza[], suelo: number, ancho: number, u: number): Pieza[] {
  const porId = new Map(piezas.map((p) => [p.id, p]));
  const sueltas = piezas.filter((p) => !(esPegatina(p.t) && p.host !== undefined && porId.get(p.host) && !esPegatina(porId.get(p.host)!.t)));
  const res = new Map<number, Pieza>();
  const cajas: { izq: number; der: number; arriba: number }[] = [];
  for (const p of [...sueltas].sort((a, b) => b.y - a.y || a.id - b.id)) { // de abajo hacia arriba
    const { w, h } = medida(p.t, p.rot, u);
    const x = Math.min(ancho - w / 2, Math.max(w / 2, p.x));
    let fondo = suelo;
    for (const c of cajas) if (Math.min(x + w / 2, c.der) - Math.max(x - w / 2, c.izq) > SOLAPE) fondo = Math.min(fondo, c.arriba);
    const q = { ...p, x, y: fondo - h / 2, host: undefined, ox: undefined, oy: undefined };
    res.set(p.id, q); cajas.push({ izq: x - w / 2, der: x + w / 2, arriba: q.y - h / 2 });
  }
  for (const p of piezas) {
    if (res.has(p.id)) continue;
    const a = res.get(p.host!)!, { h } = medida(p.t, p.rot, u), ah = medida(a.t, a.rot, u).h;
    res.set(p.id, { ...p, x: a.x + (p.ox ?? 0), y: p.t === "puerta" ? a.y + ah / 2 - h / 2 : a.y + (p.oy ?? 0) });
  }
  return piezas.map((p) => res.get(p.id)!);
}

// Alinea la x de una pieza con bordes/centros de las otras (si hay alguno cerca)
export function imantarX(x: number, t: Tipo, rot: number, otras: Pieza[], u: number): number {
  const { w } = medida(t, rot, u);
  let mejor = x, dist = TOL;
  const probar = (propio: number, ajeno: number) => { const d = Math.abs(propio - ajeno); if (d < dist) { dist = d; mejor = x + (ajeno - propio); } };
  for (const o of otras) {
    if (esPegatina(o.t) && o.host !== undefined) continue;
    const m = medida(o.t, o.rot, u);
    for (const ajeno of [o.x - m.w / 2, o.x + m.w / 2]) { probar(x - w / 2, ajeno); probar(x + w / 2, ajeno); }
    probar(x, o.x);
  }
  if (mejor === x) mejor = Math.round(x / (u / 4)) * (u / 4); // sin vecinos cerca: a una grilla de un cuarto de unidad
  return mejor;
}

// Si una puerta o ventana se suelta sobre un bloque, devuelve a cuál y dónde queda (relativo al centro del bloque)
export function pegarEn(t: Tipo, x: number, y: number, otras: Pieza[], u: number): { host: number; ox: number; oy: number } | null {
  if (!esPegatina(t)) return null;
  const { w, h } = medida(t, 0, u);
  let elegido: { p: Pieza; area: number } | null = null;
  for (const o of otras) {
    if (!ANFITRIONES.includes(o.t)) continue;
    const m = medida(o.t, o.rot, u);
    if (Math.abs(x - o.x) <= m.w / 2 && Math.abs(y - o.y) <= m.h / 2 && m.w >= w && m.h >= h && (!elegido || m.w * m.h < elegido.area)) elegido = { p: o, area: m.w * m.h };
  }
  if (!elegido) return null;
  const o = elegido.p, m = medida(o.t, o.rot, u), paso = u / 4;
  let ox = Math.abs(x - o.x) < TOL ? 0 : Math.round((x - o.x) / paso) * paso;
  let oy = Math.abs(y - o.y) < TOL ? 0 : Math.round((y - o.y) / paso) * paso;
  ox = Math.max(-(m.w - w) / 2, Math.min((m.w - w) / 2, ox));
  oy = Math.max(-(m.h - h) / 2, Math.min((m.h - h) / 2, oy));
  return { host: o.id, ox, oy };
}
