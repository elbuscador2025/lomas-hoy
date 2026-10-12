import { redis } from "@/lib/servidor";
import { hashear, claveValida, leerUsuario } from "@/lib/municipio";
import { consumirEnlace, enlaceVigente, iniciarSesion, cerrarSesionesDe } from "@/lib/cuentas";

// Elegir una contraseña nueva con el enlace que mandó el administrador (una sola vez, vence a las 24 horas).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { token } = await params;
  if (!(await enlaceVigente("reset", token))) return Response.json({ ok: false, vencido: true }, { status: 410 });
  const c = await req.json().catch(() => ({}));
  if (!claveValida(c.clave)) return Response.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  if (c.clave !== c.repetir) return Response.json({ ok: false, error: "Las dos contraseñas no coinciden." }, { status: 400 });

  const datos = await consumirEnlace<{ usuario: string }>("reset", token);
  const u = datos ? await leerUsuario(datos.usuario) : null;
  if (!u || !u.activo) return Response.json({ ok: false, vencido: true }, { status: 410 });
  await redis([["HSET", "muni:usuarios", u.usuario, JSON.stringify({ ...u, ...(await hashear(c.clave)), ultimoIngreso: new Date().toISOString() })]]);
  await cerrarSesionesDe("muni", u.usuario); // las sesiones viejas dejan de valer
  return Response.json({ ok: true, destino: "/municipio" }, { headers: { "Set-Cookie": await iniciarSesion({ tipo: "muni", id: u.usuario }) } });
}
