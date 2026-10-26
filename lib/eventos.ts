// Qué novedades merecen una notificación y cómo se identifica cada una (para no repetirla).
import { createHash } from "node:crypto";
import { config } from "@/lomas.config.mjs";
import { clasificarTren, hoyMMDD, nombreLindo, textoCorteAgua, type Tren, type Subte, type Alertas } from "@/lib/datos";
import { notificarSeguro } from "@/lib/push";
import { redis } from "@/lib/servidor";
import { filaAgua, aguaVisible } from "@/lib/agua";
import { ahoraAR } from "@/lib/avisos";
import { avisoTormenta } from "@/scripts/clima.mjs";
import { cuandoAlerta } from "@/lib/alertas-texto";

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
// Corre cada vez que el proceso automático trae los cortes (cada ~20 min):
//  · apenas Edesur publica un corte (antes de que empiece) → aviso a todos los que tengan prendidos los cortes de luz
//  · si Edesur cambia el día u horario de un corte ya avisado → aviso de la corrección
// El mismo día se repite dentro del resumen de la mañana. De 23 a 7 no se evalúa: el aviso sale apenas termina el silencio.
// Cada aviso tiene su clave (corte + horario), así que nunca se repite.
export async function evaluarProgramados(p: { cortes: CorteProgramado[] }) {
  const ahora = ahoraAR();
  const hora = Number(ahora.slice(11, 13));
  const silencio = hora >= config.push.silencioDesde || hora < config.push.silencioHasta;
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

    if (!silencio) {
      if (antes?.avisado && (antes.inicio !== c.inicio || antes.fin !== c.fin)) {
        await notificarSeguro({ ...base, clave: `${clave}:${c.fin}:corr`, titulo: "Cambió un corte de luz programado",
          cuerpo: `Cambió el corte programado en ${c.localidad}: ahora ${dia(c.inicio.slice(0, 10))}, ${cuando(c)}.`, url: "/?v=luz" });
      } else if (!avisado) {
        if (c.inicio > ahora) {
          await notificarSeguro({ ...base, clave: `${clave}:nuevo`, titulo: "Corte de luz programado",
            cuerpo: `Corte programado en ${c.localidad}: ${dia(c.inicio.slice(0, 10))}, ${cuando(c)}.`, url: "/?v=luz" });
        }
        avisado = true; // si ya empezó, se ve como corte del momento y no se avisa como programado
      }
    }
    if (!antes || (!silencio && (antes.inicio !== c.inicio || antes.fin !== c.fin || antes.avisado !== avisado))) {
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
    titulo: (reciente as { resumen?: string }).resumen ?? "Paro de colectivos", cuerpo: `${reciente.titular} (${reciente.medio})`, url: "/?v=colectivos",
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
      // Si dos diarios publican lo mismo el mismo día, el aviso sale una sola vez por localidad
      const [primero] = await redis([["SET", `agua:dia:${ahora.slice(0, 10)}:${hash(c.localidad)}`, "1", "NX", "EX", 86400]]);
      if (primero !== "OK") continue;
      await notificarSeguro({
        tipo: "agua", clave: `agua:${c.id}`, ttl: 4 * 86400,
        titulo: textoCorteAgua(c).notif, cuerpo: `${c.zona}${c.cuando ? ` · ${c.cuando}` : ""} (${c.fuente})`, url: "/?v=agua",
      });
    }
  }
}

// Subte: solo líneas interrumpidas o con paro (no demoras chicas). Una vez por línea y problema; mientras siga, no se repite.
export async function evaluarSubte(s: Subte) {
  for (const l of s.lineas) {
    if (l.estado !== "interrumpida" && l.estado !== "paro") continue;
    const nombre = l.id === "Premetro" ? "Premetro" : `Línea ${l.id}`;
    await notificarSeguro({
      tipo: "subte", clave: `subte:${l.id}:${l.estado}:${hash(l.texto)}`, ttl: 6 * 3600, refrescar: true,
      titulo: `${nombre}: ${l.estado === "paro" ? "paro" : "interrumpida"}`, cuerpo: l.texto || `${nombre} ${l.estado === "paro" ? "con paro" : "interrumpida"}`, url: "/?v=subte",
    });
  }
}

// Tormenta fuerte pronosticada en las próximas 12 horas (Lomas o Capital). Una sola notificación por evento (día + momento del día).
// De 23 a 7 solo sale si empieza en las próximas 6 horas (es un tema de seguridad); si empieza más tarde, se espera sin gastar el aviso.
export async function evaluarTormenta(p: { horas: unknown[] }, prefijo = "") {
  const ahora = ahoraAR();
  const a = avisoTormenta(p.horas, ahora);
  if (!a) return;
  const hora = Number(ahora.slice(11, 13));
  if ((hora >= config.push.silencioDesde || hora < config.push.silencioHasta) && a.empiezaEnHoras > 6) return;
  await notificarSeguro({
    tipo: "tormenta", clave: `tormenta:${a.desde.slice(0, 10)}:${a.franja}`, ttl: 86400, nocturna: true,
    titulo: prefijo + a.titulo, cuerpo: a.cuerpo, url: "/?v=tormenta",
  });
}

// Alerta oficial del SMN (tormentas, lluvias o viento) para Lomas o la Ciudad. Una sola notificación por alerta (evento + nivel + día).
// De 23 a 7 solo sale si ya rige o empieza en las próximas 6 horas; si empieza más tarde, se espera sin gastar el aviso.
export async function evaluarAlertasSmn(a: Alertas, prefijo = "") {
  const ahora = ahoraAR();
  const hora = Number(ahora.slice(11, 13));
  const silencio = hora >= config.push.silencioDesde || hora < config.push.silencioHasta;
  const en6h = new Date(Date.now() + 6 * 3600_000 - 3 * 3600_000).toISOString().slice(0, 16);
  for (const x of a.alertas) {
    if (x.hasta < ahora) continue;
    if (silencio && x.desde && x.desde > en6h) continue;
    const evento = x.evento.toLowerCase();
    await notificarSeguro({
      tipo: "tormenta", clave: `alertaSmn:${evento}:${x.nivel}:${(x.desde ?? ahora).slice(0, 10)}`, ttl: 86400, nocturna: true,
      titulo: `${prefijo}Alerta ${x.nivel} por ${evento}`,
      cuerpo: `Alerta ${x.nivel} por ${evento} del SMN para ${x.zonas.join(" y ")}: ${cuandoAlerta(x.desde, x.hasta, ahora).corto}. ${x.instruccion.split(/\s\d-\s?/)[0].replace(/^1-\s?/, "")}`,
      url: "/?v=tormenta",
    });
  }
}
