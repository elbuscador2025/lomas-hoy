// Escuelas y estudios: lo que comparten el servidor, el panel y la pantalla de los vecinos. Solo fuentes oficiales: lo que no figura se muestra como "Consultar".
import type { Escuela, Nivel } from "@/lib/escuelas-padron";
export type { Escuela, Nivel };

export const NIVELES: Nivel[] = ["Inicial", "Primaria", "Secundaria", "Técnica", "Especial", "Adultos", "Terciario"];
export type EscuelaVista = Escuela & { manual?: boolean; desactivada?: boolean; editada?: boolean };

// Recuadro "Inscripciones 2027": lo edito desde el panel. Si "fechas" está vacío se muestra "Todavía no se publicaron las fechas 2027".
export type Inscripciones = {
  fechas: string; resumen: string; detalle: string; modalidad: string; papeles: string[]; nota: string; enlaces: { titulo: string; url: string }[]; actualizado: string;
};
export const INSCRIPCIONES_POR_DEFECTO: Inscripciones = {
  fechas: "",
  resumen: "Todavía no se publicaron las fechas 2027.",
  detalle: "Escuelas estatales de la Provincia (jardín, primaria y secundaria). Cuando se publiquen, van a estar en el sitio oficial de la Dirección General de Cultura y Educación (abc.gob.ar), en el calendario escolar.",
  modalidad: "En la escuela, en persona: la propia escuela informa las fechas y los pasos de la inscripción.",
  papeles: [
    "DNI del chico o la chica y de quien lo inscribe. Si no tiene DNI igual se lo puede inscribir: sirve la libreta sanitaria con los datos de nacimiento.",
    "Constancia de vacunación vigente.",
    "Si viene de otra escuela: constancia o pase de los estudios anteriores.",
    "Completar la ficha de inscripción (los datos son declaración jurada).",
  ],
  nota: "Son los requisitos generales de la Dirección General de Cultura y Educación de la Provincia. Confirmalos en la escuela, que puede pedir otras constancias.",
  enlaces: [
    { titulo: "Calendario escolar (sitio oficial)", url: "https://abc.gob.ar/calendario_escolar" },
    { titulo: "Dirección General de Cultura y Educación", url: "https://abc.gob.ar/" },
  ],
  actualizado: "2026-11-16",
};

export type DatosEscuelas = { inscripciones: Inscripciones; escuelas: Escuela[]; actualizado: string | null; anio: string | null };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const buscarTexto = (e: Escuela, q: string) => { const n = normalizar(q).trim(); return !n || normalizar(`${e.nombre} ${e.direccion} ${e.barrio}`).includes(n); };

// 01142837587 → 011 4283-7587 (si no tiene la forma conocida se muestra tal cual)
export function telefonoBonito(d: string) {
  const t = d.replace(/\D/g, "");
  if (/^011\d{8}$/.test(t)) return `011 ${t.slice(3, 7)}-${t.slice(7)}`;
  if (/^0\d{9,10}$/.test(t)) return t.replace(/^(0\d{3,4})(\d{6})$/, "$1 $2");
  return d;
}
export const mapaEscuela = (e: Escuela) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${e.nombre}, ${e.direccion}, ${e.barrio}, Buenos Aires, Argentina`)}`;
