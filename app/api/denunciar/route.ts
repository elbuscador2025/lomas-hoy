import { config } from "@/lomas.config.mjs";
import { after } from "next/server";
import { denunciar } from "@/lib/moderacion";
import { denunciar as denunciarEmp } from "@/lib/emprendedores";
import { redis } from "@/lib/servidor";

// Denunciar una publicación de Trueque o Trabajo para mayores de 50 años. Con 3 denuncias de celulares distintos se oculta hasta que yo la revise.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  if (c.seccion === "emprendedores") { // publicaciones y comentarios de Emprendedores
    const id = String(c.id ?? "").slice(0, 20), cid = c.cid ? String(c.cid).slice(0, 20) : undefined, dispositivo = String(c.dispositivo ?? "");
    if (!config.secciones.emprendedores.activa) return Response.json({ ok: false }, { status: 404 });
    if (!id || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
    const hecho = await denunciarEmp(id, cid, String(c.motivo ?? ""), dispositivo).catch((e) => { console.error("denuncia", e); return false as const; });
    if (hecho) after(() => hecho.avisar().catch((e) => console.error("denuncia", e)));
    return Response.json({ ok: true });
  }
  const seccion = c.seccion === "trabajo" ? "trabajo" : c.seccion === "trueque" ? "trueque" : c.seccion === "pasa" ? "pasa" : null;
  const id = String(c.id ?? "").slice(0, 20), dispositivo = String(c.dispositivo ?? "");
  if (seccion === "pasa" && !config.secciones.pasa.activa) return Response.json({ ok: false }, { status: 404 });
  if (!seccion || !id || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
  const [j] = await redis([["HGET", seccion, id]]);
  if (!j) return Response.json({ ok: false }, { status: 404 });
  const r = JSON.parse(j as string) as { ofrezco?: string; texto?: string }; // en "pasa" el aviso se llama texto
  const hecho = await denunciar(seccion, id, String(c.motivo ?? ""), dispositivo, r.ofrezco ?? r.texto ?? "").catch((e) => { console.error("denuncia", e); return false as const; });
  if (hecho) after(() => hecho.avisar().catch((e) => console.error("denuncia", e)));
  return Response.json({ ok: true });
}
