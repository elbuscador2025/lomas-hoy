// Estudiá gratis: enlaces y datos tomados SOLO de páginas oficiales (Municipio de Lomas de Zamora, Nación y Provincia), revisados en noviembre de 2026.
// Nada se inventa: lo que no figura en una fuente oficial no se pone. Los enlaces se controlan una vez por semana (lib/enlaces.ts).
export const REVISADO_ESTUDIAR = "noviembre de 2026";

export const URL_ESTUDIAR = {
  aprender: "https://aprender.lomasdezamora.gov.ar/",
  aprenderCursos: "https://aprender.lomasdezamora.gov.ar/courses/courses",
  aprenderPagina: "https://lomasdezamora.gov.ar/gestion/aprender-lomas",
  empleo: "https://empleo.lomasdezamora.gov.ar/",
  fines: "https://www.argentina.gob.ar/educacion/fines/terminar-primaria-secundaria",
  capacitar: "https://www.argentina.gob.ar/economia/capacitar",
  capacitarCursos: "https://www.argentina.gob.ar/economia/capacitar/oferta-formativa/cursos-y-webinars-capacitar",
  ipfl: "https://cursosipfl.trabajo.gba.gob.ar/",
  progresar: "https://www.argentina.gob.ar/educacion/progresar",
  progresarInscripcion: "https://becasprogresar26.educacion.gob.ar/",
};
export const CONTACTO_APRENDER = "aprenderlomas@lomasdezamora.gov.ar";
export const CONTACTO_FINES_PBA = "finesbuenosaires@abc.gob.ar";

// Centros de Formación Profesional (CFP) de Lomas de Zamora: sedes publicadas en Aprender Lomas (Municipio)
export type SedeCFP = { cfp: string; direccion: string; barrio: string; telefono: string; mail: string };
export const SEDES_CFP: SedeCFP[] = [
  { cfp: "401", direccion: "Sirito 450", barrio: "Parque Barón", telefono: "11 4282-7587", mail: "cfp401ldezamora@abc.gob.ar" },
  { cfp: "401", direccion: "Lamadrid 24", barrio: "Lomas de Zamora", telefono: "11 4282-7587", mail: "cfp401ldezamora@abc.gob.ar" },
  { cfp: "401", direccion: "Tucumán 1676", barrio: "Lomas de Zamora", telefono: "11 4282-7587", mail: "cfp401ldezamora@abc.gob.ar" },
  { cfp: "401", direccion: "Homero 2200", barrio: "Lomas de Zamora", telefono: "11 4282-7587", mail: "cfp401ldezamora@abc.gob.ar" },
  { cfp: "402", direccion: "Alfredo L. Palacios 1345", barrio: "Lomas de Zamora", telefono: "11 6084-2295", mail: "cfp402lomasdezamora@abc.gob.ar" },
  { cfp: "402", direccion: "Alem 855", barrio: "Lomas de Zamora", telefono: "11 6084-2295", mail: "cfp402lomasdezamora@abc.gob.ar" },
  { cfp: "402", direccion: "Garibaldi 1661", barrio: "Lomas de Zamora", telefono: "11 6084-2295", mail: "cfp402lomasdezamora@abc.gob.ar" },
  { cfp: "402", direccion: "El Zorzal 3531", barrio: "San José", telefono: "11 6084-2295", mail: "cfp402lomasdezamora@abc.gob.ar" },
  { cfp: "409", direccion: "Boulevard Santa Catalina 184", barrio: "Llavallol", telefono: "11 6609-1179", mail: "cfp409ldezamora@abc.gob.ar" },
  { cfp: "412", direccion: "Pringles 27", barrio: "Temperley", telefono: "11 2444-3639", mail: "cfp412ldezamora@abc.gob.ar" },
];
