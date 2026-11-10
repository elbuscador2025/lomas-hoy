// Deportes para chicos: guía de clubes, instituciones y escuelas deportivas. Los datos se cargan desde mi panel (pestaña "Deportes").
// Nada se inventa: lo que no está publicado queda vacío y la app muestra "Consultar".
export type Costo = "gratis" | "pago" | "";
export type Institucion = {
  id: string; nombre: string; disciplinas: string[]; direccion: string; barrio: string; edades: string; horarios: string;
  costo: Costo; telefono: string; whatsapp: string; inscripcion: string; fuente: string; fuenteUrl: string; foto: string; activa: boolean; actualizado: string;
};
export type DatosDeportes = { visible: boolean; soloDueno: boolean; disciplinas: string[]; instituciones: Institucion[] };

export const DISCIPLINAS_INICIALES = ["Fútbol y futsal", "Básquet", "Natación", "Hockey", "Vóley", "Patín", "Taekwondo", "Artes marciales", "Atletismo", "Rugby", "Otras actividades"];
export const CLAVE_VISIBLE = "deportes:visible";
export const CLAVE_DISC = "deportes:disc";
export const CLAVE_INST = "deportes";

export const waDeportes = (n: string) => { const d = n.replace(/\D/g, ""); return d.startsWith("54") ? d : `54${d.replace(/^0/, "")}`; };
