// Ilustración propia del encabezado: una plaza y el centro de Lomas, con el cielo de fondo. Es un dibujo simple (sin fotos ni logos), liviano y sin interacción.
export default function Ilustracion() {
  return (
    <svg className="portal-ilustracion" viewBox="0 0 400 190" preserveAspectRatio="xMidYMax meet" aria-hidden focusable="false">
      <defs>
        <radialGradient id="ilu-sol" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFF3B0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="338" cy="44" r="46" fill="url(#ilu-sol)" />
      <circle cx="338" cy="44" r="15" fill="#FFE27A" />
      {/* nubes */}
      <g fill="#fff" opacity=".88">
        <ellipse cx="70" cy="46" rx="30" ry="9" /><ellipse cx="90" cy="40" rx="20" ry="9" /><ellipse cx="52" cy="42" rx="16" ry="7" />
        <ellipse cx="238" cy="30" rx="26" ry="7" /><ellipse cx="256" cy="26" rx="16" ry="7" />
      </g>
      {/* edificios del fondo */}
      <g fill="#3A74BB" opacity=".85">
        <rect x="4" y="112" width="26" height="78" /><rect x="34" y="98" width="22" height="92" /><rect x="60" y="120" width="30" height="70" />
        <rect x="262" y="104" width="24" height="86" /><rect x="290" y="118" width="30" height="72" /><rect x="324" y="96" width="22" height="94" /><rect x="350" y="114" width="46" height="76" />
      </g>
      {/* torre con cúpula en el centro */}
      <g>
        <rect x="170" y="86" width="60" height="104" fill="#2E66AA" />
        <rect x="182" y="66" width="36" height="24" fill="#3A74BB" />
        <path d="M178 66 Q200 34 222 66 Z" fill="#1F5496" />
        <rect x="199" y="26" width="2" height="12" fill="#1F5496" /><rect x="194" y="30" width="12" height="2" fill="#1F5496" />
        <rect x="192" y="74" width="16" height="22" rx="8" fill="#BFE0FA" />
        <g fill="#BFE0FA"><rect x="180" y="104" width="8" height="12" rx="4" /><rect x="196" y="104" width="8" height="12" rx="4" /><rect x="212" y="104" width="8" height="12" rx="4" /></g>
      </g>
      {/* edificios del medio */}
      <g fill="#1F5496">
        <rect x="96" y="116" width="34" height="74" /><rect x="132" y="130" width="34" height="60" />
        <rect x="234" y="124" width="26" height="66" />
      </g>
      <g fill="#D6ECFB" opacity=".75">
        <rect x="102" y="124" width="6" height="8" /><rect x="114" y="124" width="6" height="8" /><rect x="102" y="140" width="6" height="8" /><rect x="114" y="140" width="6" height="8" />
        <rect x="138" y="138" width="6" height="8" /><rect x="150" y="138" width="6" height="8" /><rect x="240" y="132" width="6" height="8" />
      </g>
      {/* plaza: pasto, árboles y farol */}
      <rect y="166" width="400" height="24" fill="#2E9B58" />
      <rect y="176" width="400" height="14" fill="#237F46" />
      <path d="M0 190 Q200 160 400 190 Z" fill="#D9C9A3" opacity=".55" />
      <g>
        <rect x="30" y="140" width="5" height="30" fill="#6B4A2B" /><circle cx="32" cy="130" r="20" fill="#2FA05A" /><circle cx="44" cy="138" r="14" fill="#3DB36A" /><circle cx="20" cy="140" r="13" fill="#278F4F" />
        <rect x="366" y="140" width="5" height="30" fill="#6B4A2B" /><circle cx="368" cy="130" r="20" fill="#2FA05A" /><circle cx="354" cy="139" r="14" fill="#3DB36A" /><circle cx="380" cy="140" r="13" fill="#278F4F" />
      </g>
      <g>
        <rect x="110" y="146" width="3" height="26" fill="#17325F" /><circle cx="111.5" cy="144" r="5" fill="#FFE27A" />
        <rect x="288" y="146" width="3" height="26" fill="#17325F" /><circle cx="289.5" cy="144" r="5" fill="#FFE27A" />
      </g>
    </svg>
  );
}
