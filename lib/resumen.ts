// Saludo de la mañana: una sola notificación por día, corta y en tono de vecino, con lo que corresponde a cada celular.
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { asegurarClima } from "@/lib/clima";
import type { Todo } from "@/lib/datos";
import { resumenAnses, terminaciones, type PagoAnses } from "@/lib/anses";
import { cuandoAlerta } from "@/lib/alertas-texto";
import { transporteDe, luzParaSaludo, estadoEnUnaFrase } from "@/lib/transporte";
import { notificarSeguro } from "@/lib/push";

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const contenidoDe = (f: unknown) => (f ? (JSON.parse(f as string) as { contenido: unknown }).contenido : null);

type Datos = { ahora: string; temp: number | null; max: number | null; frase: string | null; todo: Todo; pagos: PagoAnses[]; tormenta?: { texto: string; hasta: string } | null; alerta?: string | null };

export async function cargar(): Promise<Datos> {
  const [clima, pron, tren, colectivos, subte, luz, programados, anses, alertas] = await redis([
    ["GET", "datos:clima"], ["GET", "datos:pronostico"], ["GET", "datos:tren"], ["GET", "datos:colectivos"], ["GET", "datos:subte"],
    ["GET", "datos:luz"], ["GET", "datos:programados"], ["HVALS", "anses"], ["GET", "datos:alertas"],
  ]);
  const crudo = clima ? JSON.parse(clima as string) : null;
  const fila = await asegurarClima(crudo, pron ? JSON.parse(pron as string) : null).catch(() => crudo);
  const ahora = ahoraAR();
  const hoy = fila?.contenido?.porDia?.find((x: { fecha: string }) => x.fecha === ahora.slice(0, 10)) ?? fila?.contenido?.porDia?.[0];
  const c = (x: unknown) => ({ contenido: contenidoDe(x) });
  const al = (contenidoDe(alertas) as { alertas: { evento: string; nivel: string; zonas: string[]; desde: string | null; hasta: string }[] } | null)?.alertas?.find((x) => x.hasta >= ahora);
  return {
    ahora, temp: fila?.contenido?.ahora?.temp ?? null, max: hoy?.max ?? null, frase: fila?.contenido?.frase ?? null, tormenta: fila?.contenido?.tormenta ?? null,
    alerta: al ? `alerta ${al.nivel} por ${al.evento.toLowerCase()} del SMN para ${al.zonas.join(" y ")}: ${cuandoAlerta(al.desde, al.hasta, ahora).corto}` : null,
    todo: { tren: c(tren), colectivos: c(colectivos), subte: c(subte), luz: c(luz), programados: c(programados) } as unknown as Todo,
    pagos: ((anses as string[]) ?? []).map((j) => JSON.parse(j) as PagoAnses),
  };
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fechaLinda = (dia: string) => capitalizar(new Date(`${dia}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: config.zonaHoraria, weekday: "long", day: "numeric", month: "long" }).replace(",", ""));

// Título: "Buen día · Miércoles 21 de octubre". Texto: clima, estado del transporte (o "Ojo: ..."), y quién cobra hoy.
export function textoSaludo(d: Datos) {
  const hoy = d.ahora.slice(0, 10);
  const temp = d.max ?? d.temp;
  const partes: string[] = [];
  if (temp != null) partes.push(`Hoy máx ${Math.round(temp)}°.${d.frase ? ` ${d.frase.split("\n").join(". ")}.` : ""}`);
  const estado = estadoEnUnaFrase(transporteDe(d.todo), luzParaSaludo(d.todo, d.ahora));
  if (estado) partes.push(estado);
  if (d.alerta) partes.push(`Ojo: ${d.alerta}.`);
  else if (d.tormenta && d.tormenta.hasta >= d.ahora) partes.push(`Ojo: ${d.tormenta.texto.charAt(0).toLowerCase()}${d.tormenta.texto.slice(1)}`);
  const cobran = resumenAnses(d.pagos, hoy).delMes.filter((p) => p.fecha === hoy);
  if (cobran.length) partes.push(`Cobran DNI ${terminaciones([...new Set(cobran.flatMap((p) => p.dnis))].sort((a, b) => a - b))}.`);
  return { titulo: `Buen día · ${fechaLinda(hoy)}`, cuerpo: partes.join(" ") || "Que tengas un buen día." };
}

// Lo llama el reloj de las 7 (ver app/api/cron/saludo) y, de respaldo, cada vuelta del proceso automático:
// el primero después de las 7 lo manda, una sola vez por día.
export async function evaluarResumen() {
  const ahora = ahoraAR();
  const hm = ahora.slice(11, 16);
  const v = config.push.horaResumen;
  if (hm < v.desde || hm >= v.hasta) return;
  const d = await cargar();
  await notificarSeguro({
    tipo: "resumen", clave: `resumen:${ahora.slice(0, 10)}`, ttl: 2 * 86400,
    titulo: textoSaludo(d).titulo, cuerpo: textoSaludo(d).cuerpo, url: "/",
  });
}
