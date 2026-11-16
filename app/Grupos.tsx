"use client";
import { IconoLinea } from "./IconosLinea";
// Pantalla principal: accesos rápidos y tarjetas por grupo. Acá solo se ordena lo que ya existe: cada botón lleva a la misma sección de siempre.
export type Grupo = { id: string; titulo: string; resumen: string; secciones: string[] };

// Las secciones se nombran por su clave en Inicio.tsx (la de cada cuadradito). Cada una está en un grupo, nada queda sin acceso.
export const GRUPOS: Grupo[] = [
  { id: "salud", titulo: "Salud", resumen: "Guardias, farmacias, salitas, veterinarias y más",
    secciones: ["guardias", "salitas", "vets", "farmacias", "telemedicina", "castracion", "discapacidad"] },
  { id: "tramites", titulo: "Trámites y servicios", resumen: "Trámites, tasas, ANSES, luz, agua y emergencias",
    secciones: ["comunidad", "impuestos", "anses", "ansesof", "auto", "luz", "agua", "otros"] },
  { id: "comunidad", titulo: "Comunidad", resumen: "Mascotas, rescate, trueque y cooperativas",
    secciones: ["mascotas", "rescate", "trueque", "coop"] },
  { id: "trabajo", titulo: "Trabajo y estudio", resumen: "Empleo, cursos gratis y emprendedores",
    secciones: ["empleo", "trabajo", "estudiar", "emprendedores"] },
  { id: "familia", titulo: "Familia y tiempo libre", resumen: "Jubilados, deportes, juegos y quiniela",
    secciones: ["jubilados", "deportes", "juegos", "peques", "quiniela"] },
];

type Acceso = { id: string; titulo: string; vista: string; visible: boolean };

// Fila de accesos rápidos a un toque (los seis más usados)
export function AccesosRapidos({ accesos, onAbrir }: { accesos: Acceso[]; onAbrir: (vista: string) => void }) {
  const lista = accesos.filter((a) => a.visible);
  if (!lista.length) return null;
  return (
    <nav aria-label="Accesos rápidos">
      <h2 className="rotulo">Accesos rápidos</h2>
      <div className="accesos">
        {lista.map((a) => (
          <button key={a.id} className={`acceso acceso-${a.id}`} onClick={() => onAbrir(a.vista)}>
            <span className="acceso-icono"><IconoLinea nombre={a.id} tam={26} /></span>
            <b>{a.titulo}</b>
          </button>
        ))}
      </div>
    </nav>
  );
}

// Tarjetas blancas con una franja de color, una por grupo (un grupo sin secciones activas no se muestra)
export function TarjetasGrupos({ cuantas, onAbrir }: { cuantas: Record<string, number>; onAbrir: (vista: string) => void }) {
  const visibles = GRUPOS.filter((g) => (cuantas[g.id] ?? 0) > 0);
  return (
    <section aria-label="Todo lo de Lomas">
      <h2 className="rotulo">Todo lo de Lomas</h2>
      <div className="grupos">
        {visibles.map((g) => (
          <button key={g.id} className={`grupo-tarjeta grupo-${g.id}`} onClick={() => onAbrir(`grupo-${g.id}`)}>
            <span className="grupo-icono"><IconoLinea nombre={g.id === "tramites" ? "tramites" : g.id} tam={28} /></span>
            <span className="grupo-textos">
              <b>{g.titulo}</b>
              <small>{g.resumen}</small>
            </span>
            <span className="grupo-flecha"><IconoLinea nombre="flecha" tam={24} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}
