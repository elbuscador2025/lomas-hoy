// Feriados nacionales y días no laborables, copiados del sitio oficial del Gobierno nacional:
// https://www.argentina.gob.ar/feriados (Jefatura de Gabinete de Ministros). Última lectura: 12/10/2026.
// El calendario de 2027 todavía no está publicado ahí (solo figura el 1/1/2027): cuando salga, se agrega acá.
// tipo: inamovible | trasladable | turistico (día no laborable con fines turísticos) | no_laborable | especial (de una provincia)
// "religioso" = día no laborable para quienes profesan esa religión (notas (a), (b) y (c) del sitio oficial): no genera aviso en la app.
export const FUENTE_FERIADOS = { fuente: "Argentina.gob.ar – Feriados nacionales", url: "https://www.argentina.gob.ar/feriados" };

export const feriados = [
  { fecha: "2026-01-01", tipo: "inamovible", motivo: "Año Nuevo" },
  { fecha: "2026-02-16", tipo: "inamovible", motivo: "Carnaval" },
  { fecha: "2026-02-17", tipo: "inamovible", motivo: "Carnaval" },
  { fecha: "2026-03-20", tipo: "no_laborable", religioso: true, motivo: "Fiesta de la Ruptura del Ayuno del Sagrado Mes de Ramadán" },
  { fecha: "2026-03-23", tipo: "turistico", motivo: "Día no laborable con fines turísticos" },
  { fecha: "2026-03-24", tipo: "inamovible", motivo: "Día Nacional de la Memoria por la Verdad y la Justicia" },
  { fecha: "2026-04-02", tipo: "inamovible", motivo: "Día del Veterano y de los Caídos en la Guerra de Malvinas" },
  { fecha: "2026-04-02", tipo: "no_laborable", motivo: "Jueves Santo" },
  { fecha: "2026-04-02", tipo: "no_laborable", religioso: true, motivo: "Primeros dos días de la Pascua Judía" },
  { fecha: "2026-04-03", tipo: "inamovible", motivo: "Viernes Santo" },
  { fecha: "2026-04-03", tipo: "no_laborable", religioso: true, motivo: "Primeros dos días de la Pascua Judía" },
  { fecha: "2026-04-08", tipo: "no_laborable", religioso: true, motivo: "Últimos dos días de la Pascua Judía" },
  { fecha: "2026-04-09", tipo: "no_laborable", religioso: true, motivo: "Últimos dos días de la Pascua Judía" },
  { fecha: "2026-04-24", tipo: "no_laborable", religioso: true, motivo: "Día de acción por la tolerancia y el respeto entre los pueblos" },
  { fecha: "2026-05-01", tipo: "inamovible", motivo: "Día del Trabajador" },
  { fecha: "2026-05-25", tipo: "inamovible", motivo: "Día de la Revolución de Mayo" },
  { fecha: "2026-05-27", tipo: "no_laborable", religioso: true, motivo: "Fiesta del Sacrificio" },
  { fecha: "2026-06-15", tipo: "trasladable", motivo: "Paso a la Inmortalidad del Gral. Don Martín Miguel de Güemes" },
  { fecha: "2026-06-17", tipo: "no_laborable", religioso: true, motivo: "Año Nuevo Islámico" },
  { fecha: "2026-06-20", tipo: "inamovible", motivo: "Paso a la Inmortalidad del Gral. Manuel Belgrano" },
  { fecha: "2026-07-09", tipo: "inamovible", motivo: "Día de la Independencia" },
  { fecha: "2026-07-10", tipo: "turistico", motivo: "Día no laborable con fines turísticos" },
  { fecha: "2026-08-17", tipo: "trasladable", motivo: "Paso a la Inmortalidad del Gral. José de San Martín" },
  { fecha: "2026-09-12", tipo: "no_laborable", religioso: true, motivo: "Año Nuevo Judío" },
  { fecha: "2026-09-13", tipo: "no_laborable", religioso: true, motivo: "Año Nuevo Judío" },
  { fecha: "2026-09-21", tipo: "no_laborable", religioso: true, motivo: "Día del Perdón" },
  { fecha: "2026-10-12", tipo: "trasladable", motivo: "Día de la Raza" }, // texto tal cual figura en el sitio oficial
  { fecha: "2026-11-09", tipo: "inamovible", motivo: "Visita de Su Santidad el Papa León XIV" },
  { fecha: "2026-11-10", tipo: "especial", otraZona: true, motivo: "Visita de Su Santidad el Papa León XIV (feriado en Córdoba y Ciudad Autónoma de Buenos Aires)" },
  { fecha: "2026-11-11", tipo: "especial", motivo: "Visita de Su Santidad el Papa León XIV (feriado en la Provincia de Buenos Aires)" },
  { fecha: "2026-11-23", tipo: "trasladable", motivo: "Día de la Soberanía Nacional" },
  { fecha: "2026-12-07", tipo: "turistico", motivo: "Día no laborable con fines turísticos" },
  { fecha: "2026-12-08", tipo: "inamovible", motivo: "Inmaculada Concepción de María" },
  { fecha: "2026-12-25", tipo: "inamovible", motivo: "Navidad" },
  { fecha: "2027-01-01", tipo: "inamovible", motivo: "Año Nuevo" },
];
