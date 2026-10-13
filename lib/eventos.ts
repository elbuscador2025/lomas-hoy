// Qué novedades merecen una notificación y cómo se identifica cada una (para no repetirla).
import { createHash } from "node:crypto";
import { config } from "@/lomas.config.mjs";
import { clasificarTren, hoyMMDD, nombreLindo, type Tren, type Luz } from "@/lib/datos";
import { notificarSeguro } from "@/lib/push";
import { redis } from "@/lib/servidor";
import { filaAgua, aguaVisible } from "@/lib/agua";
import { ahoraAR, tituloConBarrio, type Aviso } from "@/lib/avisos";

const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);

// Tren: interrupción, demora o servicio limitado HOY en el partido. Una vez por novedad.
export async function evaluarTren(t: Tren) {
  for (const a of clasificarTren(t.novedades, hoyMMDD()).delDia) {
    await notificarSeguro({
      tipo: "tren", clave: `tren:${hash(a.ramal + "|" + a.motivo)}`, ttl: 86400, refrescar: true,
      titulo: `Tren Roca: ${a.ramal}`, cuerpo: a.motivo, url: "/?v=tren",
    });
  }
}

// Luz: 50 usuarios o más en una localidad. Mientras el corte siga, no se repite; si pasan 6 horas sin corte grande, puede avisar de nuevo.
export async function evaluarLuz(l: Luz) {
  const porLocalidad = new Map<string, { usuarios: number; hasta: string | null }>();
  for (const c of l.cortes) {
    const loc = nombreLindo(c.localidad ?? config.ciudad);
    const a = porLocalidad.get(loc) ?? { usuarios: 0, hasta: null };
    a.usuarios += c.usuarios;
    if (c.normalizacion && (!a.hasta || c.normalizacion > a.hasta)) a.hasta = c.normalizacion;
    porLocalidad.set(loc, a);
  }
  for (const [loc, a] of porLocalidad) {
    if (a.usuarios < config.luz.alertaDesdeUsuarios) continue;
    await notificarSeguro({
      tipo: "luz", clave: `luz:${hash(loc)}`, ttl: 6 * 3600, refrescar: true,
      titulo: `${loc}: corte de luz`,
      cuerpo: `${a.usuarios} usuarios sin luz${a.hasta ? ` · hasta las ${a.hasta.slice(11, 16)} hs` : ""}`,
      url: "/?v=luz",
    });
  }
}

// Municipio: al publicar, a todos. El barrio es solo una etiqueta al principio del título. Va firmado.
export async function notificarAviso(a: Aviso) {
  await notificarSeguro({
    tipo: "municipio", clave: `muni:${a.id}`, ttl: 30 * 86400,
    titulo: tituloConBarrio(a), cuerpo: `${a.firma}: ${a.texto}`, url: `/?v=aviso:${a.id}`,
  });
}

// ---- Cortes programados de Edesur ----
type CorteProgramado = { id: string; localidad: string; lat?: number; lng?: number; inicio: string; fin: string; clientes: number | null; motivo: string };
type Estado = { inicio: string; fin: string; avisado: boolean };

const hh = (hora: string) => { const [h, m] = hora.split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; };
const dia = (fecha: string) =>
  new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: config.zonaHoraria, weekday: "long", day: "numeric" }).replace(",", "");
// "de 8 a 16 hs" si es el mismo día; si dura varios días, con el día de inicio y de fin
const clientes = (n: number | null) => ` (${n} clientes)`;
const cuando = (c: { inicio: string; fin: string }) =>
  c.inicio.slice(0, 10) === c.fin.slice(0, 10)
    ? `de ${hh(c.inicio.slice(11, 16))} a ${hh(c.fin.slice(11, 16))} hs`
    : `desde el ${dia(c.inicio.slice(0, 10))} a las ${hh(c.inicio.slice(11, 16))} hasta el ${dia(c.fin.slice(0, 10))} a las ${hh(c.fin.slice(11, 16))} hs`;
const sumarDia = (fecha: string) => new Date(new Date(`${fecha}T12:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10);

// Corre cada vez que el proceso automático trae los cortes (cada ~20 min):
//  · el día anterior entre las 18 y las 20 hs → "Mañana hay corte…"
//  · el mismo día desde las 7:30, si todavía no empezó → recordatorio
//  · si Edesur cambia el día u horario de un corte ya avisado → aviso de la corrección
// Cada aviso tiene su clave (corte + horario), así que nunca se repite.
export async function evaluarProgramados(p: { cortes: CorteProgramado[] }) {
  const ahora = ahoraAR();
  const hoy = ahora.slice(0, 10), manana = sumarDia(hoy), hm = ahora.slice(11, 16);
  const cfg = config.programados;
  const [crudo] = await redis([["HGETALL", "prog:estado"]]);
  const estados = new Map<string, Estado>();
  const plano = (Array.isArray(crudo) ? crudo : []) as string[];
  for (let i = 0; i < plano.length; i += 2) estados.set(plano[i], JSON.parse(plano[i + 1]));

  const primero = new Map<string, CorteProgramado>(); // un horario por corte: el más próximo
  for (const c of p.cortes) if (!primero.has(c.id)) primero.set(c.id, c);

  for (const c of primero.values()) {
    if ((c.clientes ?? 0) < cfg.avisarDesdeClientes) continue; // corte chico: sin notificación
    const antes = estados.get(c.id);
    let avisado = antes?.avisado ?? false;
    const base = { tipo: "luz" as const, ttl: 10 * 86400 };
    const clave = `prog:${c.id}:${c.inicio}`;

    if (antes?.avisado && (antes.inicio !== c.inicio || antes.fin !== c.fin)) {
      await notificarSeguro({ ...base, clave: `${clave}:${c.fin}:corr`, titulo: `${c.localidad}: cambió un corte programado`,
        cuerpo: `Cambió el corte programado en parte de ${c.localidad}: ahora ${dia(c.inicio.slice(0, 10))}, ${cuando(c)}${clientes(c.clientes)}. Tocá para ver la zona en el mapa. Horario estimado, según Edesur.`, url: "/?v=luz" });
    } else if (c.inicio.slice(0, 10) === manana && hm >= cfg.avisoAnterior.desde && hm < cfg.avisoAnterior.hasta) {
      await notificarSeguro({ ...base, clave: `${clave}:ant`, titulo: `${c.localidad}: corte programado mañana`,
        cuerpo: `Mañana hay un corte programado en parte de ${c.localidad}, ${cuando(c)}${clientes(c.clientes)}. Tocá para ver la zona en el mapa. Horario estimado, según Edesur.`, url: "/?v=luz" });
      avisado = true;
    } else if (c.inicio.slice(0, 10) === hoy && hm >= cfg.recordatorio.desde && hm < cfg.recordatorio.hasta && c.inicio > ahora) {
      await notificarSeguro({ ...base, clave: `${clave}:rec`, titulo: `${c.localidad}: corte programado hoy`,
        cuerpo: `Hoy hay un corte programado en parte de ${c.localidad}, ${cuando(c)}${clientes(c.clientes)}. Tocá para ver la zona en el mapa. Horario estimado, según Edesur.`, url: "/?v=luz" });
      avisado = true;
    }
    if (!antes || antes.inicio !== c.inicio || antes.fin !== c.fin || antes.avisado !== avisado) {
      await redis([["HSET", "prog:estado", c.id, JSON.stringify({ inicio: c.inicio, fin: c.fin, avisado })]]);
    }
  }
  // Se olvidan los cortes que ya no figuran en la lista de Edesur
  const vencidos = [...estados.keys()].filter((id) => !primero.has(id));
  if (vencidos.length) await redis([["HDEL", "prog:estado", ...vencidos]]);
}

// Colectivos: un paro anunciado en los diarios. Una sola notificación por paro: mientras los diarios sigan publicando
// titulares del mismo paro (quedan 3 días en la lista), no se repite. Solo titulares de las últimas 24 horas.
export async function evaluarColectivos(c: { paros: { titular: string; medio: string; link: string; fecha: string }[] }) {
  const reciente = c.paros.filter((p) => Date.now() - new Date(p.fecha).getTime() <= 86400_000).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  if (!reciente) return;
  await notificarSeguro({
    tipo: "colectivos", clave: "colectivos:paro", ttl: 86400, refrescar: true,
    titulo: "Paro de colectivos", cuerpo: `${reciente.titular} (${reciente.medio})`, url: "/?v=colectivos",
  });
}

// Agua: un aviso por corte (cargado a mano o nota de diario de las últimas 24 horas), con la localidad al principio del título.
// De 23 a 7 no se evalúa (así el corte no se "gasta" en silencio y sale apenas termina el horario de silencio).
export async function evaluarAgua() {
  if (!(await aguaVisible())) return;
  const ahora = ahoraAR();
  const hora = Number(ahora.slice(11, 13));
  if (hora >= config.push.silencioDesde || hora < config.push.silencioHasta) return;
  for (const c of (await filaAgua()).contenido?.cortes ?? []) {
    if (c.desde && c.hasta) {
      if (c.hasta < ahora) continue;
      await notificarSeguro({
        tipo: "agua", clave: `agua:${c.id}`, ttl: 10 * 86400,
        titulo: `${c.localidad}: corte de agua`,
        cuerpo: `Corte de agua en ${c.zona}, ${cuando({ inicio: c.desde, fin: c.hasta })}.${c.motivo ? ` ${c.motivo}.` : ""}`, url: "/?v=agua",
      });
    } else if (Date.now() - new Date(c.fecha).getTime() <= 86400_000) {
      await notificarSeguro({
        tipo: "agua", clave: `agua:${c.id}`, ttl: 4 * 86400,
        titulo: `${c.localidad}: corte de agua`, cuerpo: `${c.zona} (${c.fuente})`, url: "/?v=agua",
      });
    }
  }
}
