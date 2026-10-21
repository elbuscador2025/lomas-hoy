// Sección "Discapacidad": solo datos copiados de páginas oficiales del Municipio de Lomas de Zamora y del Gobierno nacional.
// Fuentes: lomasdezamora.gov.ar (Agencia de Personas con Discapacidad, trámite del CUD y sus requisitos específicos), Guía de trámites
// ldz.eregulations.org (pases de transporte, símbolo, pensión, taller protegido) y argentina.gob.ar/discapacidad. Lo que no estaba
// confirmado en una página oficial no está acá.
export const REVISADO = "21 de octubre de 2026";
const M = "https://lomasdezamora.gov.ar";
const PDF = (n: string) => `${M}/pdf/cud/${encodeURIComponent(n)}.pdf`;

export const IMDIPAM = {
  nombre: "Instituto Municipal de Discapacidad y Personas Adultas Mayores (IMDIPAM)",
  tambien: "Agencia de Personas con Discapacidad",
  direccion: "Av. Frías 1115 (Parque Municipal Eva Perón), Lomas de Zamora",
  tambienEn: "Entre Ríos 1060, Lomas de Zamora",
  mapa: "Av. Frías 1115, Lomas de Zamora, Buenos Aires, Argentina",
  horario: "Lunes a viernes de 8:30 a 15:30 hs",
  telefono: "011 4282-0279",
  telefonoNota: "Consultas, de lunes a viernes de 8 a 16 hs (el número que da el Municipio para el Centro de Atención Terapéutica y la estimulación temprana)",
  correo: "cud.juntaevaluadora@lomasdezamora.gov.ar",
  fuente: `${M}/gestion/agencia-de-personas-con-discapacidad`,
};

export type Enlace = { texto: string; url: string };
export type Tramite = {
  id: string; titulo: string; palabras: string; // palabras para el buscador
  que: string; quien: string; necesito: string[]; donde: string[]; enlaces?: Enlace[]; nota?: string; fuente: Enlace;
};

export const TRAMITES: Tramite[] = [
  {
    id: "cud", titulo: "Certificado Único de Discapacidad (CUD)", palabras: "cud certificado unico discapacidad junta evaluadora turno planilla",
    que: "Es un documento público, de validez nacional, que acredita la discapacidad. Se otorga después de una evaluación presencial de la Junta Evaluadora (un equipo de médicos, psicólogos, kinesiólogos, terapistas ocupacionales y trabajadores sociales). Es gratuito y con él se accede a los beneficios del Estado.",
    quien: "Personas con discapacidad que quieran certificarla y tengan domicilio en Lomas de Zamora. Si es la primera vez o hay que actualizarlo, el turno se pide por internet. Para agravamiento, ampliación o extravío, el turno es presencial.",
    necesito: [
      "DNI vigente con domicilio en Lomas de Zamora (original y copia). Si cambiaste de domicilio, copia del cambio.",
      "Menores de 16 años: partida de nacimiento.",
      "Constancia de CUIL / CUIT / CDI (original y copia).",
      "Certificado médico original, con diagnóstico completo, secuelas y tratamiento, con firma y sello. No puede tener más de un año.",
      "Estudios médicos complementarios e informes del equipo tratante, si hace falta.",
      "Planillas que avalen el diagnóstico (algunos diagnósticos no las piden), con firma, sello y matrícula del médico. Están abajo.",
      "Carnet de la obra social (copia), si tenés.",
      "Si trabajás, el último recibo de sueldo; si estás jubilado o pensionado, el último comprobante de cobro.",
      "Si hay curatela: copia de la curatela y DNI de quien te apoya.",
    ],
    donde: [
      "Turno por internet (primera vez o actualización): formulario del Municipio.",
      "Turno en persona (agravamiento, ampliación o extravío): IMDIPAM, Av. Frías 1115, de lunes a viernes de 8:30 a 13:30 hs.",
      "Consultas: cud.juntaevaluadora@lomasdezamora.gov.ar",
    ],
    enlaces: [
      { texto: "Pedir turno por internet", url: `${M}/formularios/turnos-cud` },
      { texto: "Requisitos generales (página oficial)", url: `${M}/tramites/discapacidad-cud` },
      { texto: "Visceral · Planilla cardiológica (PDF)", url: PDF("Planilla_Patologias_Cardiovasculares") },
      { texto: "Visceral · Requisitos cardiológicos (PDF)", url: PDF("Requisitos_Visceral_Cardiológico") },
      { texto: "Visceral · Planilla renal (PDF)", url: PDF("Planilla_Patologias_Renales") },
      { texto: "Visceral · Requisitos renales (PDF)", url: PDF("Requisitos_Visceral_Renal") },
      { texto: "Motora · Requisitos (PDF)", url: PDF("Requisitos_Discapacidad_Motora") },
      { texto: "Motora · Planilla de columna vertebral (PDF)", url: PDF("Planilla_Patologias_Columna_Vertebral") },
      { texto: "Motora · Planilla de esclerosis múltiple (PDF)", url: PDF("Planilla_Patologias_Esclerosis_Multiple") },
      { texto: "Motora · Planilla de artritis reumatoidea (PDF)", url: PDF("Planilla_Patologias_Artritis_Reumatoidea") },
      { texto: "Motora · Planilla de miastenia gravis (PDF)", url: PDF("Planilla_Patologias_Miastenia_Gravis") },
      { texto: "Motora · Planilla de desarrollo madurativo (PDF)", url: PDF("Planilla_Evaluación_Desarrollo_Madurativo") },
      { texto: "Visual · Planilla (PDF)", url: PDF("Planilla_Personas_Discapacidad_Visual") },
      { texto: "Visual · Requisitos (PDF)", url: PDF("Requisitos_Discapacidad_Visual") },
      { texto: "Intelectual y mental · Requisitos (PDF)", url: PDF("Requisitos_Discapacidad_Mental") },
      { texto: "Intelectual y mental · Planilla (PDF)", url: PDF("Planilla_Deficiencia_Intelectual_Mental") },
      { texto: "Epilepsia · Planilla (PDF)", url: PDF("Planilla_Personas_Epilepsia") },
    ],
    nota: "No piden planilla específica: discapacidad auditiva; patologías hepáticas, digestivas y respiratorias; hidrocefalia, secuelas de ACV y Parkinson. Siguen los requisitos generales.",
    fuente: { texto: "Municipio de Lomas de Zamora", url: `${M}/tramites/discapacidad-cud` },
  },
  {
    id: "pase", titulo: "Pase de colectivo gratis por discapacidad", palabras: "pase colectivo gratis transporte sube multimodal discapacidad boleto",
    que: "Hay tres formas de viajar gratis con el CUD: el Pase Libre Multimodal (de la Provincia, para colectivos y otros transportes públicos dentro de la Provincia de Buenos Aires), el pase municipal (solo líneas municipales con numeración 500, hasta tres líneas, válido por un año) y la tarjeta SUBE con el CUD vinculado (100% de descuento en colectivos de jurisdicción nacional y trenes, sin mostrar el certificado).",
    quien: "Personas con Certificado Único de Discapacidad (el Pase Libre Multimodal también es para personas trasplantadas o en lista de espera de trasplante).",
    necesito: [
      "Pase Libre Multimodal: el CUD. Se pide por internet y la credencial se retira en el Municipio que elijas al hacer el trámite.",
      "Pase municipal: DNI, CUD, una foto carnet actualizada y la constancia de trámite.",
      "SUBE con CUD: una tarjeta SUBE registrada a tu nombre y el número de tu CUD (los 10 dígitos que figuran en el documento).",
    ],
    donde: [
      "Pase Libre Multimodal: se pide por internet (página oficial del Municipio) y se retira en el IMDIPAM, Av. Frías 1115, de lunes a viernes de 8:30 a 13:30 hs.",
      "Pase municipal: Dirección Municipal de Transporte, Manuel Castro 220 (planta baja), de lunes a viernes de 8 a 16 hs. Teléfono 011 2054-0698 (según la Guía de trámites del Municipio).",
      "SUBE con CUD: se vincula por internet en el sitio oficial de la Secretaría Nacional de Discapacidad.",
    ],
    enlaces: [
      { texto: "Pase Libre Multimodal: cómo pedirlo", url: `${M}/tramites/discapacidad-cud` },
      { texto: "Vincular el CUD a la SUBE (Gobierno nacional)", url: "https://www.argentina.gob.ar/salud/senadis/asociar-el-certificado-unico-de-discapacidad-cud-la-tarjeta-sube" },
    ],
    fuente: { texto: "Guía de trámites del Municipio", url: "https://ldz.eregulations.org/procedure/79/29?l=es" },
  },
  {
    id: "simbolo", titulo: "Símbolo para libre circulación y estacionamiento", palabras: "simbolo libre circulacion estacionamiento acceso auto parabrisas mi argentina",
    que: "Es el Símbolo Internacional de Acceso: permite el libre estacionamiento, en los lugares permitidos, y la libre circulación.",
    quien: "Personas con Certificado Único de Discapacidad. Hasta los 17 años lo gestiona la madre, el padre o el tutor que firmó el CUD.",
    necesito: [
      "El CUD.",
      "Una cuenta en Mi Argentina con la identidad validada, y un correo electrónico activo.",
    ],
    donde: [
      "Es un trámite completamente digital, en Mi Argentina: entrás a MIS TRÁMITES, elegís “solicitar símbolo” y completás los datos.",
      "Después lo imprimís en color, en dos copias, y lo ponés en el parabrisas del vehículo.",
      "Si necesitás ayuda, consultá en el IMDIPAM (Av. Frías 1115).",
    ],
    enlaces: [{ texto: "Mi Argentina", url: "https://www.argentina.gob.ar/miargentina" }],
    fuente: { texto: "Guía de trámites del Municipio", url: "https://ldz.eregulations.org/procedure/462/438?l=es" },
  },
  {
    id: "cat", titulo: "Centro de Atención Terapéutica (CAT)", palabras: "centro atencion terapeutica cat fonoaudiologia psicologia psicopedagogia ninos",
    que: "Apoyo fonoaudiológico, psicológico y psicopedagógico para niñas y niños, con evaluaciones neurocognitivas. Si no tenés el CUD, te asesoran para obtenerlo.",
    quien: "Niñas y niños con discapacidad. La página de la Agencia dice de 3 a 12 años; la Guía de trámites dice de 0 a 18. Confirmá la edad por teléfono.",
    necesito: ["El CUD (o asesoramiento para tramitarlo).", "Derivación médica."],
    donde: [
      "Pedí la entrevista de admisión por correo a inclusion.discapacidad@lomasdezamora.gov.ar o por teléfono al 4282-0279, de lunes a viernes de 8 a 16 hs.",
      "Después hay una entrevista de admisión para evaluar si corresponde el ingreso.",
    ],
    fuente: { texto: "Municipio de Lomas de Zamora", url: `${M}/gestion/agencia-de-personas-con-discapacidad` },
  },
  {
    id: "tea", titulo: "Servicio especializado en autismo (TEA)", palabras: "tea autismo espectro autista tarjeta azul ninos servicio especializado",
    que: "Un equipo multidisciplinario acompaña a niñas, niños y adolescentes dentro del espectro autista y a sus familias: entrevistas de admisión y orientación, evaluación diagnóstica, estimulación temprana, talleres para cuidadores y de habilidades sociales, natación y educación física, y tratamientos cognitivo conductuales. También hay una Tarjeta Azul digital, que da prioridad de atención en las oficinas del Municipio.",
    quien: "Niñas, niños y adolescentes de 2 a 18 años con TEA. La Guía de trámites indica que es para quienes no tienen obra social y viven en Lomas de Zamora.",
    necesito: ["DNI.", "CUD.", "Certificado de diagnóstico médico o informes escolares."],
    donde: [
      "Correo: serviciotea@lomasdezamora.gov.ar",
      "Teléfono: 4283-6239, de lunes a viernes de 8 a 16 hs.",
      "A la entrevista de admisión va el adulto con el niño o la niña.",
    ],
    fuente: { texto: "Municipio de Lomas de Zamora", url: `${M}/gestion/agencia-de-personas-con-discapacidad` },
  },
  {
    id: "taller", titulo: "Taller Protegido de Producción", palabras: "taller protegido produccion trabajo discapacidad intelectual motriz peculio",
    que: "Un espacio para desarrollar habilidades sociales y laborales. Ofrece desayuno y almuerzo, un equipo de psicólogos, trabajadores sociales, fonoaudiólogos, terapistas ocupacionales y músico-terapeutas, un profesor de educación física, facilidades para usar el transporte público, seguro de riesgo de trabajo y un pago mensual (“peculio”) por la producción.",
    quien: "Personas de 18 a 65 años (en edad laboral o egresadas de educación especial) con discapacidad mental y/o física. (La Guía de trámites dice desde los 14 años: confirmalo por teléfono.)",
    necesito: ["DNI.", "CUD.", "Diagnóstico médico."],
    donde: [
      "Se pide una entrevista de pre-admisión en el IMDIPAM, Av. Frías 1115.",
      "Después de la entrevista hay un período de prueba de tres meses, y luego se decide el ingreso. Si no se ingresa, la familia recibe orientación.",
      "Consultas: inclusion.discapacidad@lomasdezamora.gov.ar",
    ],
    fuente: { texto: "Municipio de Lomas de Zamora", url: `${M}/gestion/agencia-de-personas-con-discapacidad` },
  },
  {
    id: "pension", titulo: "Pensión no contributiva", palabras: "pension no contributiva invalidez anses discapacidad",
    que: "Es una pensión nacional por invalidez para quien tiene una discapacidad que le impide trabajar. El Municipio asesora y acompaña el trámite; la pensión la otorga ANSES.",
    quien: "Personas con una discapacidad que impide desarrollar una actividad laboral. Las condiciones las define ANSES: consultalas allá o en el IMDIPAM.",
    necesito: [
      "DNI.",
      "Documentación médica (la que te indiquen en el IMDIPAM o en ANSES).",
      "Clave de la Seguridad Social para ingresar a Mi ANSES (si no la tenés, se pide por internet o en persona).",
    ],
    donde: [
      "Primero se inicia en Mi ANSES, en “Solicitud de prestación”. El sistema te da un número de expediente.",
      "Con ese número, se sigue el trámite en el Municipio: IMDIPAM, Av. Frías 1115, de lunes a viernes de 8:30 a 15:30 hs.",
    ],
    enlaces: [{ texto: "Pensiones por discapacidad (Gobierno nacional)", url: "https://www.argentina.gob.ar/salud/senadis/pensiones-informacion-y-tramites" }],
    fuente: { texto: "Guía de trámites del Municipio", url: "https://ldz.eregulations.org/procedure/463/441?l=es" },
  },
];

export const NACIONAL = {
  nombre: "Secretaría Nacional de Discapacidad (Ministerio de Salud de la Nación, antes Agencia Nacional de Discapacidad)",
  telefono: "0800-555-3472",
  direccion: "Dragones 2201, Ciudad de Buenos Aires",
  aviso: "Ni el Ministerio de Salud ni la Secretaría se contactan por WhatsApp con solicitantes. Nunca des datos personales por WhatsApp. Ante una estafa, denunciá en la línea 134.",
  enlaces: [
    { texto: "Cómo obtener el CUD (Gobierno nacional)", url: "https://www.argentina.gob.ar/servicio/como-obtener-el-certificado-unico-de-discapacidad-cud" },
    { texto: "Secretaría Nacional de Discapacidad", url: "https://www.argentina.gob.ar/discapacidad" },
    { texto: "Pensiones por discapacidad", url: "https://www.argentina.gob.ar/salud/senadis/pensiones-informacion-y-tramites" },
    { texto: "Cartilla de derechos de las personas con discapacidad", url: "https://www.argentina.gob.ar/andis/cartilla-de-derechos-para-personas-con-discapacidad" },
  ] as Enlace[],
};
