import { entrar, ipDe } from "@/lib/cuentas";

// Una sola entrada para los dos paneles. Según quién entra, la respuesta dice a cuál mandarlo.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { correo, clave } = await req.json().catch(() => ({}));
  if (typeof clave !== "string" || clave.length > 200 || typeof correo !== "string" || correo.length > 120) {
    return Response.json({ ok: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
  }
  const r = await entrar(correo, clave, ipDe(req));
  if ("error" in r) {
    return r.error === "bloqueado"
      ? Response.json({ ok: false, error: "Demasiados intentos. Probá de nuevo en 15 minutos." }, { status: 429 })
      : Response.json({ ok: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
  }
  return Response.json({ ok: true, destino: r.destino }, { headers: { "Set-Cookie": r.cookie } });
}
