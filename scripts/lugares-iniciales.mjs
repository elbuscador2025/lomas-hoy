// Lista inicial de lugares. Solo datos copiados de fuentes oficiales; lo que no estaba confirmado quedó vacío.
// Categorías: veterinarias | guardias | salitas | comisarias | bomberos | servicios
const MUNI = { fuente: "Municipio de Lomas de Zamora", fuenteUrl: "https://lomasdezamora.gov.ar" };
const MUNI_HOSP = {
  fuente: "Municipio de Lomas de Zamora – Listado de hospitales 2024",
  fuenteUrl: "https://lomasdezamora.gov.ar/pdf/eje-salud/Listado-de-Hospitales-2024.pdf",
};
const MUNI_ANIMALES = {
  fuente: "Municipio de Lomas de Zamora – Hospital de animales",
  fuenteUrl: "https://lomasdezamora.gov.ar/hospital-animales",
};
const GBA_HOSP = {
  fuente: "Ministerio de Salud de la Provincia de Buenos Aires – Hospitales",
  fuenteUrl: "https://www.gba.gob.ar/saludprovincia/hospitales",
};
const GUIA = {
  fuente: "Ministerio de Salud de la Provincia – Guía de Servicios de Salud de Lomas de Zamora (abril 2022)",
  fuenteUrl:
    "https://www.ms.gba.gov.ar/sitios/programaredes/wp-content/uploads/sites/236/2023/12/LOMAS-DE-ZAMORA-Guia-de-Servicios-de-Salud_actualizado-a-abril-2022.pdf",
};
const BVLZ = { fuente: "Bomberos Voluntarios de Lomas de Zamora", fuenteUrl: "https://www.bvlz.org.ar/destacamentos/" };

const lugar = (categoria, nombre, direccion, localidad, telefonos, horario, fuente) => ({
  categoria, nombre, direccion, localidad, telefonos, horario, ...fuente,
});
const L = "Lun a vie";
// Salita (CAPS) de la guía provincial. Los teléfonos de 8 dígitos son de Buenos Aires (011).
const caps = (nombre, direccion, localidad, tel, horario) =>
  lugar("salitas", `CAPS ${nombre}`, direccion, localidad, tel ? [tel.length === 9 ? `011 ${tel}` : tel] : [], horario, GUIA);

export const lugaresIniciales = [
  // --- Veterinarias (solo la municipal: no se confirmó ninguna con guardia 24 hs en fuente oficial) ---
  lugar("veterinarias", "Hospital de Animales (municipal)", "12 de Octubre 1100", "Villa Centenario", [],
    "Lun a vie 8 a 18 hs · Sáb, dom y feriados 9 a 12 hs", MUNI_ANIMALES),

  // --- Guardias médicas y hospitales ---
  lugar("guardias", "Hospital Gandulfo", "Balcarce 351", "Lomas de Zamora", ["011 4243-5555"], "", GBA_HOSP),
  lugar("guardias", "UPA 24 Lomas de Zamora", "Av. Presidente Perón (Camino Negro) y Recondo", "Lomas de Zamora",
    ["011 4267-3633"], "24 hs", GBA_HOSP),
  lugar("guardias", "Hospital Materno Infantil Dr. Oscar Alende", "Claudio de Alas 2502", "Ingeniero Budge", [], "", MUNI_HOSP),
  lugar("guardias", "Hospital Llavallol", "Doyhenard 296", "Llavallol", [], "", MUNI_HOSP),
  lugar("guardias", "Hospital de Diagnóstico Inmediato Banfield", "Cochabamba 922", "Banfield", [], "", MUNI_HOSP),
  lugar("guardias", "Hospital de Diagnóstico Inmediato Temperley", "Av. Hipólito Yrigoyen 10.001", "Temperley", [], "", MUNI_HOSP),

  // --- Salitas (centros de atención primaria) ---
  caps("Dr. Gregorio A. Alfaro", "Av. H. Yrigoyen 10.035", "Temperley Oeste", "4239-9689", `${L} 7 a 16 hs · Sáb 9 a 12 hs`),
  caps("25 de Mayo", "Germán Kurth 575 e/ Wilde y Padre Javier", "Llavallol Sur", "4298-7917", `${L} 7 a 18 hs`),
  caps("Bartolomé Mitre", "Lautaro 815", "Temperley Este", "4244-7664", `${L} 7 a 17 hs`),
  caps("Eva Perón", "Gral. Gaspar Núñez de Arce 553", "Villa Centenario", "4286-6631", `${L} 7 a 18 hs`),
  caps("Juan Manuel de Rosas", "Corsini e/ Correa y Cabo del Monte", "Santa Catalina", "4693-2087", `${L} 7 a 17 hs`),
  caps("Vicente López", "Vicente López 963", "Temperley Oeste", "4231-7016", `${L} 7 a 17 hs`),
  caps("Villa Albertina", "Bustos 2180 e/ Arzulea y Garnica", "Villa Albertina", "4285-5326", `${L} 7 a 17 hs`),
  caps("Barrio Obrero", "107 y 4, Manzana 1, Casa 1-2", "Santa Catalina", "11-5404-9950", `${L} 7 a 16 hs · Sáb 8 a 13 hs`),
  caps("Enrique Finochietto", "Ginebra y Campoamor", "Villa Albertina", "4285-7016", `${L} 7 a 17 hs · Guardia 24 hs`),
  caps("Alicia Moreau de Justo", "Cnel. Lynch y N. Huapí", "San José Este", "4260-0128", "Guardia 24 hs"),
  caps("San José", "Los Eucaliptos 47", "San José Oeste", "4264-2100", `${L} 6:30 a 17:30 hs`),
  caps("Dr. Federico E. Payas", "Doyhenard 1240", "Llavallol Sur", "4214-2348", `${L} 7 a 18 hs`),
  caps("Temperley Oeste", "Gral. Paz 1405 y San Roque", "Temperley Oeste", "4231-1324", `${L} 8 a 18 hs`),
  caps("Alberto Fonrouge", "Eduardo Caraza 1848 y Camineto", "Villa Centenario", "4242-1615", "Guardia 24 hs"),
  caps("2 de Abril", "Soldado Zelarrayán y Homero Manzi", "Santa Catalina", "4693-6172", `${L} 8 a 16 hs`),
  caps("Dr. Ramón Carrillo", "Darwin 1835", "Villa Fiorito", "4286-6629", `${L} 7:30 a 18 hs`),
  caps("Gral. Lamadrid", "Metán 510", "General Lamadrid", "", "Guardia 24 hs"), // teléfono repetido en la guía: no se carga
  caps("La Salud como Derecho", "Pasaje Eva Perón 2420 e/ Pío Baroja y Baradero", "Villa Fiorito", "4286-8867", `${L} 8 a 17 hs`),
  caps("Prosperidad", "Araguaya 937 e/ Gral. Paz y Avellaneda", "Llavallol Norte", "4298-9011", `${L} 7:30 a 17 hs`),
  caps("Provincias Unidas", "París 1947", "Villa Albertina", "4285-5329", `${L} 8 a 17 hs`),
  caps("La Cortada", "París 80", "Villa Centenario", "4286-3941", `${L} 7:30 a 18 hs`),
  caps("Las Casuarinas", "Las Casuarinas 3471 y Monroe", "San José Este", "4260-0103", `${L} 7 a 17 hs`),
  caps("Llavallol", "Tordillo y Mitre", "Llavallol", "4231-0955", "Guardia 24 hs"),
  caps("Dr. Luis Agote", "Ginebra 432", "Villa Centenario", "4286-6633", `${L} 7 a 17 hs · Sáb 7 a 13 hs`),
  caps("Mariano Moreno", "Timoteo Gordillo 1500 y Juan D. Perón", "Santa Marta", "4285-5320", `${L} 8 a 17 hs`),
  caps("Ingeniero Budge", "Quesada y Campoamor", "Ingeniero Budge", "4285-5316", `${L} 7 a 16 hs`),
  caps("Nuevo Fiorito", "Larrazábal e/ Camarero y Fiorentino", "Villa Fiorito", "4267-6307", `${L} 8 a 18 hs · Guardia 24 hs`),
  caps("Santa Marta", "Voltaire 1650 y Copihue", "Santa Marta", "4285-6493", "Guardia 24 hs"),
  caps("El Faro", "José Ingenieros 1659", "Santa Marta", "4285-5323", `${L} 8 a 17 hs`),
  caps("Villa Gral. San Martín", "Anchoris y Moctezuma", "San José Este", "4260-5623", `${L} 6 a 17 hs · Sáb 7 a 12 hs`),
  caps("19 de Diciembre", "Bolonia y Manuel de Lavarden", "Villa Albertina", "4285-4607", `${L} 7 a 18 hs`),
  caps("Villa Independencia", "Bustos 773", "Parque Barón", "4283-0343", "Guardia 24 hs"),
  caps("Dr. Ángel A. Tullio", "Dr. Indalecio Gómez 702", "Temperley Este", "4239-9663", `${L} 7 a 19 hs`),
  caps("José M. Oliveras", "Carhué 850", "San José", "4264-8377", "Guardia 24 hs"),
  caps("Néstor Kirchner", "Martín Rodríguez 1861", "Villa Albertina", "4273-0294", `${L} 8 a 17 hs · Sáb 8 a 14 hs`),
  caps("Villa Urbana", "Fallières 2328 e/ Baradero y Campana", "Villa Fiorito", "4267-3873", `${L} 7 a 17 hs · Sáb 8 a 13 hs`),
  caps("Solidaridad", "Cap. Rubén Martel 911", "Santa Catalina", "4693-4400", `${L} 7 a 17 hs`),
  caps("Santa Rosa", "Monteros 37", "San José Este", "4270-6895", `${L} 8 a 16 hs`),
  caps("Santa Catalina", "Diagonal 61 e/ Silva y Formosa", "Santa Catalina", "4693-2181", `${L} 7 a 18 hs`),

  // --- Comisarías: no se pudo confirmar ninguna en una fuente oficial. Solo la línea de emergencias. ---
  lugar("comisarias", "Policía – Emergencias", "", "", ["911"], "24 hs", MUNI),
  lugar("comisarias", "Seguridad Lomas (municipio)", "", "", ["147"], "", MUNI),

  // --- Bomberos ---
  lugar("bomberos", "Bomberos – Emergencias", "", "", ["100"], "24 hs", MUNI),
  lugar("bomberos", "Bomberos Voluntarios – Cuartel central", "Saavedra 46", "Lomas de Zamora", ["011 4243-2222"], "", BVLZ),
  lugar("bomberos", "Bomberos Voluntarios – Destacamento Banfield", "Pueyrredón 1557", "Banfield", ["011 4242-2222"], "", BVLZ),
  lugar("bomberos", "Bomberos Voluntarios – Destacamento Llavallol", "A. del Valle y Tacuarí", "Llavallol", ["011 4298-2222"], "", BVLZ),
  // El sitio oficial da dos teléfonos distintos para San José: se deja vacío.
  lugar("bomberos", "Bomberos Voluntarios – Destacamento San José", "Av. Eva Perón 3165", "San José", [], "", BVLZ),

  // --- Servicios y reclamos (ex "Teléfonos útiles") ---
  lugar("servicios", "Emergencias médicas (SAME)", "", "", ["107"], "24 hs", MUNI),
  lugar("servicios", "Defensa Civil", "", "", ["103"], "", MUNI),
  lugar("servicios", "Violencia de género", "", "", ["144"], "", MUNI),
  lugar("servicios", "Municipio – Atención a la Comunidad", "", "", ["0800 666 6666", "0800 122 5662"], "", MUNI),
  lugar("servicios", "Edesur – Consultas y reclamos", "", "", ["0810 222 0200"], "",
    { fuente: "Edesur", fuenteUrl: "https://www.edesur.com.ar/" }),
  lugar("servicios", "Edesur – Emergencias", "", "", ["0800 333 3787"], "",
    { fuente: "Edesur", fuenteUrl: "https://www.edesur.com.ar/" }),
  lugar("servicios", "AySA – Reclamos técnicos y emergencias", "", "", ["0800 321 2482"], "24 hs",
    { fuente: "AySA", fuenteUrl: "https://aysa.com.ar/usuarios/canales_atencion" }),
];
