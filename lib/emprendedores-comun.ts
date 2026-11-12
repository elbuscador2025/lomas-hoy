// Emprendedores: lo que comparten la pantalla y el servidor (tipos, límites y el filtro de lo que no se puede publicar).
export const AVISO_VENTAS = "Lomas Hoy no interviene en las ventas. Acordá directamente con el emprendedor.";
export const AVISO_TELEFONO = "Tu número lo ve todo el mundo.";
export const MAX_FOTOS = 4, MAX_TITULO = 60, MAX_DESCRIPCION = 500, MAX_COMENTARIO = 300, DIAS_VIGENCIA = 30;
export const MAX_BYTES_FOTO = 250_000, LADO_FOTO = 1000; // la pantalla comprime a esto antes de subir; el servidor acepta hasta MAX_BYTES_FOTO + margen
export const MAX_BYTES_SERVIDOR = 300_000;

// Un mensaje de la conversación; las respuestas van todas en el hilo del comentario original ("aQuien" = a cuál mensaje contesta)
export type ComentarioEmp = { id: string; texto: string; creado: string; duenio: boolean; respuestas?: ComentarioEmp[]; aQuien?: { id: string; extracto: string } };
export type EmprendimientoPublico = {
  id: string; titulo: string; descripcion: string; fotos: string[]; telefono: string; whatsapp: string; creado: string; vence: string; comentarios: number;
};
export type EmprendimientoDetalle = EmprendimientoPublico & { conversacion: ComentarioEmp[] };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Medicamentos y armas: no se pueden ofrecer. Palabra entera (así "armario" o "balanza" no se bloquean).
const PROHIBIDAS = [
  "medicamento", "medicamentos", "medicina", "medicinas", "remedio", "remedios", "pastilla", "pastillas", "comprimido", "comprimidos", "psicofarmaco", "psicofarmacos",
  "antibiotico", "antibioticos", "ansiolitico", "ansioliticos", "analgesico", "analgesicos", "ibuprofeno", "paracetamol", "amoxicilina", "diclofenac", "tramadol",
  "clonazepam", "rivotril", "alprazolam", "bromazepam", "misoprostol", "oxaprost", "sildenafil", "viagra", "cialis", "insulina", "ketamina", "metadona", "morfina", "fentanilo",
  "arma", "armas", "arma de fuego", "armas de fuego", "pistola", "pistolas", "revolver", "revolveres", "escopeta", "escopetas", "rifle", "rifles", "carabina", "carabinas",
  "itaka", "municion", "municiones", "cartucho", "cartuchos", "balas", "calibre", "chumbo", "chumbos", "granada", "granadas", "explosivo", "explosivos", "taser",
];
const RX_PROHIBIDAS = new RegExp(`(?<![a-z0-9])(${PROHIBIDAS.map((p) => p.replace(/ /g, "\s+")).join("|")})(?![a-z0-9])`);
export const MENSAJE_PROHIBIDO = "En Lomas Hoy no se pueden publicar medicamentos ni armas. Sacá esa palabra y volvé a probar.";
export const hayProhibida = (...textos: string[]) => RX_PROHIBIDAS.test(sinTildes(textos.join(" ")));
