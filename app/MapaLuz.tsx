"use client";
import { useEffect, useRef } from "react";
import { nombreLindo, ZONA } from "@/lib/datos";

type Corte = { localidad: string | null; usuarios: number; lat?: number; lng?: number };
type Programado = { localidad: string; lat?: number; lng?: number; inicio: string; fin: string };

const hh = (f: string) => { const [h, m] = f.slice(11, 16).split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; };
const diaCorto = (f: string) => new Date(`${f.slice(0, 10)}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "short", day: "numeric" }).replace(",", "");
const globo = (texto: string) => { const e = document.createElement("span"); e.textContent = texto; return e; };

// Mapa de cortes programados (OpenStreetMap con Leaflet, gratis): cada uno en su punto exacto, en naranja.
export default function MapaLuz({ programados }: { programados: Programado[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const naranjas = programados.filter((p) => p.lat != null && p.lng != null);
  const clave = JSON.stringify(naranjas);

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

  if (!naranjas.length) return null;
  return (
    <>
      <div ref={ref} className="mapa-luz" role="img" aria-label="Mapa de cortes programados" />
      <p className="vacio">Edesur marca el punto del corte; la zona afectada puede ser más grande.</p>
    </>
  );
}
