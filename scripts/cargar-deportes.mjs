// Primera carga de "Deportes para chicos". Uso: node --env-file=.env.local scripts/cargar-deportes.mjs
// Solo datos publicados por el propio club o por el Municipio en sus sitios oficiales (consultados en noviembre de 2026). Lo que no está publicado queda vacío ("Consultar" en la app).
// No pisa fichas que ya existen (para no borrar correcciones hechas desde el panel). La sección queda OCULTA hasta que se prenda el interruptor.
const { KV_REST_API_URL: URL_DB, KV_REST_API_TOKEN: TOKEN } = process.env;
const redis = async (cmds) => (await (await fetch(`${URL_DB}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) })).json()).map((x) => x.result);

const base = { direccion: "", barrio: "", edades: "", horarios: "", costo: "", telefono: "", whatsapp: "", inscripcion: "", fuente: "", fuenteUrl: "", foto: "", activa: true };
const MUNI = { fuente: "Agencia de Deportes Lomas (Municipio de Lomas de Zamora)", fuenteUrl: "https://lomasdezamora.gov.ar/gestion/agencia-deportes-lomas" };
const T = "https://www.temperley.org.ar";
const TEMP = { direccion: "Av. 9 de Julio 360", barrio: "Temperley", telefono: "011 4231-5076", fuente: "Sitio oficial del Club Atlético Temperley" };
const BANF = { direccion: "Sede Social: Vergara 1635", barrio: "Banfield", fuente: "Sitio oficial del Club Atlético Banfield", fuenteUrl: "https://clubabanfield.org/contacto/" };
const LAC = { direccion: "Sede Arenales", barrio: "Lomas de Zamora", telefono: "011 4292-9076", fuente: "Sitio oficial del Lomas Athletic Club" };
const INSC_MUNI = "Consultar en la Agencia de Deportes Lomas: 0800-666-6666 (Atención a la Comunidad) o Instagram @AgenciaDeportesLomas.";

const lista = [
  { id: "muni-escuelas", nombre: "Deportes Lomas · Escuelas deportivas gratuitas del Municipio", disciplinas: ["Fútbol y futsal", "Hockey", "Vóley", "Patín", "Atletismo", "Rugby", "Artes marciales", "Otras actividades"], ...MUNI,
    direccion: "Parque de Lomas (Molina Arrotea 2295) y otros parques del Municipio", barrio: "Parque Barón",
    edades: "Patín: 4 a 14 años · Rugby masculino: desde 6 · Escuelita de vóley: desde 6 · Hockey: desde 8 · Atletismo: desde 10 · Futsal masculino: 10 a 17 · Boxeo infanto-juvenil sin contacto: 6 a 14 · BMX: 6 a 12 · Ciclismo: desde 6 · Handball: 6 a 18 · Tenis de mesa: desde 8 · Triatlón: 6 a 18",
    horarios: "Consultar", costo: "gratis", telefono: "0800-666-6666",
    inscripcion: "Es online, con un formulario en la web del Municipio. Hay que ser vecino de Lomas de Zamora y mandar (foto o PDF) el apto físico del año, hecho por un médico clínico, y el DNI de frente y dorso. Después llega por mail el Carnet Deportivo Digital. Los cupos son limitados. Consultas: Atención a la Comunidad 0800-666-6666 o Instagram @AgenciaDeportesLomas." },
  { id: "muni-rossi", nombre: "Natatorio Jorge Rossi (Municipio)", disciplinas: ["Natación"], ...MUNI, direccion: "Molina Arrotea 2295", barrio: "Parque Barón",
    edades: "Escuelita de natación: 6 a 13 años · Matronatación: 3 a 24 meses · TEA: 6 a 13 años", horarios: "Consultar", costo: "gratis", telefono: "0800-666-6666", inscripcion: INSC_MUNI },
  { id: "muni-sember", nombre: "Natatorio Guyo Sember (Municipio)", disciplinas: ["Natación"], ...MUNI, direccion: "Av. Alsina 1865", barrio: "Lomas de Zamora",
    edades: "Escuelita de natación: 6 a 13 años", horarios: "Consultar", costo: "gratis", telefono: "0800-666-6666", inscripcion: INSC_MUNI },

  { id: "temperley-baby", nombre: "Club Atlético Temperley · Baby fútbol", disciplinas: ["Fútbol y futsal"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/baby-futbol`,
    edades: "Desde los 4 años (categorías 2017 a 2020)", horarios: "Consultar", costo: "gratis", inscripcion: "El club invita a sumarse de manera gratuita. Escuelita y recreativo, y competitivo. Contacto: Instagram @babyfutbol_temperley · Facebook Temperley Babyfutbol." },
  { id: "temperley-futsal", nombre: "Club Atlético Temperley · Futsal", disciplinas: ["Fútbol y futsal"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/futsal`,
    edades: "Promocionales: hasta 10 años · Juveniles: 10 a 18 años", horarios: "Promocionales: 2 entrenamientos por semana. Juveniles: 3 por semana. Lugar: gimnasios y playón del club.", inscripcion: "Consultar por mail (futsaltemperley@gmail.com) o por redes (@futsaltemperley)." },
  { id: "temperley-basquet", nombre: "Club Atlético Temperley · Básquet", disciplinas: ["Básquet"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/basquet`,
    edades: "Desde los 5 años (femenino y masculino)", horarios: "Femenino: martes y jueves (U7/9 de 17:45 a 18:45). Masculino: lunes a viernes (U7/U9: martes y jueves de 18 a 19 y miércoles y viernes de 17:30 a 18:30). Lugar: Microestadio Alejandro “Palo” Metz. Otras categorías: ver la web del club.", inscripcion: "Contacto por Instagram del club (ver la web)." },
  { id: "temperley-hockey", nombre: "Club Atlético Temperley · Hockey", disciplinas: ["Hockey"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/hockey`,
    edades: "Desde los 5 años", horarios: "Lunes a jueves de 17:30 a 22:30. Lugar: Club Temperley, Club Camioneros y Parque de Lomas.", inscripcion: "Contacto: Instagram @temperley_hockey." },
  { id: "temperley-natacion", nombre: "Club Atlético Temperley · Natación", disciplinas: ["Natación"], ...TEMP, fuenteUrl: `${T}/el-club/natacion`, costo: "pago",
    telefono: "011 4231-0112", whatsapp: "+54 9 11 5990-8877", edades: "Niños desde los 6 meses y adultos", horarios: "Consultar. Administración: lunes a viernes de 7 a 21 hs y sábados de 8 a 14 hs.",
    inscripcion: "Hay descuento para socios con la cuota al día. Los aranceles que publica el club son de septiembre de 2024: consultá los valores de hoy. Instagram @celenatacion." },
  { id: "temperley-voley", nombre: "Club Atlético Temperley · Vóley", disciplinas: ["Vóley"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/voley`, whatsapp: "+54 9 11 3577-0509",
    edades: "Pre mini vóley: 4 a 7 años · Mini vóley: 7 a 10 años · Formativo y recreativo: desde 14 años · Competitivo: Sub 12 a mayores", horarios: "Pre mini vóley: martes y jueves de 17 a 18 · Mini vóley: martes y jueves de 17 a 18:30 · Sub 12: martes y jueves de 18 a 20",
    inscripcion: "Consultar horarios y disponibilidad por WhatsApp o Instagram @temperley.voley." },
  { id: "temperley-patin", nombre: "Club Atlético Temperley · Patín artístico", disciplinas: ["Patín"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/patin-artistico`, telefono: "11 7602-5032",
    edades: "Desde los 4 años", horarios: "Inicial: lunes de 16:30 a 18 y viernes de 16:30 a 17:30. Intermedio: lunes y miércoles de 16 a 17:30 y viernes de 16 a 17. Lugar: gimnasio del club.", inscripcion: "El club publica clase de prueba gratis. Contacto: Instagram @patintemperleyoficial." },
  { id: "temperley-taekwondo", nombre: "Club Atlético Temperley · Taekwondo", disciplinas: ["Taekwondo"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/taekwondo`,
    edades: "Desde los 4 años", horarios: "Taekwondo Kids (desde 4 años): martes y jueves de 18 a 19. Desde 10 años: martes y jueves de 19 a 20. Lugar: salón debajo de la platea.", inscripcion: "Contacto: Instagram @Taekwondoclubatleticotemperley." },
  { id: "temperley-karate", nombre: "Club Atlético Temperley · Karate Shotokan", disciplinas: ["Artes marciales"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/karate`,
    edades: "Infantiles de 3 a 11 años (también juveniles y adultos)", horarios: "Infantiles: martes y jueves de 20 a 21. Lugar: salón bajo la platea.", inscripcion: "La primera clase es gratuita, según publica el club." },
  { id: "temperley-atletismo", nombre: "Club Atlético Temperley · Escuela de atletismo", disciplinas: ["Atletismo"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/atletismo`,
    edades: "Escuela: 6 a 11 años · Técnica y aprendizaje: 12 a 17 años", horarios: "Escuela: martes de 18 a 19 en el club, jueves de 18 a 19 en el Parque Finky y sábados desde las 10 en el Parque de Lomas.", inscripcion: "Mail: atletismotemperley1912@gmail.com · Instagram @atletismotemperley1912." },
  { id: "temperley-handball", nombre: "Club Atlético Temperley · Handball", disciplinas: ["Otras actividades"], ...TEMP, fuenteUrl: `${T}/deportes-amateurs/handball`, whatsapp: "+54 9 11 7113-8933",
    edades: "Desde los 6 años (femenino y masculino)", horarios: "Minis y Pre-Minis: lunes y jueves de 17:30 a 18:30. Infantiles: martes y jueves de 17:30 a 18:30.", inscripcion: "Contacto directo por WhatsApp. Instagram @handballtemperleyoficial." },

  { id: "banfield-futbol", nombre: "Club Atlético Banfield · Escuelas de fútbol", disciplinas: ["Fútbol y futsal"], ...BANF, whatsapp: "+54 11 5643 7777",
    inscripcion: "El club publica escuelas de fútbol en la Sede y en el Predio. Edades, horarios y valores: consultar en la Sede Social o escribir a deportes@clubabanfield.com.ar." },
  { id: "banfield-deportes", nombre: "Club Atlético Banfield · Hockey, vóley, patín y más", disciplinas: ["Hockey", "Vóley", "Patín", "Otras actividades"], ...BANF, whatsapp: "+54 11 5643 7777",
    inscripcion: "El club publica hockey, vóley, patín, handball, gimnasia artística y tenis. Edades, horarios y valores: consultar en la Sede Social o escribir a deportes@clubabanfield.com.ar." },

  { id: "lomasac-hockey", nombre: "Lomas Athletic Club · Hockey", disciplinas: ["Hockey"], ...LAC, fuenteUrl: "https://lomasac.com.ar/hockey-categorias/",
    edades: "Categorías 10ma, 9na, 8va, 7ma, 6ta y 5ta, entre otras", inscripcion: "Consultar en la Secretaría de la Sede Arenales: lunes a viernes de 9 a 17 hs." },
  { id: "lomasac-rugby", nombre: "Lomas Athletic Club · Rugby infantil", disciplinas: ["Rugby"], ...LAC, fuenteUrl: "https://lomasac.com.ar/rugby-infantiles/",
    inscripcion: "El club publica una sección de rugby infantil en su web (Rugby › Infantiles). Consultar en la Secretaría de la Sede Arenales: lunes a viernes de 9 a 17 hs." },

  { id: "losandes-deportes", nombre: "Club Atlético Los Andes · Básquet, hockey, natación y vóley", disciplinas: ["Básquet", "Hockey", "Natación", "Vóley"], ...base, barrio: "", fuente: "Sitio oficial del Club Atlético Los Andes", fuenteUrl: "https://losandesoficial.com/",
    telefono: "11 3793-7700", inscripcion: "El club publica mini básquet, hockey, natación, básquet y vóley. El número es el contacto que el club publica para mini básquet. Edades, horarios y valores: consultar." },
];

const [existentes] = await redis([["HKEYS", "deportes"]]);
const [d] = await redis([["GET", "deportes:disc"]]);
let nuevos = 0;
for (const i of lista) {
  if (existentes.includes(i.id)) continue;
  await redis([["HSET", "deportes", i.id, JSON.stringify({ ...base, ...i, actualizado: new Date().toISOString() })]]);
  nuevos++;
}
if (!d) await redis([["SET", "deportes:disc", JSON.stringify(["Fútbol y futsal", "Básquet", "Natación", "Hockey", "Vóley", "Patín", "Taekwondo", "Artes marciales", "Atletismo", "Rugby", "Otras actividades"])]]);
await redis([["SETNX", "deportes:visible", "0"]]);
console.log(`Cargadas: ${nuevos} de ${lista.length}. La sección sigue oculta para los vecinos.`);
