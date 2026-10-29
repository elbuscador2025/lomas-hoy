import { iniciarSesion, claveValida, ipDe } from "@/lib/cuentas";
import { invitacionVigente, registrar, limpio } from "@/lib/merenderos";
import { redis } from "@/lib/servidor";

// ¿Sirve todavía esta invitación? (para mostrar el formulario o el cartel de "ya se usó")
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("i") ?? "";
  return Response.json({ ok: await invitacionVigente(token).catch(() => false) }, { headers: { "Cache-Control": "no-store" } });
}

// Registro de un merendero: solo con una invitación que sirve una única vez. Al terminar queda con la sesión iniciada.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const ip = ipDe(req);
  const [n] = await redis([["INCR", `mer:reg:${ip}`], ["EXPIRE", `mer:reg:${ip}`, 3600]]);
  if (Number(n) > 15) return Response.json({ ok: false, error: "Demasiados intentos. Probá más tarde." }, { status: 429 });
  const d = { nombre: limpio(c.nombre, 60), responsable: limpio(c.responsable, 60), direccion: limpio(c.direccion, 140), correo: limpio(c.correo, 80), clave: String(c.clave ?? "") };
  if (d.nombre.length < 3) return Response.json({ ok: false, error: "Escribí el nombre del merendero." }, { status: 400 });
  if (d.responsable.length < 2) return Response.json({ ok: false, error: "Escribí el nombre de la responsable." }, { status: 400 });
  if (d.direccion.length < 3) return Response.json({ ok: false, error: "Escribí la dirección donde se entrega la comida." }, { status: 400 });
  if (!claveValida(d.clave)) return Response.json({ ok: false, error: "La contraseña tiene que tener al menos 8 caracteres." }, { status: 400 });
  try {
    const r = await registrar(String(c.token ?? ""), d);
    if ("error" in r) return Response.json({ ok: false, error: r.error }, { status: 400 });
    const cookie = await iniciarSesion({ tipo: "merendero", id: r.id });
    return Response.json({ ok: true, destino: "/merendero" }, { headers: { "Set-Cookie": cookie } });
  } catch {
    return Response.json({ ok: false, error: "No se pudo completar el registro. Probá de nuevo." }, { status: 500 });
  }
}
