// Castración gratuita de mascotas. Todo lo "fijo" sale de la página oficial del Hospital de Animales de Lomas de Zamora
// (https://lomasdezamora.gov.ar/hospital-animales, verificada el 28/10/2026). Las jornadas en los barrios las cargo a mano desde mi panel.
export type Jornada = { id: string; fecha: string; horario: string; direccion: string; barrio: string; requisitos: string; modalidad: string };

export const URL_HOSPITAL_ANIMALES = "https://lomasdezamora.gov.ar/hospital-animales";
export const URL_TURNO_CASTRACION = "https://comunidad.lomasdezamora.gov.ar"; // botón "Solicitá un turno" de la sección Castraciones de esa página
export const HOSPITAL_DIRECCION = "12 de Octubre 1100, Lomas de Zamora";
export const HOSPITAL_HORARIO = "Lunes a viernes de 8 a 18 h · Sábados, domingos y feriados de 9 a 12 h";
export const TELEFONOS_MUNICIPIO = ["0800-666-6666", "0800-122-5662"]; // Centro de Atención a la Comunidad (pie de la página oficial)
export const REDES_CRONOGRAMA = [
  { nombre: "@hospitaldeanimaleslomas", url: "https://www.instagram.com/hospitaldeanimaleslomas" },
  { nombre: "@saludlomas", url: "https://www.instagram.com/saludlomas" },
];
export const PALABRAS_CASTRACION = "castracion castraciones castrar esterilizar esterilizacion gratis gratuita perro perros gato gatos mascota mascotas hospital de animales zoonosis operativo";

// Las jornadas vencidas (fecha anterior a hoy) desaparecen solas.
export const vigentes = (l: Jornada[], hoy: string) => l.filter((j) => j.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario));
