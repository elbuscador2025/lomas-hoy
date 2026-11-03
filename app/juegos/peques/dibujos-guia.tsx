"use client";
// Dibujos de "Bloques con guía": auto, casa, camión y castillo, armados con piezas simples. Todos propios.
const TINTA = "#10213F";
export type Tipo = "carroceria" | "rueda" | "pared" | "techo" | "puerta" | "ventana" | "cabina" | "caja" | "muro" | "torre";
export type Lugar = { id: string; tipo: Tipo; x: number; y: number; w: number; h: number; color?: string };
export type Guia = { id: "auto" | "casa" | "camion" | "castillo"; lugares: Lugar[] };
const SUELO = 260; // altura del piso en el dibujo (todo mide 300 x 300)

export const GUIAS: Guia[] = [
  { id: "auto", lugares: [
    { id: "carroceria", tipo: "carroceria", x: 30, y: 120, w: 240, h: 100 },
    { id: "rueda1", tipo: "rueda", x: 58, y: SUELO - 64, w: 64, h: 64 },
    { id: "rueda2", tipo: "rueda", x: 178, y: SUELO - 64, w: 64, h: 64 },
  ] },
  { id: "casa", lugares: [
    { id: "pared", tipo: "pared", x: 70, y: 160, w: 160, h: 100 },
    { id: "techo", tipo: "techo", x: 50, y: 80, w: 200, h: 80 },
    { id: "puerta", tipo: "puerta", x: 128, y: 200, w: 44, h: 60 },
    { id: "ventana", tipo: "ventana", x: 84, y: 182, w: 34, h: 34 },
  ] },
  { id: "camion", lugares: [
    { id: "caja", tipo: "caja", x: 18, y: 96, w: 150, h: 124 },
    { id: "cabina", tipo: "cabina", x: 170, y: 126, w: 108, h: 94 },
    { id: "rueda1", tipo: "rueda", x: 46, y: SUELO - 64, w: 64, h: 64 },
    { id: "rueda2", tipo: "rueda", x: 196, y: SUELO - 64, w: 64, h: 64 },
  ] },
  { id: "castillo", lugares: [
    { id: "muro", tipo: "muro", x: 100, y: 150, w: 100, h: 110 },
    { id: "torre1", tipo: "torre", x: 52, y: 120, w: 48, h: 140 },
    { id: "torre2", tipo: "torre", x: 200, y: 120, w: 48, h: 140 },
    { id: "techo1", tipo: "techo", x: 40, y: 70, w: 72, h: 50, color: "#D81B60" },
    { id: "techo2", tipo: "techo", x: 188, y: 70, w: 72, h: 50, color: "#D81B60" },
    { id: "puerta", tipo: "puerta", x: 128, y: 208, w: 44, h: 52 },
  ] },
];

// Una pieza dibujada en su propia cajita (0..w, 0..h). "gris" = la sombra que marca el lugar.
export function Parte({ tipo, w, h, gris, luz, gira, color }: { tipo: Tipo; w: number; h: number; gris?: boolean; luz?: boolean; gira?: boolean; color?: string }) {
  const f = (c: string) => (gris ? { fill: "#DDE1EC", stroke: "#B3BBCF", strokeWidth: 3, strokeDasharray: "7 6", strokeLinejoin: "round" as const } : { fill: c, stroke: TINTA, strokeWidth: 4, strokeLinejoin: "round" as const });
  const d = !gris;
  switch (tipo) {
    case "carroceria": return (<>
      <polygon points={`${w * 0.2},${h * 0.46} ${w * 0.32},2 ${w * 0.72},2 ${w * 0.86},${h * 0.46}`} {...f("#E53935")} />
      <rect x="2" y={h * 0.42} width={w - 4} height={h * 0.58 - 2} rx="16" {...f("#E53935")} />
      {d && <><polygon points={`${w * 0.27},${h * 0.4} ${w * 0.35},${h * 0.12} ${w * 0.68},${h * 0.12} ${w * 0.78},${h * 0.4}`} fill="#BFE8FF" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" /><path d={`M${w * 0.52} ${h * 0.12} V${h * 0.4}`} stroke={TINTA} strokeWidth="3" /><circle cx={w * 0.93} cy={h * 0.62} r="7" fill="#FFD54A" stroke={TINTA} strokeWidth="3" /></>}
    </>);
    case "rueda": return (<g className={gira ? "pq-gira" : undefined}>
      <circle cx={w / 2} cy={h / 2} r={w / 2 - 3} {...f(TINTA)} />
      {d && <><circle cx={w / 2} cy={h / 2} r={w * 0.22} fill="#C9CFDF" stroke="#fff" strokeWidth="3" /><path d={`M${w / 2} ${h * 0.2} V${h * 0.8} M${w * 0.2} ${h / 2} H${w * 0.8}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" /></>}
    </g>);
    case "pared": return (<>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="4" {...f("#FFC400")} />
      {d && <path d={`M2 ${h / 3} H${w - 2} M2 ${(h * 2) / 3} H${w - 2} M${w * 0.3} 2 V${h / 3} M${w * 0.7} ${h / 3} V${(h * 2) / 3} M${w * 0.3} ${(h * 2) / 3} V${h - 2}`} stroke="#C99700" strokeWidth="3" />}
    </>);
    case "techo": return <polygon points={`${w / 2},2 ${w - 2},${h - 2} 2,${h - 2}`} {...f(color ?? "#E53935")} />;
    case "puerta": return (<>
      <path d={`M2 ${h - 2} V${w / 2} A${w / 2 - 2} ${w / 2 - 2} 0 0 1 ${w - 2} ${w / 2} V${h - 2} Z`} {...f("#8A5A2B")} />
      {d && <circle cx={w * 0.74} cy={h * 0.62} r="3.5" fill="#FFC400" stroke={TINTA} strokeWidth="2" />}
    </>);
    case "ventana": return (<>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="4" {...f(luz ? "#FFE066" : "#BFE8FF")} />
      {d && <path d={`M${w / 2} 2 V${h - 2} M2 ${h / 2} H${w - 2}`} stroke={TINTA} strokeWidth="3" />}
    </>);
    case "cabina": return (<>
      <polygon points={`2,2 ${w * 0.58},2 ${w - 2},${h * 0.5} ${w - 2},${h - 2} 2,${h - 2}`} {...f("#1E63D6")} />
      {d && <><polygon points={`${w * 0.12},${h * 0.14} ${w * 0.5},${h * 0.14} ${w * 0.76},${h * 0.5} ${w * 0.12},${h * 0.5}`} fill="#BFE8FF" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" /><circle cx={w * 0.93} cy={h * 0.76} r="6" fill="#FFD54A" stroke={TINTA} strokeWidth="3" /></>}
    </>);
    case "caja": return (<>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="6" {...f("#FF8A00")} />
      {d && <path d={`M${w / 4} 4 V${h - 4} M${w / 2} 4 V${h - 4} M${(w * 3) / 4} 4 V${h - 4}`} stroke="#C25E00" strokeWidth="3" />}
    </>);
    case "muro": return (<>
      <path d={`M2 ${h - 2} V2 H24 V14 H38 V2 H${w - 38} V14 H${w - 24} V2 H${w - 2} V${h - 2} Z`} {...f("#8E44AD")} />
      {d && <path d={`M2 ${h * 0.45} H${w - 2} M${w * 0.5} ${h * 0.45} V${h - 2} M${w * 0.25} 14 V${h * 0.45} M${w * 0.75} 14 V${h * 0.45}`} stroke="#6A2F84" strokeWidth="3" />}
    </>);
    case "torre": return (<>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="3" {...f("#1E63D6")} />
      {d && <><rect x={w * 0.3} y={h * 0.16} width={w * 0.4} height="22" rx="4" fill="#BFE8FF" stroke={TINTA} strokeWidth="3" /><path d={`M2 ${h * 0.5} H${w - 2}`} stroke="#164AA3" strokeWidth="3" /></>}
    </>);
  }
}

// Cielo y pasto: se extienden mucho más allá del cuadrado de 300 para llenar toda la escena. De noche (festejo de la casa) se ven las luces.
export const CieloYPiso = ({ noche }: { noche?: boolean }) => (
  <>
    <rect x="-600" y="-900" width="1500" height={900 + SUELO} fill={noche ? "#26335E" : "#EAF8FF"} />
    {noche && [[40, 40], [95, 70], [180, 30], [225, 90], [20, 120], [140, 55]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="#fff" />)}
    <circle cx="255" cy="42" r="22" fill={noche ? "#FFF3B0" : "#FFD54A"} stroke={TINTA} strokeWidth="3" />
    <rect x="-600" y={SUELO} width="1500" height="900" fill={noche ? "#3F7F4B" : "#7BC96F"} /><path d={`M-600 ${SUELO} H900`} stroke={TINTA} strokeWidth="4" />
  </>
);

// El dibujo completo y de colores (para la pantalla de elegir)
export function DibujoCompleto({ guia }: { guia: Guia }) {
  return (
    <svg viewBox="0 40 300 250" className="pq-dib-grande" aria-hidden>
      <rect x="0" y={SUELO} width="300" height="40" fill="#7BC96F" stroke={TINTA} strokeWidth="4" />
      {guia.lugares.map((l) => (
        <svg key={l.id} x={l.x} y={l.y} width={l.w} height={l.h} viewBox={`0 0 ${l.w} ${l.h}`} overflow="visible"><Parte tipo={l.tipo} w={l.w} h={l.h} color={l.color} /></svg>
      ))}
    </svg>
  );
}
