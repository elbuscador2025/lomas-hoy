"use client";
import { useEffect, useRef } from "react";
import { nombreLindo, ZONA } from "@/lib/datos";

type Corte = { localidad: string | null; usuarios: number; lat?: number; lng?: number };
type Programado = { localidad: string; lat?: number; lng?: number; inicio: string; fin: string };

const hh = (f: string) => { const [h, m] = f.slice(11, 16).split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; };
const diaCorto = (f: string) => new Date(`${f.slice(0, 10)}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "short", day: "numeric" }).replace(",", "");
const globo = (texto: string) => { const e = document.createElement("span"); e.textContent = texto; return e; };

// Mapa de cortes de luz (OpenStreetMap con Leaflet, gratis). Rojo: cortes del momento, uno por localidad. Naranja: programados, en su punto.
export default function MapaLuz({ cortes, programados }: { cortes: Corte[]; programados: Programado[] }) {
  const ref = useRef<HTMLDivElement>(null);

  // un círculo por localidad: en el promedio de los puntos que informa el ENRE, con todos sus usuarios sumados
  const porLocalidad = new Map<string, { usuarios: number; lat: number; lng: number; n: number }>();
  for (const c of cortes) {
    if (c.lat == null || c.lng == null) continue;
    const k = nombreLindo(c.localidad ?? "Lomas");
    const a = porLocalidad.get(k) ?? { usuarios: 0, lat: 0, lng: 0, n: 0 };
    a.usuarios += c.usuarios; a.lat += c.lat; a.lng += c.lng; a.n++;
    porLocalidad.set(k, a);
  }
  const rojos = [...porLocalidad].map(([nombre, a]) => ({ nombre, usuarios: a.usuarios, lat: a.lat / a.n, lng: a.lng / a.n }));
  const naranjas = programados.filter((p) => p.lat != null && p.lng != null);
  const clave = JSON.stringify([rojos, naranjas]);

  useEffect(() => {
    let mapa: import("leaflet").Map | undefined;
    let vivo = true;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!vivo || !ref.current) return;
      mapa = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(mapa);
      const puntos: [number, number][] = [];
      for (const r of rojos) {
        puntos.push([r.lat, r.lng]);
        L.circleMarker([r.lat, r.lng], { radius: Math.min(46, 10 + Math.sqrt(r.usuarios) * 1.4), color: "#b71c1c", weight: 2, fillColor: "#e53935", fillOpacity: 0.45 })
          .bindPopup(globo(`${r.nombre} · ${r.usuarios.toLocaleString("es-AR")} usuarios sin luz`)).addTo(mapa);
      }
      for (const p of naranjas) {
        puntos.push([p.lat!, p.lng!]);
        L.circleMarker([p.lat!, p.lng!], { radius: 9, color: "#e65100", weight: 2, fillColor: "#fb8c00", fillOpacity: 0.85 })
          .bindPopup(globo(`${p.localidad} · programado ${diaCorto(p.inicio)}, de ${hh(p.inicio)} a ${hh(p.fin)} hs`)).addTo(mapa);
      }
      if (puntos.length === 1) mapa.setView(puntos[0], 14);
      else mapa.fitBounds(L.latLngBounds(puntos), { padding: [30, 30], maxZoom: 14 });
    })();
    return () => { vivo = false; mapa?.remove(); };
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rojos.length && !naranjas.length) return null;
  return (
    <>
      <div ref={ref} className="mapa-luz" role="img" aria-label="Mapa de cortes de luz en Lomas" />
      <p className="vacio">Edesur informa la localidad y la cantidad de usuarios, no las calles exactas.</p>
    </>
  );
}
