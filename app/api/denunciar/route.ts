import { after } from "next/server";
import { denunciar } from "@/lib/moderacion";
import { redis } from "@/lib/servidor";

// Denunciar una publicación de Trueque o Trabajo para mayores de 50 años. Con 3 denuncias de celulares distintos se oculta hasta que yo la revise.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const seccion = c.seccion === "trabajo" ? "trabajo" : c.seccion === "trueque" ? "trueque" : c.seccion === "pasa" ? "pasa" : null;
  const id = String(c.id ?? "").slice(0, 20), dispositivo = String(c.dispositivo ?? "");
  if (!seccion || !id || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
  const [j] = await redis([["HGET", seccion, id]]);
  if (!j) return Response.json({ ok: false }, { status: 404 });
  const r = JSON.parse(j as string) as { ofrezco?: string; texto?: string }; // en "pasa" el aviso se llama texto
  after(() => denunciar(seccion, id, String(c.motivo ?? ""), dispositivo, r.ofrezco ?? r.texto ?? "").catch((e) => console.error("denuncia", e)));
  return Response.json({ ok: true });
}
