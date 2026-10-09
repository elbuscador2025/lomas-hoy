import { ingresar, ipDe, usuarioValido } from "@/lib/municipio";

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { usuario, clave } = await req.json().catch(() => ({}));
  const nombre = typeof usuario === "string" ? usuario.trim().toLowerCase() : "";
  if (typeof clave !== "string" || clave.length > 200 || !usuarioValido(nombre)) {
    return Response.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }
  const r = await ingresar(nombre, clave, ipDe(req));
  if ("error" in r) {
    return r.error === "bloqueado"
      ? Response.json({ ok: false, error: "Demasiados intentos. Probá de nuevo en 15 minutos." }, { status: 429 })
      : Response.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `muni=${r.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${r.maxAge}` },
  });
}
