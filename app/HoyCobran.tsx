"use client";
import { useEffect, useState } from "react";
import { terminaciones, type PagoAnses } from "@/lib/anses";

type Clave = "jubilados" | "auh" | "pensiones";
const BOTONES: { id: Clave; titulo: string }[] = [{ id: "jubilados", titulo: "Jubilados" }, { id: "auh", titulo: "AUH" }, { id: "pensiones", titulo: "Pensiones" }];
const GUARDADO = "lomas-hoy:anses-boton";

// Cada botón tiene uno o dos bloques (grupos de pago), con nombres en palabras simples.
type Bloque = { id: string; titulo: string; quienes: string; hoy: string; ya: string };
const BLOQUES: Record<Clave, Bloque[]> = {
  jubilados: [
    { id: "min", titulo: "Jubilados que cobran la mínima", quienes: "los que ganan la mínima", hoy: "Hoy cobran los que ganan la mínima", ya: "Los que cobran la mínima ya cobraron este mes" },
    { id: "sup", titulo: "Jubilados que cobran más que la mínima", quienes: "los que ganan más que la mínima", hoy: "Hoy cobran los que ganan más que la mínima", ya: "Los que cobran más que la mínima ya cobraron este mes" },
  ],
  auh: [{ id: "auh", titulo: "Asignación por hijo (AUH)", quienes: "la AUH", hoy: "Hoy cobra la AUH", ya: "La AUH ya se cobró este mes" }],
  pensiones: [{ id: "pen", titulo: "Pensiones no contributivas", quienes: "las pensiones", hoy: "Hoy cobran las pensiones", ya: "Las pensiones ya se cobraron este mes" }],
};

// Cada línea cargada en el panel pertenece a un botón y a un bloque; las de "haberes superiores al mínimo" son el segundo bloque de Jubilados.
const grupoDe = (p: string): { clave: Clave; bloque: string } | null => {
  const t = p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/auh|asignacion/.test(t)) return { clave: "auh", bloque: "auh" };
  if (/pension/.test(t)) return { clave: "pensiones", bloque: "pen" };
  if (/jubil/.test(t)) return { clave: "jubilados", bloque: /superior/.test(t) ? "sup" : "min" };
  return null;
};
const corto = (f: string) => {
  const d = new Date(`${f}T12:00:00-03:00`);
  const dia = d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short" }).replace(".", "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${Number(f.slice(8, 10))}`;
};
const largo = (f: string) => new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric" }).replace(",", "");
const dniDe = (pagos: PagoAnses[]) => terminaciones([...new Set(pagos.flatMap((p) => p.dnis))].sort((a, b) => a - b));

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
  const bloques = BLOQUES[sel].map((b) => ({ ...b, mes: delGrupo.filter((p) => grupoDe(p.prestacion)?.bloque === b.id && p.fecha.slice(0, 7) === hoy.slice(0, 7)), todos: delGrupo.filter((p) => grupoDe(p.prestacion)?.bloque === b.id) }));
  const conDatos = bloques.filter((b) => b.mes.length);

  // El renglón de arriba: a quién le toca hoy, o cuándo es el próximo pago y de qué grupo
  const lineas: string[] = [];
  for (const b of conDatos) { const h = b.mes.filter((p) => p.fecha === hoy); if (h.length) lineas.push(`${b.hoy}: DNI terminado en ${dniDe(h)}`); }
  if (!lineas.length) {
    const prox = bloques.flatMap((b) => b.todos.filter((p) => p.fecha > hoy).map((p) => ({ b, f: p.fecha }))).sort((a, c) => a.f.localeCompare(c.f))[0];
    if (!conDatos.length) lineas.push("Calendario de este mes todavía sin publicar");
    else if (prox) lineas.push(`Hoy no hay pagos · Próximo: ${largo(prox.f)} DNI ${dniDe(prox.b.todos.filter((p) => p.fecha === prox.f))} (${prox.b.quienes})`);
    else lineas.push("Hoy no hay pagos");
  }

  return (
    <>
      <div className="cobro-botones" role="tablist">
        {BOTONES.map((b) => (
          <button key={b.id} role="tab" aria-selected={sel === b.id} className={`btn cobro-boton ${sel === b.id ? "activo" : ""}`} onClick={() => elegir(b.id)}>{b.titulo}</button>
        ))}
      </div>
      {lineas.map((l) => <p key={l} className="frase">{l}</p>)}
      {conDatos.map((b) => {
        const fechas = b.mes.map((p) => p.fecha).sort();
        if (fechas[fechas.length - 1] < hoy) { // ya cobraron todos: no se muestra la grilla, solo un renglón en gris
          const a = Number(fechas[0].slice(8)), z = Number(fechas[fechas.length - 1].slice(8));
          return <p key={b.id} className="cobro-ya">{b.ya} ({a === z ? `el ${a}` : `del ${a} al ${z}`})</p>;
        }
        return <Grilla key={b.id} titulo={b.titulo} pagos={b.mes} hoy={hoy} />;
      })}
    </>
  );
}
