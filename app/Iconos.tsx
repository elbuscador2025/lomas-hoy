// Íconos de línea (SVG simples, sin emojis). Heredan el color del texto.
const TRAZOS: Record<string, React.ReactNode> = {
  tren: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l2-4M15 21l-2-4" /><circle cx="9" cy="14" r=".6" /><circle cx="15" cy="14" r=".6" /></>,
  colectivo: <><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M7 21v-3M17 21v-3" /><circle cx="8" cy="14.5" r=".6" /><circle cx="16" cy="14.5" r=".6" /></>,
  luz: <path d="M13 2L5 13h6l-1 9 8-11h-6z" />,
  guardia: <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></>,
  patita: <><circle cx="6" cy="10" r="1.8" /><circle cx="10" cy="6" r="1.8" /><circle cx="14" cy="6" r="1.8" /><circle cx="18" cy="10" r="1.8" /><path d="M12 12c-3 0-5 3-5 5 0 2 2 2.5 3.5 2 1-.4 2.5-.4 3 0 1.5.5 3.5 0 3.5-2 0-2-2-5-5-5z" /></>,
  megafono: <><path d="M3 10v4a1 1 0 0 0 1 1h3l8 4V5L7 9H4a1 1 0 0 0-1 1z" /><path d="M19 9a4 4 0 0 1 0 6" /></>,
  trueque: <><path d="M4 8h14M14 4l4 4-4 4" /><path d="M20 16H6M10 12l-4 4 4 4" /></>,
  whatsapp: <><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.5z" /><path d="M9 8.5c0 3 3 6 6.5 6.5l1.3-1.6-2.1-1-1 .8c-1.1-.5-2.1-1.5-2.6-2.6l.8-1-1-2.1z" /></>,
  trabajo: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></>,
  ansesof: <><path d="M3 9l9-5 9 5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></>,
  coop: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10M10 20v-5h4v5" /></>,
  discapacidad: <><circle cx="11" cy="4.5" r="1.8" /><path d="M11 8v6h5l2.5 5M9 11.5h5M7.5 13.5a5 5 0 1 0 8 5.5" /></>,
  escudo: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  campana: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z" /><path d="M10 21h4" /></>,
  lupa: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  volver: <path d="M15 5l-7 7 7 7" />,
  flecha: <path d="M9 5l7 7-7 7" />,
  pin: <><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  telefono: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  farmacia: <><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-40 12 12)" /><path d="M9.7 9.7l4.6 4.6" /></>,
  camara: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></>,
  galeria: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
  dinero: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6 9.5v.01M18 14.5v.01" /></>,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  gota: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  // Estado del tiempo
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  nube: <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18z" />,
  solnube: <><path d="M9 4v1.5M3.8 6.3l1 1M2 12h1.5M14.2 6.3l-1 1" /><path d="M7 10a3.5 3.5 0 0 1 6.2-2.2" /><path d="M8 20a4 4 0 0 1-.4-7.98A5.2 5.2 0 0 1 17.8 13a3.5 3.5 0 0 1-.3 7z" /></>,
  lluvia: <><path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5 3.75 3.75 0 0 1 17.5 15z" /><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" /></>,
  tormenta: <><path d="M7 14a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 6.5 3.75 3.75 0 0 1 17.5 14z" /><path d="M12 14l-2 4h4l-2 4" /></>,
  niebla: <><path d="M4 9h16M6 13h12M4 17h16" /></>,
  nieve: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /></>,
};

const LUNA = "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z";
const NUBE = "M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18z";

export function Icono({ nombre, tam = 24, ancho = 2 }: { nombre: string; tam?: number; ancho?: number }) {
  const comun = { width: tam, height: tam, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: ancho, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: "false" as const };
  // Luna con nubes: la medialuna queda atrás y la nube adelante (la nube "borra" lo que la medialuna tendría detrás)
  if (nombre === "lunanube") {
    const luna = "translate(-1 -1.4) scale(0.84)", nube = "translate(4.4 7.8) scale(0.78)";
    return (
      <svg {...comun}>
        <defs>
          <mask id="mascara-luna-nube" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="white" />
            <path d={NUBE} transform={nube} fill="black" stroke="black" strokeWidth={ancho / 0.78 + 3.4} />
          </mask>
        </defs>
        <g mask="url(#mascara-luna-nube)"><path d={LUNA} transform={luna} strokeWidth={ancho / 0.84} /></g>
        <path d={NUBE} transform={nube} strokeWidth={ancho / 0.78} />
      </svg>
    );
  }
  return <svg {...comun}>{TRAZOS[nombre] ?? TRAZOS.nube}</svg>;
}
