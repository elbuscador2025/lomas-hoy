"use client";
// Pantalla principal: accesos rápidos y tarjetas grandes por grupo. Acá solo se ordena lo que ya existe: cada botón lleva a la misma sección de siempre.
export type Grupo = { id: string; titulo: string; emoji: string; resumen: string; secciones: string[] };

// Las secciones se nombran por su clave en Inicio.tsx (la de cada cuadradito). Cada una está en un grupo, nada queda sin acceso.
export const GRUPOS: Grupo[] = [
  { id: "salud", titulo: "Salud", emoji: "🏥", resumen: "Guardias, farmacias, salitas, veterinarias y más",
    secciones: ["guardias", "salitas", "vets", "farmacias", "telemedicina", "castracion", "discapacidad"] },
  { id: "tramites", titulo: "Trámites y servicios", emoji: "🏛️", resumen: "Trámites, tasas, ANSES, luz, agua y emergencias",
    secciones: ["comunidad", "impuestos", "anses", "ansesof", "auto", "luz", "agua", "otros"] },
  { id: "comunidad", titulo: "Comunidad", emoji: "🤝", resumen: "Mascotas, rescate, trueque y cooperativas",
    secciones: ["mascotas", "rescate", "trueque", "coop"] },
  { id: "trabajo", titulo: "Trabajo y estudio", emoji: "💼", resumen: "Empleo, cursos gratis y emprendedores",
    secciones: ["empleo", "trabajo", "estudiar", "emprendedores"] },
  { id: "familia", titulo: "Familia y tiempo libre", emoji: "🎈", resumen: "Jubilados, deportes, juegos y quiniela",
    secciones: ["jubilados", "deportes", "juegos", "peques", "quiniela"] },
];

type Acceso = { id: string; emoji: string; titulo: string; vista: string; visible: boolean };

// Fila de accesos rápidos a un toque (los seis más usados)
export function AccesosRapidos({ accesos, onAbrir }: { accesos: Acceso[]; onAbrir: (vista: string) => void }) {
  const lista = accesos.filter((a) => a.visible);
  if (!lista.length) return null;
  return (
    <nav className="accesos" aria-label="Accesos rápidos">
      {lista.map((a) => (
        <button key={a.id} className={`acceso acceso-${a.id}`} onClick={() => onAbrir(a.vista)}>
          <span className="acceso-emoji" aria-hidden>{a.emoji}</span>
          <b>{a.titulo}</b>
        </button>
      ))}
    </nav>
  );
}

// Tarjetas grandes de colores, una por grupo (un grupo sin secciones activas no se muestra)
export function TarjetasGrupos({ cuantas, onAbrir }: { cuantas: Record<string, number>; onAbrir: (vista: string) => void }) {
  const visibles = GRUPOS.filter((g) => (cuantas[g.id] ?? 0) > 0);
  return (
    <section className="grupos" aria-label="Todas las secciones">
      {visibles.map((g) => (
        <button key={g.id} className={`grupo-tarjeta grupo-${g.id}`} onClick={() => onAbrir(`grupo-${g.id}`)}>
          <span className="grupo-emoji" aria-hidden>{g.emoji}</span>
          <span className="grupo-textos">
            <b>{g.titulo}</b>
            <small>{g.resumen}</small>
          </span>
          <span className="grupo-flecha" aria-hidden>›</span>
        </button>
      ))}
    </section>
  );
}
