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
    mascotas: { activa: true, titulo: "Mascotas perdidas" },
    anses: { activa: true, titulo: "Hoy cobran" },
    trueque: { activa: true, titulo: "Trueque" },
    trabajo: { activa: true, titulo: "Trabajo para mayores de 50 años" },
    discapacidad: { activa: true, titulo: "Discapacidad" },
    coop: { activa: true, titulo: "COOP" },
    ansesof: { activa: true, titulo: "ANSES" },
    noticias: { activa: true, titulo: "Noticias de Lomas" },
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

  // Alertas oficiales del SMN (feed CAP registrado en la OMM): tormentas, lluvias o viento que alcanzan a Lomas o a la Ciudad.
  alertas: {
    activa: true,
    fuente: "Servicio Meteorológico Nacional (alertas CAP)",
    url: "https://ssl.smn.gob.ar/CAP/AR.php",
    paginaPublica: "https://www.smn.gob.ar/alertas",
    horasAtras: 48, // solo se miran los avisos generados en las últimas horas
    puntos: [{ nombre: "Lomas de Zamora", lat: -34.7609, lng: -58.4064 }, { nombre: "Capital", lat: -34.6037, lng: -58.3816 }],
  },

  // Subte: estado de las líneas con la API de transporte de la Ciudad (hace falta una clave gratuita: SUBTE_CLIENT_ID y SUBTE_CLIENT_SECRET).
  subte: {
    activa: true,
    fuente: "Gobierno de la Ciudad de Buenos Aires – API de transporte",
    url: "https://apitransporte.buenosaires.gob.ar/subtes/serviceAlerts",
    paginaPublica: "https://api-transporte.buenosaires.gob.ar/",
    lineas: ["A", "B", "C", "D", "E", "H", "Premetro"],
  },

  // Contacto de quien hizo la app (botón del pie de la pantalla principal). Con el número vacío, el botón no se muestra.
  contacto: { whatsapp: "" }, // con 54 9 11 adelante, sin espacios ni signos

  // Noticias de Lomas: solo título, diario y enlace (nunca la nota). Diarios locales con RSS público.
  noticias: {
    diarios: [
      { medio: "Lomas Conectado", url: "https://www.lomasconectado.com/feed" },
      { medio: "Diario Lomas", url: "https://www.diariolomas.com.ar/feed" },
    ],
    maximo: 30,
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
    palabrasParo: ["paro", "paros", "medida de fuerza", "medidas de fuerza"],
    palabrasColectivos: ["colectivo", "colectivos", "UTA", "transporte automotor"],
    // ...y no nombrar otra provincia o ciudad del interior.
    lugaresAjenos: [
      "Córdoba", "Rosario", "Santa Fe", "Mendoza", "Tucumán", "Salta", "Jujuy", "Neuquén", "Chubut", "Misiones", "Corrientes",
      "Entre Ríos", "Santiago del Estero", "San Juan", "San Luis", "La Rioja", "Catamarca", "Chaco", "Formosa", "La Pampa",
      "Río Negro", "Santa Cruz", "Tierra del Fuego", "Posadas", "Resistencia", "Paraná", "Bariloche", "Comodoro", "Ushuaia",
    ],
    diasMaximos: 3,
  },

  // Localidades del partido: lista inicial de barrios (después se administra desde el panel) y filtro de Edesur.
  // Fuentes: las localidades que reconocen la enciclopedia (Wikipedia) y las guías oficiales de salud; no hay una lista única oficial.
  localidades: [
    "Lomas de Zamora", "Banfield", "Temperley", "Turdera", "Llavallol", "Villa Fiorito", "Ingeniero Budge", "Villa Centenario",
    "San José", "Villa Albertina", "Santa Catalina", "Santa Marta", "Parque Barón", "Villa Lamadrid",
  ],
  // Mascotas perdidas (publicaciones de vecinos, sin registro; nada se publica sin aprobación)
  mascotas: {
    diasVigencia: 15, // la publicación se baja sola a los 15 días de aprobada
    maxPorDiaPorCelular: 3,
    maxDescripcion: 200,
    diasNuevas: 2, // "2 nuevas" = aprobadas en los últimos 2 días
    horaResumen: { desde: "19:00", hasta: "20:00" }, // aviso diario para quienes lo prendieron
  },

  // Trueque entre vecinos (sin registro; nada se publica sin aprobación)
  trueque: {
    diasVigencia: 15, // la publicación se baja sola a los 15 días de aprobada
    maxPorDiaPorCelular: 3,
    maxTexto: 120,
    diasNuevas: 2, // "3 nuevas" = aprobadas en los últimos 2 días
    horaResumen: { desde: "19:00", hasta: "20:00" },
    categorias: ["Ropa", "Chicos", "Hogar", "Herramientas", "Electrónica", "Otros"],
  },

  // Trabajo para mayores de 50 años (ofrezco / busco trabajo; sin registro, nada se publica sin aprobación)
  trabajo: {
    diasVigencia: 30, // la publicación se baja sola a los 30 días de aprobada
    maxPorDiaPorCelular: 3,
    maxTexto: 150,
    diasNuevas: 2,
    horaResumen: { desde: "19:00", hasta: "20:00" },
    rubros: ["Oficios", "Cuidado de personas", "Limpieza", "Comercio", "Transporte", "Otros"],
  },

  // Cortes de luz programados de Edesur (mapa público de cortes programados). La API no trae calles ni partido: se filtra por localidad.
  programados: {
    activa: true,
    fuente: "Edesur – Cortes programados",
    url: "https://ed.edesur.com.ar/api/utils/outage-report",
    paginaPublica: "https://www.edesur.com.ar/servicios-al-cliente/cortes-programados/",
    diasAdelante: 14,
    avisarDesdeClientes: 50, // los cortes más chicos se ven en la sección Luz, pero no mandan notificación
  },

  // Cortes de agua. AySA no publica los cortes en una fuente que se pueda leer sola (su consulta pide captcha y cuenta de cliente),
  // así que se juntan dos cosas: titulares de diarios (RSS) que nombran el corte y una localidad del partido, y cortes cargados a mano desde el panel.
  agua: {
    fuente: "Notas de diarios y cortes cargados por Lomas Hoy",
    paginaPublica: "https://cortes.web.aysa.com.ar/",
    // Solo notas que anuncian un corte o falta de agua (no tarifas, boletas ni reclamos).
    palabrasCorte: ["corte de agua", "cortes de agua", "corte de suministro", "cortes de suministro", "corte del suministro de agua", "sin agua", "falta de agua", "sin suministro de agua"],
    palabrasExcluir: ["tarifa", "tarifas", "aumento", "boleta", "boletas", "factura", "facturas", "precio", "precios"],
    // Además de las localidades de arriba, "Lomas" a secas (por ejemplo "en Lomas hay corte de agua").
    palabrasLugar: ["Lomas"],
    diasMaximos: 3, // una nota de diario deja de mostrarse a los 3 días
  },

  // Notificaciones al celular (web push).
  push: {
    tipos: {
      tren: { activa: true, titulo: "Tren Roca" },
      luz: { activa: true, titulo: "Cortes de luz" },
      agua: { activa: true, titulo: "Cortes de agua" },
      // Aviso propio por pronóstico (el archivo abierto de alertas oficiales del SMN llega vacío: no se puede usar). Prendido de entrada.
      tormenta: { activa: true, titulo: "Alertas de tormenta" },
      colectivos: { activa: true, titulo: "Paros de colectivos" },
      // Apagado de entrada: solo líneas interrumpidas o paros, no demoras chicas.
      subte: { activa: true, porDefecto: false, titulo: "Subte" },
      // Apagado de entrada: solo se prende si la persona lo elige. Como mucho un aviso por día, a las 19.
      // Todos los días a las 7: una sola notificación con lo del día. Prendido de entrada.
      resumen: { activa: true, titulo: "Resumen de la mañana" },
      mascotas: { activa: true, porDefecto: false, titulo: "Mascotas perdidas" },
      // Apagado de entrada. Como mucho un aviso por día, a las 19, juntando los trueques nuevos.
      trueque: { activa: true, porDefecto: false, titulo: "Trueque" },
      // Apagado de entrada. Como mucho un aviso por día, a las 19, juntando los trabajos nuevos.
      trabajo: { activa: true, porDefecto: false, titulo: "Trabajo para mayores de 50 años" },
    },
    horaResumen: { desde: "07:00", hasta: "10:00" }, // el resumen sale en la primera vuelta del proceso automático después de las 7
    maximoPorDia: 6, // por celular, sumando todos los tipos
    silencioDesde: 23, // de 23:00 a 7:00 no se manda nada (salvo una tormenta fuerte que empieza en las próximas horas)
    silencioHasta: 7,
  },

  clima: {
    fuente: "SMN (Ezeiza Aero y Aeroparque) y Open-Meteo",
    url: "https://open-meteo.com/",
    latitud: -34.76,
    longitud: -58.4,
    // Estación del Servicio Meteorológico Nacional más cercana (datos abiertos de "tiempo presente").
    // "Ahora" = promedio de estas estaciones (Ezeiza, a campo abierto, daba más frío que Lomas); la primera es la más cercana.
    estacionesSmn: ["Ezeiza", "El Palomar", "Morón", "Buenos Aires", "Aeroparque Buenos Aires"],
    // La lluvia se mira también en la Ciudad de Buenos Aires. Pronóstico a 5 días del SMN (modelo): estaciones de Lomas (Ezeiza) y de Capital (Aeroparque).
    capital: { latitud: -34.6037, longitud: -58.3816 },
    pronSmn: { estacionLomas: "EZEIZA_AERO", estacionCapital: "AEROPARQUE" },
    // El clima se vuelve a pedir si lo guardado tiene más de estos minutos (una sola consulta compartida por todos).
    minutosFrescura: 4,
    // Pasados estos minutos sin poder actualizarse, se avisa que puede estar viejo.
    minutosParaAvisarViejo: 15,
  },

};
