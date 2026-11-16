"use client";
import { useEffect, useState } from "react";

export type PortadaManual = { id: string; titulo: string; texto: string; enlace: string; foto: string };
type NotaConFoto = { titulo: string; link: string; medio: string; fecha: string; imagen?: string };
type Item = { clave: string; foto: string; titulo: string; credito?: string; href?: string; vista?: string };

// Quién figura como autor de la foto automática: el diario de donde sale la nota
const MAX_AUTOMATICAS = 3;

// "📸 Hoy en Lomas": foto grande con el título encima. Si cargué portadas desde el panel, se ven solo esas (rotan, hasta 3).
// Si no, se ven las 3 notas más nuevas de Noticias o Agenda que traen foto, con el nombre del diario y el enlace a la nota original.
export default function PortadaHoy({ manuales, notas, onAbrir }: { manuales: PortadaManual[]; notas: NotaConFoto[]; onAbrir: (vista: string) => void }) {
  const [rotas, setRotas] = useState<Set<string>>(new Set()); // fotos que no cargaron: se saltean
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);

  const items: Item[] = manuales.length
    ? manuales.map((m) => ({ clave: `m:${m.id}`, foto: m.foto, titulo: m.titulo, href: m.enlace || undefined, vista: m.enlace ? undefined : `portada-ver:${m.id}` }))
    : [...new Map(notas.filter((n) => n.imagen && /^https:\/\//.test(n.imagen)).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((n) => [n.link, n])).values()]
        .slice(0, MAX_AUTOMATICAS + 3)
        .map((n) => ({ clave: `a:${n.link}`, foto: n.imagen!, titulo: n.titulo, credito: `Foto: ${n.medio}`, href: n.link }));
  const visibles = items.filter((i) => !rotas.has(i.clave)).slice(0, manuales.length ? 3 : MAX_AUTOMATICAS);
  const n = visibles.length;
  const i = n ? Math.min(actual, n - 1) : 0;

  useEffect(() => {
    if (n < 2 || pausa) return;
    const t = window.setInterval(() => setActual((a) => (a + 1) % n), 6000);
    return () => window.clearInterval(t);
  }, [n, pausa]);

  if (!n) return null;
  const it = visibles[i];
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={it.clave} className="hoy-foto" src={it.foto} alt="" loading="eager" referrerPolicy="no-referrer" onError={() => setRotas((r) => new Set(r).add(it.clave))} />
      <span className="hoy-etiqueta">📸 Hoy en Lomas</span>
      <span className="hoy-texto">
        <b>{it.titulo}</b>
        <small>Tocá para leer más{it.credito ? ` · ${it.credito}` : ""}</small>
      </span>
    </>
  );
  return (
    <section className="hoy-en-lomas" aria-label="Hoy en Lomas" onTouchStart={() => setPausa(true)} onTouchEnd={() => setTimeout(() => setPausa(false), 8000)}>
      {it.href
        ? <a className="hoy-enlace" href={it.href} target="_blank" rel="noreferrer">{contenido}</a>
        : <button className="hoy-enlace" onClick={() => onAbrir(it.vista!)}>{contenido}</button>}
      {n > 1 && (
        <span className="hoy-puntos">
          {visibles.map((v, k) => (
            <button key={v.clave} className={k === i ? "activo" : ""} aria-label={`Foto ${k + 1} de ${n}`} aria-current={k === i} onClick={() => setActual(k)}><span /></button>
          ))}
        </span>
      )}
    </section>
  );
}
