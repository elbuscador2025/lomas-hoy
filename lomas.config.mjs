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
    urgencias: { activa: true, titulo: "Urgencias y guardias" },
  },

  tren: {
    fuente: "Trenes Argentinos",
    url: "https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades",
    linea: "Línea Roca",
    estaciones: ["Banfield", "Lomas de Zamora", "Temperley", "Turdera", "Llavallol"],
    // Aviso del tren: cuenta si nombra estaciones del partido (o el ramal entero sin nombrar otra estación).
    palabrasDelPartido: ["Ezeiza", "Korn", "Temperley", "Banfield", "Lomas", "Turdera", "Llavallol"],
    // Si el texto nombra SOLO estaciones de esta lista (fuera del partido), el aviso se descarta.
    estacionesAjenas: [
      "Constitución", "Hipólito Yrigoyen", "Darío Santillán", "Avellaneda", "Gerli", "Lanús", "Remedios de Escalada",
      "Luis Guillón", "Monte Grande", "Jagüel", "Tristán Suárez", "Burzaco", "Adrogué", "Claypole", "Don Orione", "Glew",
      "Hospital Español", "La Tablada", "San Justo", "Haedo", "Cañuelas", "Lobos", "La Plata", "Quilmes", "Tolosa", "Bosques", "Gutiérrez",
    ],
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

};
