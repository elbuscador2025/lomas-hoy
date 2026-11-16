// Universidad Nacional de Lomas de Zamora (UNLZ): carreras y fechas de ingreso 2027 tal como las publica la propia Universidad (unlz.edu.ar y los sitios de sus facultades),
// consultadas en noviembre de 2026. Nada se inventa: donde no hay fecha publicada dice "Consultar". Las fechas cambian: confirmalas en el enlace de cada facultad.
export const REVISADO_UNLZ = "noviembre de 2026";
export const URL_UNLZ = {
  inicio: "https://www.unlz.edu.ar/",
  grado: "https://www.unlz.edu.ar/?page_id=2363",
  buscador: "https://carreras.unlz.edu.ar",
  guia: "https://www.unlz.edu.ar/?p=10043",
  tramites: "https://www.unlz.edu.ar/?page_id=2704",
};
export const TEL_UNLZ = "1170918659"; // la Universidad lo publica como 11 7091-UNLZ (8659)

export type Facultad = {
  id: string; nombre: string; web: string; carreras: string[];
  ingreso: { fechas: string; cierra?: string; como: string; curso: string; enlace: string; consultar?: boolean }; // cierra = último día de la inscripción (AAAA-MM-DD), para decir si sigue abierta
};
export const FACULTADES: Facultad[] = [
  {
    id: "agrarias", nombre: "Facultad de Ciencias Agrarias", web: "https://agrarias.unlz.edu.ar/",
    carreras: [
      "Ingeniería Agronómica", "Ingeniería Zootecnista",
      "Licenciatura en Gestión de la Calidad e Inocuidad de los Alimentos (ciclo de complementación)", "Licenciatura en la Enseñanza de las Ciencias Biológicas (ciclo de complementación)", "Licenciatura en Economía Social (ciclo de complementación)",
      "Técnico Universitario en Procesamiento Agroalimentario", "Técnico Universitario en Producción Vegetal", "Técnico Universitario en Producción Animal",
      "Técnico Universitario en Diseño y Mantenimiento de Espacios Verdes", "Técnico Universitario en Arboricultura y Vivericultura", "Tecnicatura Universitaria en Agroecología (por convenio con el SENASA)",
    ],
    ingreso: { fechas: "Preinscripción online: del 1 al 30 de octubre de 2026.", cierra: "2026-10-30", como: "Se completa el formulario en el sitio de la Facultad y después llegan por correo los pasos siguientes. Hay que presentar título secundario (o constancia de título en trámite), DNI original y copia, tres fotos carnet y una carpeta de tres solapas.", curso: "Curso de Complementación Formativa: del 1 al 26 de febrero de 2027.", enlace: "https://agrarias.unlz.edu.ar/ingreso/" },
  },
  {
    id: "economicas", nombre: "Facultad de Ciencias Económicas", web: "https://www.economicas.unlz.edu.ar/",
    carreras: ["Contador Público", "Licenciatura en Administración", "Tecnicatura Universitaria Contable", "Tecnicatura Universitaria en Administración y Gestión"],
    ingreso: { fechas: "Paso 1, online: del 9 al 30 de noviembre. Paso 2, en la Facultad: del 1 al 11 de diciembre.", cierra: "2026-12-11", como: "En el sitio de la Facultad se carga la solicitud con foto o PDF del DNI, una foto de frente y el certificado o título secundario. Después se presenta el DNI actualizado (original y fotocopia) en la Facultad.", curso: "Curso de Nivelación (obligatorio, no eliminatorio), presencial, en febrero y marzo de 2027.", enlace: "https://www.economicas.unlz.edu.ar/nuevosite/index.php/ingreso-a-la-facultad-ano-2027/" },
  },
  {
    id: "sociales", nombre: "Facultad de Ciencias Sociales", web: "https://sociales.unlz.edu.ar/",
    carreras: [
      "Ciencias de la Educación (Licenciatura y Profesorado)", "Comunicación Social (Licenciatura y Profesorado)", "Letras (Licenciatura y Profesorado)", "Psicopedagogía (Licenciatura y Profesorado)",
      "Periodismo (Tecnicatura y Licenciatura)", "Publicidad (Tecnicatura y Licenciatura)", "Relaciones Laborales (Tecnicatura y Licenciatura)", "Relaciones Públicas (Tecnicatura y Licenciatura)",
      "Trabajo Social (Licenciatura)", "Minoridad y Familia (Tecnicatura)", "Licenciatura en Alto Rendimiento Deportivo (ciclo de complementación, se dicta en el CENARD)",
    ],
    ingreso: { fechas: "Paso 1, online: del 26 al 30 de octubre de 2026. Paso 2, en la Facultad: del 2 al 6 de noviembre, según el último número del DNI.", cierra: "2026-11-06", como: "Se hace en el sistema de la Facultad (SIU-Guaraní). En la Facultad se lleva la ficha impresa, el DNI y el título secundario o constancia de título en trámite.", curso: "Curso de Ingreso (obligatorio): del 1 de febrero al 5 de marzo de 2027.", enlace: "https://sociales.unlz.edu.ar/" },
  },
  {
    id: "derecho", nombre: "Facultad de Derecho", web: "https://derecho.unlz.edu.ar/",
    carreras: [
      "Abogacía", "Licenciatura en Seguridad (ciclo de complementación)", "Licenciatura en Comercio Internacional y Aduanas (ciclo de complementación)", "Licenciatura en Tratamiento Penitenciario (ciclo de complementación)",
      "Profesorado en Ciencias Jurídicas", "Corredor de Comercio y Martillero Público", "Despachante de Aduana", "Técnico Superior en Seguridad", "Técnico en Comercio Internacional y Aduanas",
    ],
    ingreso: { fechas: "Preinscripción online: del 16 al 20 de noviembre de 2026.", cierra: "2026-11-20", como: "Se hace en el sitio de la Facultad. Consultas: ingreso@derecho.unlz.edu.ar.", curso: "Curso de Orientación y Formación: clase inicial en diciembre de 2026 y cursada del 1 al 26 de febrero de 2027.", enlace: "https://derecho.unlz.edu.ar/" },
  },
  {
    id: "ingenieria", nombre: "Facultad de Ingeniería", web: "https://ingenieria.unlz.edu.ar/",
    carreras: [
      "Ingeniería Industrial", "Ingeniería Mecatrónica", "Ingeniería Ferroviaria", "Ingeniería Mecánica",
      "Licenciatura en Higiene y Seguridad en el Trabajo", "Licenciatura en Gestión de Sistemas de Automatización y Robótica", "Licenciatura en Gestión de la Información", "Licenciatura en Enseñanza de la Matemática",
      "Tecnicatura en Higiene y Seguridad en el Trabajo", "Tecnicatura en Programación de Computadores", "Tecnicatura en Implementación y Gestión Informática",
    ],
    ingreso: { fechas: "Consultar: la Facultad dice “Inscripción 2027 abierta” pero no publica las fechas.", como: "La preinscripción se hace en el sitio de la Facultad.", curso: "Consultar", enlace: "https://ingenieria.unlz.edu.ar/oferta-academica/preinscripcion", consultar: true },
  },
];
