// Oficinas de ANSES (UDAI y similares) de Lomas de Zamora. Datos del buscador oficial "Oficinas de atención al público" de ANSES;
// se pueden corregir, agregar o borrar desde mi panel. lat/lng salen del enlace "Ver en mapa" de la propia página de ANSES.
export type OficinaAnses = { id: string; nombre: string; direccion: string; localidad: string; horario: string; lat?: number; lng?: number };
export const URL_TURNOS_ANSES = "https://www.anses.gob.ar/turnos";
export const URL_OFICINAS_ANSES = "https://www.anses.gob.ar/oficinas-atencion-al-publico";
export const TEL_ANSES = "130";

export const OFICINAS_ANSES: OficinaAnses[] = [
  { id: "lomas", nombre: "ANSES Lomas de Zamora (UDAI)", direccion: "Hipólito Yrigoyen 7550", localidad: "Banfield", horario: "8:30 a 14:30 hs", lat: -34.7432442, lng: -58.3988717 },
  { id: "turdera", nombre: "ANSES Turdera (UDAI)", direccion: "Hipólito Yrigoyen 11585", localidad: "Turdera", horario: "8:30 a 14:30 hs", lat: -34.791485, lng: -58.408905 },
  { id: "albertina", nombre: "ANSES Villa Albertina (UDAI)", direccion: "Bayona 40, entre Homero y Falucho", localidad: "Villa Albertina, Lomas de Zamora", horario: "8:30 a 14:30 hs", lat: -34.738755, lng: -58.456475 },
];

export const ordenarOficinas = (l: OficinaAnses[]) => [...l].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
export const PALABRAS_ANSES_OF = "anses udai oficina oficinas turno turnos atencion jubilacion jubilaciones pension auh asignacion asignaciones";
