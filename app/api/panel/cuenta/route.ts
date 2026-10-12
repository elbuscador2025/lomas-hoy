import { esAdmin, claveAdminOk, cambiarClaveAdmin } from "@/lib/cuentas";
import { claveValida } from "@/lib/municipio";

// Cambiar mi contraseña: la actual y la nueva dos veces.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const { actual, nueva, repetir } = await req.json().catch(() => ({}));
  if (typeof actual !== "string" || !(await claveAdminOk(actual))) return Response.json({ ok: false, error: "La contraseña actual no es correcta." }, { status: 400 });
  if (!claveValida(nueva)) return Response.json({ ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  if (nueva !== repetir) return Response.json({ ok: false, error: "Las dos contraseñas nuevas no coinciden." }, { status: 400 });
  await cambiarClaveAdmin(nueva);
  return Response.json({ ok: true });
}
