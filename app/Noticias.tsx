"use client";
import { haceCuanto } from "@/lib/hace";
import type { Noticias } from "@/lib/datos";

// Noticias de Lomas: solo título, diario y enlace. La nota se lee en la página del diario.
export default function NoticiasLomas({ notas, nuevas, sinDatos }: { notas: Noticias["notas"]; nuevas: Set<string>; sinDatos: boolean }) {
  const arriba = notas.filter((n) => nuevas.has(n.link)), resto = notas.filter((n) => !nuevas.has(n.link));
  return (
    <>
      {notas.length === 0
        ? <p className="vacio">{sinDatos ? "Sin datos por ahora." : "Todavía no hay noticias."}</p>
        : (
          <ul className="lista">
            {[...arriba, ...resto].map((n) => (
              <li key={n.link} className={`noticia${nuevas.has(n.link) ? " nueva" : ""}`}>
                <a href={n.link} target="_blank" rel="noreferrer">
                  {nuevas.has(n.link) && <span className="etiqueta-nueva">🔴 NUEVA</span>}
                  <b>{n.titulo}</b>
                  <small>{n.medio} · {haceCuanto(n.fecha)}</small>
                </a>
              </li>
            ))}
          </ul>
        )}
      <p className="vacio">Noticias de medios locales. Lomas Hoy no es responsable de su contenido.</p>
    </>
  );
}
