// Jubilados, para salir y disfrutar: centros de jubilados de Lomas (directorio oficial del Municipio) y actividades. Se administra desde mi panel (pestaña "Jubilados").
// Nada se inventa: lo que no está publicado queda vacío y la app muestra "Consultar".
export type Centro = {
  id: string; nombre: string; direccion: string; barrio: string; lat?: number; lng?: number;
  actividades: string; horarios: string; telefono: string; fuente: string; fuenteUrl: string; activo: boolean; actualizado: string;
};
export type Actividad = { id: string; titulo: string; descripcion: string; donde: string; cuando: string; telefono: string; fuente: string; fuenteUrl: string; activa: boolean; actualizado: string };
export type DatosJubilados = { centros: Centro[]; actividades: Actividad[] };

export const CLAVE_CENTROS = "jubilados";
export const CLAVE_ACTIVIDADES = "jubilados:act";

// Enlaces oficiales (PAMI y Municipio de Lomas de Zamora)
export const URL_MAYORES = {
  pamiTalleres: "https://www.pami.org.ar/talleresycursos/talleres",
  pamiUpami: "https://www.pami.org.ar/talleresycursos/cursos-upami",
  pamiInicio: "https://www.pami.org.ar/talleresycursos/inicio",
  pamiBuenVivir: "https://www.pami.org.ar/talleresycursos/buenvivir",
  agencia: "https://lomasdezamora.gov.ar/gestion/agencia-de-personas-adultas-mayores",
  centros: "https://lomasdezamora.gov.ar/gestion/centros-de-jubilados",
  geriatricos: "https://lomasdezamora.gov.ar/registro-geriatrico",
  instagram: "https://www.instagram.com/agenciamayoreslomas",
};
export const FUENTE_CENTROS = { fuente: "Municipio de Lomas de Zamora – Centros de Jubilados", fuenteUrl: URL_MAYORES.centros };
