// Mascotas perdidas: tipos y reglas que usan el servidor y la pantalla (nada secreto).
export type Estado = "perdido" | "encontrado";
export type Especie = "perro" | "gato" | "otro";
export const ESPECIES: { id: Especie; titulo: string }[] = [
  { id: "perro", titulo: "Perro" }, { id: "gato", titulo: "Gato" }, { id: "otro", titulo: "Otro" },
];

// Lo que ve la gente (sin datos internos)
export type MascotaPublica = {
  id: string; estado: Estado; especie: Especie; barrio: string; descripcion: string;
  whatsapp: string; // con código de país, listo para wa.me (ej. 5491155555555)
  foto: string; // dirección de la foto
  creado: string; aprobada: string; vence: string;
};

// WhatsApp argentino: "11 5555-5555", "011 15 5555-5555", "+54 9 11 5555-5555"... → "5491155555555". Si no se entiende, null.
export function normalizarWhatsapp(entrada: string): string | null {
  let n = entrada.replace(/\D/g, "");
  if (n.startsWith("549")) n = n.slice(3);
  else if (n.startsWith("54")) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  // quita el 15 que va después del código de área (área de 2, 3 o 4 dígitos)
  const m = n.length === 12 ? /^(\d{2})15(\d{8})$/.exec(n) ?? /^(\d{3})15(\d{7})$/.exec(n) ?? /^(\d{4})15(\d{6})$/.exec(n) : null;
  if (m) n = m[1] + m[2];
  return /^\d{10}$/.test(n) ? `549${n}` : null;
}

export const vigenteMascota = (m: { vence: string }, ahora = Date.now()) => new Date(m.vence).getTime() > ahora;
export const esNueva = (m: { aprobada: string }, dias: number, ahora = Date.now()) => ahora - new Date(m.aprobada).getTime() <= dias * 86400_000;
