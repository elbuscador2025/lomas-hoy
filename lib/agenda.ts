// Agenda de Lomas: las notas de los diarios locales que anuncian eventos (las elige scripts/fuentes.mjs con reglas fijas, sin IA).
// Cada nota se ve hasta 15 días contando desde su fecha y después desaparece sola. Aviso opcional: una sola vez por nota, como mucho uno por día, nunca de 23 a 7.
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { notificarSeguro } from "@/lib/push";

export type NotaAgenda = { titulo: string; medio: string; link: string; fecha: string };
export type Agenda = { notas: NotaAgenda[] };
const DIA = 86400_000;

// Junta lo que se leyó ahora con lo que ya estaba, saca lo vencido y anota las notas nuevas para avisar.
export async function fusionarAgenda(nuevo: Agenda): Promise<Agenda> {
  const [previo] = await redis([["GET", "datos:agenda"]]);
  const antes: NotaAgenda[] = previo ? ((JSON.parse(previo as string).contenido?.notas ?? []) as NotaAgenda[]) : [];
  const conocidas = new Set(antes.map((n) => n.link));
  const limite = Date.now() - config.agenda.diasVigencia * DIA;
  const porLink = new Map<string, NotaAgenda>();
  for (const n of [...antes, ...nuevo.notas]) porLink.set(n.link, n);
  const notas = [...porLink.values()].filter((n) => new Date(n.fecha).getTime() >= limite).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const aAvisar = nuevo.notas.filter((n) => !conocidas.has(n.link) && new Date(n.fecha).getTime() >= limite);
  if (aAvisar.length) await redis(aAvisar.map((n) => ["HSET", "agenda:pendientes", n.link, n.titulo] as (string | number)[]).concat([["EXPIRE", "agenda:pendientes", 20 * 86400]]));
  return { notas };
}

// A los que activaron "Avisarme de eventos nuevos": un solo aviso por día juntando las notas nuevas (nunca de 23 a 7: quedan para la mañana)
export async function evaluarAgenda(ahora = new Date()) {
  const hora = Number(ahoraAR(ahora).slice(11, 13));
  if (hora >= config.push.silencioDesde || hora < config.push.silencioHasta) return;
  const dia = hoyArgentina();
  const [hecho, plano] = await redis([["GET", `agenda:aviso:${dia}`], ["HGETALL", "agenda:pendientes"]]);
  if (hecho) return;
  const lista = (Array.isArray(plano) ? plano : []) as string[];
  const titulos: string[] = [];
  for (let i = 1; i < lista.length; i += 2) titulos.push(lista[i]);
  if (!titulos.length) return;
  await redis([["SET", `agenda:aviso:${dia}`, "1", "EX", 2 * 86400], ["DEL", "agenda:pendientes"]]);
  await notificarSeguro({
    tipo: "agenda", clave: `agenda:${dia}`, ttl: 2 * 86400, url: "/?v=agenda",
    titulo: titulos.length === 1 ? "🎉 Nuevo en Lomas" : `🎉 Nuevo en Lomas: ${titulos.length} notas`,
    cuerpo: titulos.length === 1 ? titulos[0] : titulos.slice(0, 3).join(" · ") + (titulos.length > 3 ? ` · y ${titulos.length - 3} más` : ""),
  });
}
