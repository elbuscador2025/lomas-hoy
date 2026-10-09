// Qué novedades merecen una notificación y cómo se identifica cada una (para no repetirla).
import { createHash } from "node:crypto";
import { config } from "@/lomas.config.mjs";
import { clasificarTren, hoyMMDD, nombreLindo, type Tren, type Luz } from "@/lib/datos";
import { notificarSeguro } from "@/lib/push";
import type { Aviso } from "@/lib/avisos";

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
      tipo: "luz", clave: `luz:${hash(loc)}`, ttl: 6 * 3600, refrescar: true, zona: loc,
      titulo: `Corte de luz en ${loc}`,
      cuerpo: `${a.usuarios} usuarios sin luz${a.hasta ? ` · hasta las ${a.hasta.slice(11, 16)} hs` : ""}`,
      url: "/?v=luz",
    });
  }
}

// Municipio: al publicar. Va al barrio del aviso, o a todos si es "Todo Lomas". Va firmado.
export async function notificarAviso(a: Aviso) {
  await notificarSeguro({
    tipo: "municipio", clave: `muni:${a.id}`, ttl: 30 * 86400, zona: a.zona,
    titulo: a.titulo, cuerpo: `${a.firma}: ${a.texto}`, url: `/?v=aviso:${a.id}`,
  });
}
