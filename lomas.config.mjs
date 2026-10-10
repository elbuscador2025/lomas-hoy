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
    colectivos: { activa: true, titulo: "Colectivos" },
    luz: { activa: true, titulo: "Cortes de luz" },
    clima: { activa: true, titulo: "Clima" },
    // Apagada: no se encontró una fuente oficial que se pueda leer automáticamente.
    farmacias: { activa: false, titulo: "Farmacias de turno" },
    urgencias: { activa: true, titulo: "Urgencias y guardias" },
    avisos: { activa: true, titulo: "Avisos del municipio" },
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
    // Sale como alerta arriba solo si en una localidad hay al menos tantos usuarios sin luz.
    alertaDesdeUsuarios: 50,
    // Desde cuántos usuarios afectados en una localidad la alerta pasa a roja.
    graveDesdeUsuarios: 500,
  },

  colectivos: {
    fuente: "Titulares de La Nación, Infobae y TN",
    // Diarios con RSS público. Se leen los titulares y se buscan paros de colectivos por palabras clave.
    diarios: [
      { medio: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
      { medio: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/" },
      { medio: "TN", url: "https://tn.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
    ],
    // El titular debe tener alguna palabra de cada grupo...
    palabrasParo: ["paro", "paros"],
    palabrasColectivos: ["colectivo", "colectivos", "UTA", "transporte automotor"],
    // ...y no nombrar otra provincia o ciudad del interior.
    lugaresAjenos: [
      "Córdoba", "Rosario", "Santa Fe", "Mendoza", "Tucumán", "Salta", "Jujuy", "Neuquén", "Chubut", "Misiones", "Corrientes",
      "Entre Ríos", "Santiago del Estero", "San Juan", "San Luis", "La Rioja", "Catamarca", "Chaco", "Formosa", "La Pampa",
      "Río Negro", "Santa Cruz", "Tierra del Fuego", "Posadas", "Resistencia", "Paraná", "Bariloche", "Comodoro", "Ushuaia",
    ],
    diasMaximos: 3,
  },

  // Localidades del partido (para elegir la zona de un aviso del municipio).
  localidades: [
    "Lomas de Zamora", "Banfield", "Temperley", "Turdera", "Llavallol", "Villa Fiorito", "Ingeniero Budge", "Villa Centenario",
    "San José", "Villa Albertina", "Santa Catalina", "Santa Marta", "Parque Barón", "General Lamadrid",
  ],
  // Avisos del municipio: cuántos por día (para todo el municipio) si no se cambió desde el panel, y cuánto duran sin fecha.
  avisos: { topePorDia: 3, diasDeVigenciaSinFecha: 7 },

  // Cortes de luz programados de Edesur (mapa público de cortes programados). La API no trae calles ni partido: se filtra por localidad.
  programados: {
    activa: true,
    fuente: "Edesur – Cortes programados",
    url: "https://ed.edesur.com.ar/api/utils/outage-report",
    paginaPublica: "https://www.edesur.com.ar/servicios-al-cliente/cortes-programados/",
    diasAdelante: 14,
    avisarDesdeClientes: 50, // los cortes más chicos se ven en la sección Luz, pero no mandan notificación
    avisoAnterior: { desde: "18:00", hasta: "20:00" }, // el día anterior
    recordatorio: { desde: "07:30", hasta: "09:00" }, // el mismo día, solo si el corte empieza después
  },

  // Notificaciones al celular (web push).
  push: {
    tipos: {
      tren: { activa: true, titulo: "Tren Roca" },
      luz: { activa: true, titulo: "Cortes de luz en mi barrio" },
      // Apagado: el archivo abierto de alertas del SMN llegó vacío aunque había alertas vigentes en el país, así que no es confiable.
      tormenta: { activa: false, titulo: "Alertas de tormenta" },
      municipio: { activa: true, titulo: "Avisos del municipio" },
    },
    maximoPorDia: 6, // por celular, sumando todos los tipos
    silencioDesde: 23, // de 23:00 a 7:00 no se manda nada (salvo tormenta naranja o roja)
    silencioHasta: 7,
  },

  clima: {
    fuente: "SMN (Ezeiza Aero) y Open-Meteo",
    url: "https://open-meteo.com/",
    latitud: -34.76,
    longitud: -58.4,
    // Estación del Servicio Meteorológico Nacional más cercana (datos abiertos de "tiempo presente").
    estacionSmn: "Ezeiza",
    // El clima se vuelve a pedir si lo guardado tiene más de estos minutos (una sola consulta compartida por todos).
    minutosFrescura: 4,
    // Pasados estos minutos sin poder actualizarse, se avisa que puede estar viejo.
    minutosParaAvisarViejo: 15,
  },

};
