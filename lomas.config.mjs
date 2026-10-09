// Único archivo con los datos de la ciudad y los interruptores de cada sección.
// Para apagar una sección: poné activa: false y volvé a publicar.
export const config = {
  nombre: "Lomas Hoy",
  ciudad: "Lomas de Zamora",
  zonaHoraria: "America/Argentina/Buenos_Aires",
  // Pasadas estas horas sin actualizarse bien, se avisa que el dato puede estar viejo.
  horasParaAvisarDatoViejo: 3,

  secciones: {
    tren: { activa: true, titulo: "Tren Roca" },
    luz: { activa: true, titulo: "Cortes de luz" },
    clima: { activa: true, titulo: "Clima" },
    // Apagada: no se encontró una fuente oficial que se pueda leer automáticamente.
    farmacias: { activa: false, titulo: "Farmacias de turno" },
    telefonos: { activa: true, titulo: "Teléfonos útiles" },
  },

  tren: {
    fuente: "Trenes Argentinos",
    url: "https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades",
    linea: "Línea Roca",
    estaciones: ["Banfield", "Lomas de Zamora", "Temperley", "Turdera", "Llavallol"],
    // Una novedad cuenta si nombra alguna de estas palabras (ramales que pasan por el partido).
    palabrasDelPartido: ["Ezeiza", "Korn", "Temperley", "Banfield", "Lomas", "Turdera", "Llavallol"],
    // Una novedad que nombra solo estas palabras (y ninguna de las de arriba) se descarta.
    palabrasAjenas: ["Cañuelas", "Lobos", "La Plata", "Quilmes", "Tolosa"],
  },

  luz: {
    fuente: "ENRE (Edesur)",
    url: "https://www.enre.gov.ar/mapaCortes/datos/Datos_PaginaWeb.js",
    paginaPublica: "https://www.argentina.gob.ar/enre/estado-del-servicio-electrico-de-edesur",
    partido: "LOMAS DE ZAMORA",
    empresa: "EDESUR",
    // Desde cuántos usuarios afectados en una localidad el aviso pasa a rojo.
    graveDesdeUsuarios: 500,
  },

  clima: {
    fuente: "Open-Meteo",
    url: "https://open-meteo.com/",
    latitud: -34.76,
    longitud: -58.4,
  },

  telefonos: {
    fuente: "Municipio de Lomas de Zamora y empresas (verificar periódicamente)",
    lista: [
      { nombre: "Emergencias (SAME)", numero: "107" },
      { nombre: "Policía", numero: "911" },
      { nombre: "Seguridad Lomas (municipio)", numero: "147" },
      { nombre: "Bomberos", numero: "100" },
      { nombre: "Defensa Civil", numero: "103" },
      { nombre: "Hospital Gandulfo (guardia)", numero: "011 4243-5555" },
      { nombre: "Edesur (luz)", numero: "0800 333 3633" },
      { nombre: "AySA (agua)", numero: "0800 321 2482" },
      { nombre: "Municipio (consultas)", numero: "0800 666 6666" },
      { nombre: "Violencia de género", numero: "144" },
    ],
  },
};
