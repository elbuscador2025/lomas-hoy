// Controles automáticos de la Quiniela y el Quini 6: avisos de administrador (un solo aviso por sorteo) y el estado que ve mi panel.
import { redis, hoyArgentina } from "@/lib/servidor";
import { notificarAdmin } from "@/lib/push";

export type Problema = { quiniela: string; sorteo: string; fecha: string; motivo?: string };
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fechaCorta = (f: string) => { const d = new Date(`${f}T12:00:00-03:00`); return `${DIAS[d.getUTCDay()]} ${Number(f.slice(8, 10))}`; };

export async function registrarControles(controles: Problema[], diferencias: Problema[]) {
  const hoy = hoyArgentina();
  const avisos: { key: string; titulo: string; cuerpo: string; texto: string }[] = [
    ...controles.map((c) => ({ key: `ctl:${c.quiniela}:${c.sorteo}:${c.fecha}`, titulo: `Revisar quiniela: ${c.quiniela} ${c.sorteo} no pasó el control`, cuerpo: `${fechaCorta(c.fecha)}: ${c.motivo ?? "no cierra"}. No se muestra.`, texto: `${c.quiniela} ${c.sorteo} (${fechaCorta(c.fecha)}): no pasó el control` })),
    ...diferencias.map((d) => ({ key: `nac:${d.quiniela}:${d.sorteo}:${d.fecha}`, titulo: `Revisar quiniela: ${d.quiniela} ${d.sorteo} no coincide con La Nación`, cuerpo: `${fechaCorta(d.fecha)}: se sigue mostrando el resultado oficial.`, texto: `${d.quiniela} ${d.sorteo} (${fechaCorta(d.fecha)}): no coincide con La Nación` })),
  ];
  for (const a of avisos) {
    await redis([["HSET", `qc:hoy:${hoy}`, a.key, a.texto], ["EXPIRE", `qc:hoy:${hoy}`, 3 * 86400]]); // lo que ve mi panel
    const [primera] = await redis([["SET", `qc:aviso:${a.key}`, "1", "NX", "EX", 4 * 86400]]); // un solo aviso por sorteo, nunca repetido
    if (primera === "OK") await notificarAdmin(a.titulo, a.cuerpo, "/panel");
  }
  await redis([["SET", "qc:ultimo", new Date().toISOString()]]);
}

// Para mi panel: "Quiniela: último control OK a las HH:MM", o la lista de lo que falló hoy
export async function estadoControles() {
  const [ultimo, hoyLista] = await redis([["GET", "qc:ultimo"], ["HVALS", `qc:hoy:${hoyArgentina()}`]]);
  return { ultimo: (ultimo as string | null) ?? null, problemas: (hoyLista as string[]) ?? [] };
}
