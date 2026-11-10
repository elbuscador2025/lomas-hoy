// Auto y trámites: enlaces y datos tomados SOLO de páginas oficiales (revisados en noviembre de 2026).
// Nada se inventa: lo que no figura en una fuente oficial no se pone. Los enlaces se controlan una vez por semana (lib/enlaces.ts).
export const REVISADO_AUTO = "noviembre de 2026";

export const URL_AUTO = {
  arba: "https://www.arba.gov.ar/Aplicaciones/AvisoDeudas.asp",
  arbaWeb: "https://web.arba.gov.ar/",
  muniPortal: "https://sag.lomasdezamora.gov.ar/",
  muniPatenteGuia: "https://lomasdezamora.eregulations.org/procedure/362?l=es",
  multasBA: "https://infraccionesba.gba.gob.ar/consulta-infraccion",
  multasMuni: "https://webextra.lomasdezamora.gov.ar/infracciones/ConsultaFaltasNuevoMP.aspx",
  multasNacion: "https://consultainfracciones.seguridadvial.gob.ar/",
  licenciaTurno: "https://comunidad.lomasdezamora.gov.ar/",
  licenciaPrimera: "https://lomasdezamora.eregulations.org/procedure/32?l=es",
  licenciaRenovar: "https://lomasdezamora.eregulations.org/procedure/168?l=es",
  licenciaPagina: "https://lomasdezamora.gov.ar/tramites/licencias-de-conducir",
  cursoVial: "https://curso.seguridadvial.gob.ar/ansv/",
  vtv: "https://vtv.gba.gob.ar/",
  vtvTurno: "https://portal.vtv.gba.gob.ar/cpanel/signin",
  vtvPlantas: "https://vtv.gba.gob.ar/plantas",
  vtvCostos: "https://vtv.gba.gob.ar/costos",
  registros: "https://www.dnrpa.gov.ar/portal_dnrpa/seccionales2.php?registro=true",
  registroTurnos: "https://www2.jus.gov.ar/site",
  dnrpa: "https://www.argentina.gob.ar/propiedadautomotor",
  transferencia: "https://www2.jus.gov.ar/site/#!/08D",
  requisitos: "https://www.dnrpa.gov.ar/portal_dnrpa/informacion/requisitos.php",
  aranceles: "https://www.dnrpa.gov.ar/portal_dnrpa/aranceles2.php",
  muniAuto: "https://lomasdezamora.gov.ar/tramites/automotores-y-transito",
};

// Licencia de conducir: Polo Vial (datos de la Guía de Trámites del Municipio)
export const POLO_VIAL = { nombre: "Polo Vial", direccion: "Las Heras 2200, Lomas de Zamora", telefonos: ["011 2073-6937", "011 2058-2895"] };
export const PASOS_LICENCIA_PRIMERA = [
  "Consultá online si tenés deudas o infracciones",
  "Pedí el turno por la web de Comunidad Lomas (solo se pide por internet)",
  "Presentate al turno en el Polo Vial",
  "Pedí la licencia y pagá el sellado",
  "Registrá tus datos y hacé el examen médico",
  "Rendí el examen teórico y el práctico",
  "Hacé el curso de Seguridad Vial",
  "Retirá tu licencia",
];
export const PASOS_LICENCIA_RENOVAR = [
  "Consultá online si tenés deudas o infracciones",
  "Pedí el turno por la web de Comunidad Lomas",
  "Presentate al turno, pagá el sellado y registrá tus datos",
  "Hacé el examen médico",
  "Retirá tu licencia",
];

// VTV: única planta del partido en la lista oficial de la Provincia (https://vtv.gba.gob.ar/plantas)
export const PLANTA_VTV = { nombre: "Llavallol (Lomas de Zamora)", direccion: "Ascasubi 1901, Lomas de Zamora", horario: "Lunes a viernes de 7 a 17 hs y sábados de 8 a 13 hs" };

// Registros seccionales del automotor en Lomas de Zamora (directorio oficial de la DNRPA)
export type Seccional = { nombre: string; direccion: string; telefonos: string[]; horario: string };
export const SECCIONALES: Seccional[] = [
  { nombre: "Lomas de Zamora Nº 1", direccion: "Portela 485", telefonos: ["011 2265-4922"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 2", direccion: "Sixto Fernández 1090", telefonos: ["011 7722-8543", "011 15 2370-3304"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 3", direccion: "Portela 542", telefonos: ["011 4292-3324", "011 4292-3374"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 4", direccion: "Manuel Castro 94", telefonos: ["011 15 5882-3438"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 5", direccion: "Colombres 1165", telefonos: ["011 7559-5878"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 6", direccion: "Manuel Castro 94", telefonos: ["011 15 5882-3438"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 7", direccion: "Félix de Azara 344", telefonos: ["011 4243-2445", "011 4243-4421"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 8", direccion: "Acevedo 83, piso 6, depto. C", telefonos: ["011 2114-7240", "011 2113-6771"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora Nº 9", direccion: "Mariano Boedo 226", telefonos: ["011 2142-9230"], horario: "8:30 a 14:30" },
  { nombre: "Lomas de Zamora “B”", direccion: "Gorriti 35", telefonos: ["011 3535-1154"], horario: "8:30 a 14:30" },
];
