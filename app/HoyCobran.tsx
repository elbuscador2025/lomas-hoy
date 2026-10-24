"use client";
import { useEffect, useState } from "react";
import { type PagoAnses } from "@/lib/anses";

type Clave = "jubilados" | "auh" | "pensiones";
const BOTONES: { id: Clave; titulo: string }[] = [{ id: "jubilados", titulo: "Jubilados" }, { id: "auh", titulo: "AUH" }, { id: "pensiones", titulo: "Pensiones" }];
const GUARDADO = "lomas-hoy:anses-boton";

// Cada línea cargada en el panel pertenece a un botón; las de "haberes superiores al mínimo" van dentro de Jubilados, en una segunda grilla.
const grupoDe = (p: string): { clave: Clave; superior: boolean } | null => {
  const t = p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/auh|asignacion/.test(t)) return { clave: "auh", superior: false };
  if (/pension/.test(t)) return { clave: "pensiones", superior: false };
  if (/jubil/.test(t)) return { clave: "jubilados", superior: /superior/.test(t) };
  return null;
};
const corto = (f: string) => {
  const d = new Date(`${f}T12:00:00-03:00`);
  const dia = d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short" }).replace(".", "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${Number(f.slice(8, 10))}`;
};
const largo = (f: string) => new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric" }).replace(",", "");

// Grilla de dos columnas: "DNI 0 → Jue 8". Pasadas en gris, hoy resaltada, la próxima marcada.
function Grilla({ titulo, pagos, hoy }: { titulo: string; pagos: PagoAnses[]; hoy: string }) {
  const celdas = pagos.flatMap((p) => p.dnis.map((d) => ({ dni: d, fecha: p.fecha }))).sort((a, b) => a.dni - b.dni);
  const proxima = pagos.map((p) => p.fecha).filter((f) => f > hoy).sort()[0];
  return (
    <section className="cobro-tarjeta" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul className="cobro-grilla">
        {celdas.map((c) => (
          <li key={c.dni} className={c.fecha < hoy ? "paso" : c.fecha === hoy ? "hoy" : c.fecha === proxima ? "prox" : ""}>
            <span>DNI {c.dni} → <b>{corto(c.fecha)}</b></span>
            {c.fecha === hoy && <em>Hoy</em>}
            {c.fecha === proxima && <em>Próximo</em>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HoyCobran({ entradas, hoy }: { entradas: PagoAnses[]; hoy: string }) {
  const [sel, setSel] = useState<Clave>("jubilados");
  useEffect(() => { try { const g = localStorage.getItem(GUARDADO); if (g === "jubilados" || g === "auh" || g === "pensiones") setSel(g); } catch {} }, []);
  const elegir = (c: Clave) => { setSel(c); try { localStorage.setItem(GUARDADO, c); } catch {} };

  const delGrupo = entradas.filter((p) => grupoDe(p.prestacion)?.clave === sel);
  const delMes = delGrupo.filter((p) => p.fecha.slice(0, 7) === hoy.slice(0, 7));
  const normales = delMes.filter((p) => !grupoDe(p.prestacion)?.superior), superiores = delMes.filter((p) => grupoDe(p.prestacion)?.superior);
  const deHoy = delMes.filter((p) => p.fecha === hoy);
  const proximo = delGrupo.filter((p) => p.fecha > hoy).map((p) => p.fecha).sort()[0];
  const resumen = !delMes.length ? "Calendario de este mes todavía sin publicar"
    : deHoy.length ? `Hoy cobran: DNI terminado en ${[...new Set(deHoy.flatMap((p) => p.dnis))].sort().join(", ")}`
    : proximo ? `Hoy no hay pagos · Próximo: ${largo(proximo)}` : "Hoy no hay pagos";
  const nombre = BOTONES.find((b) => b.id === sel)!.titulo;

  return (
    <>
      <div className="cobro-botones" role="tablist">
        {BOTONES.map((b) => (
          <button key={b.id} role="tab" aria-selected={sel === b.id} className={`btn cobro-boton ${sel === b.id ? "activo" : ""}`} onClick={() => elegir(b.id)}>{b.titulo}</button>
        ))}
      </div>
      <p className="frase">{resumen}</p>
      {normales.length > 0 && <Grilla titulo={nombre} pagos={normales} hoy={hoy} />}
      {superiores.length > 0 && <Grilla titulo="Jubilados · haberes superiores al mínimo" pagos={superiores} hoy={hoy} />}
    </>
  );
}
