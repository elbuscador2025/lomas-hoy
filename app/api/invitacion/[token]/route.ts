import { redis } from "@/lib/servidor";
import { hashear, claveValida, leerUsuario, type UsuarioMuni } from "@/lib/municipio";
import { consumirEnlace, enlaceVigente, iniciarSesion, normalizarCorreo, correoValido, correoAdmin } from "@/lib/cuentas";

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

// Registro con el enlace de invitación (sirve una sola vez, vence a los 7 días).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { token } = await params;
  if (!(await enlaceVigente("invitacion", token))) return Response.json({ ok: false, vencido: true }, { status: 410 });

  const c = await req.json().catch(() => ({}));
  const nombre = limpio(c.nombre, 60), area = limpio(c.area, 40), correo = normalizarCorreo(c.correo);
  if (nombre.length < 2) return Response.json({ ok: false, error: "Escribí tu nombre." }, { status: 400 });
  if (area.length < 2) return Response.json({ ok: false, error: "Escribí tu área (por ejemplo Deportes)." }, { status: 400 });
  if (!correoValido(correo)) return Response.json({ ok: false, error: "El correo no es válido." }, { status: 400 });
  if (!claveValida(c.clave)) return Response.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  if (c.clave !== c.repetir) return Response.json({ ok: false, error: "Las dos contraseñas no coinciden." }, { status: 400 });
  if (correo === correoAdmin() || (await leerUsuario(correo))) return Response.json({ ok: false, error: "Ese correo ya está registrado." }, { status: 409 });

  // Recién acá se gasta el enlace; si dos personas llegan a la vez, solo una lo consigue
  if (!(await consumirEnlace("invitacion", token))) return Response.json({ ok: false, vencido: true }, { status: 410 });
  const u: UsuarioMuni = {
    usuario: correo, correo, nombre, area, firma: `${nombre} · ${area}`, activo: true,
    alta: new Date().toISOString(), ultimoIngreso: new Date().toISOString(), ...(await hashear(c.clave)),
  };
  await redis([["HSET", "muni:usuarios", correo, JSON.stringify(u)]]);
  return Response.json({ ok: true, destino: "/municipio" }, { headers: { "Set-Cookie": await iniciarSesion({ tipo: "muni", id: correo }) } });
}
