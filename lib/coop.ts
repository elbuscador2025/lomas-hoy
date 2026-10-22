// COOP: el lugar del barrio al que se llama por luminarias, poda, árboles y arreglos.
// Los datos salen de la página oficial del Municipio ("Centros de Gestión del Municipio") y se pueden corregir desde mi panel.
export type Coop = { id: string; barrio: string; direccion: string; horario: string; telefono: string; whatsapp: string };
export const FUENTE_COOP = "https://formularios.lomasdezamora.gov.ar/CentrosDeGestionDelMunicipio.aspx";
const H = "Lunes a Viernes de 8 a 16 hs";
const c = (id: string, barrio: string, direccion: string, whatsapp: string): Coop => ({ id, barrio, direccion, horario: H, telefono: "", whatsapp });

// El Municipio no publica teléfono fijo de los centros: solo WhatsApp. No se inventa ninguno.
export const COOP_OFICIALES: Coop[] = [
  c("albertina", "Albertina", "Bayona 70", "11-6044-0321"),
  c("banfield", "Banfield", "Rincón 565", "11-6053-9672"),
  c("centenario", "Centenario", "Martín Rodríguez 430", "11-5565-7089"),
  c("fiorito", "Fiorito", "Campana, entre Larrazábal y Murature", "11-6052-2149"),
  c("ingeniero-budge", "Ingeniero Budge", "Campana 1780, esquina Guaminí", "11-5565-7083"),
  c("lamadrid", "Villa Lamadrid", "Isaac Newton 4171", "11-5565-7081"),
  c("llavallol", "Llavallol", "Antártida Argentina 1556", "11-6048-9980"),
  c("lomas", "Lomas", "Las Heras 2299", "11-5565-7087"),
  c("parque-baron", "Parque Barón", "Juan XXIII, esquina Iparraguirre", "11-5565-7084"),
  c("san-jose", "San José", "Caaguazú 500 y Anchoris", "11-5565-7080"),
  c("santa-catalina", "Santa Catalina", "Diagonal 61 n° 1640, entre Santa Fe y Roca", "11-5565-7088"),
  c("santa-marta", "Santa Marta", "Voltaire 1552", "11-6053-9651"),
  c("temperley", "Temperley", "Av. Eva Perón 1732", "11-6044-0219"),
  c("turdera", "Turdera", "H. Yrigoyen 11.530", "11-5565-7091"),
];

export const ordenarCoop = (l: Coop[]) => [...l].sort((a, b) => a.barrio.localeCompare(b.barrio, "es"));
// "11-5565-7081" → número para wa.me (celular argentino)
export const waCoop = (n: string) => { const d = n.replace(/\D/g, ""); return d.startsWith("54") ? d : `549${d.replace(/^0/, "")}`; };
export const PALABRAS_COOP = "coop cop cooperativa luminaria luminarias alumbrado lampara poda pasto corte de pasto arbol arboles arbol caido baches zanja zanjas limpieza arreglos del barrio";
