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
    agua: { activa: true, titulo: "Cortes de agua" },
    clima: { activa: true, titulo: "Clima" },
    // Sin fuente oficial de turnos legible: la sección solo ofrece buscar farmacias abiertas en Google Maps.
    farmacias: { activa: true, titulo: "Farmacias" },
    urgencias: { activa: true, titulo: "Urgencias y guardias" },
    avisos: { activa: true, titulo: "Avisos del municipio" },
    mascotas: { activa: true, titulo: "Mascotas perdidas" },
    anses: { activa: true, titulo: "Hoy cobran" },
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

  // Localidades del partido: lista inicial de barrios para los avisos del municipio (después se administra desde el panel) y filtro de Edesur.
  // Fuentes: las localidades que reconocen la enciclopedia (Wikipedia) y las guías oficiales de salud; no hay una lista única oficial.
  localidades: [
    "Lomas de Zamora", "Banfield", "Temperley", "Turdera", "Llavallol", "Villa Fiorito", "Ingeniero Budge", "Villa Centenario",
    "San José", "Villa Albertina", "Santa Catalina", "Santa Marta", "Parque Barón", "Villa Lamadrid",
  ],
  // Avisos del municipio: cuántos por día (para todo el municipio) si no se cambió desde el panel, y cuánto duran sin fecha.
  avisos: { topePorDia: 3, diasDeVigenciaSinFecha: 7 },

  // Mascotas perdidas (publicaciones de vecinos, sin registro; nada se publica sin aprobación)
  mascotas: {
    diasVigencia: 15, // la publicación se baja sola a los 15 días de aprobada
    maxPorDiaPorCelular: 3,
    maxDescripcion: 200,
    diasNuevas: 2, // "2 nuevas" = aprobadas en los últimos 2 días
    horaResumen: { desde: "19:00", hasta: "20:00" }, // aviso diario para quienes lo prendieron
  },

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

  // Cortes de agua. AySA no publica los cortes en una fuente que se pueda leer sola (su consulta pide captcha y cuenta de cliente),
  // así que se juntan dos cosas: titulares de diarios (RSS) que nombran el corte y una localidad del partido, y cortes cargados a mano desde el panel.
  agua: {
    fuente: "Notas de diarios y cortes cargados por Lomas Hoy",
    paginaPublica: "https://cortes.web.aysa.com.ar/",
    palabrasCorte: ["corte de agua", "cortes de agua", "sin agua", "falta de agua", "AySA"],
    // Además de las localidades de arriba, "Lomas" a secas (por ejemplo "en Lomas hay corte de agua").
    palabrasLugar: ["Lomas"],
    diasMaximos: 2, // una nota de diario deja de mostrarse a los 2 días
  },

  // Notificaciones al celular (web push).
  push: {
    tipos: {
      tren: { activa: true, titulo: "Tren Roca" },
      luz: { activa: true, titulo: "Cortes de luz" },
      agua: { activa: true, titulo: "Cortes de agua" },
      // Apagado: el archivo abierto de alertas del SMN llegó vacío aunque había alertas vigentes en el país, así que no es confiable.
      tormenta: { activa: false, titulo: "Alertas de tormenta" },
      municipio: { activa: true, titulo: "Avisos del municipio" },
      colectivos: { activa: true, titulo: "Paros de colectivos" },
      // Apagado de entrada: solo se prende si la persona lo elige. Como mucho un aviso por día, a las 19.
      mascotas: { activa: true, porDefecto: false, titulo: "Mascotas perdidas" },
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
