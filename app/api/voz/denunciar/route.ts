import { after } from "next/server";
import { denunciar } from "@/lib/voz";

// Denunciar un comentario. Con 3 denuncias de celulares distintos se oculta hasta que yo lo revise (igual que en el resto de Lomas Hoy).
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const pregunta = String(c.pregunta ?? "").slice(0, 20), cid = String(c.cid ?? "").slice(0, 20), dispositivo = String(c.dispositivo ?? "");
  if (!pregunta || !cid || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
  const hecho = await denunciar(pregunta, cid, String(c.motivo ?? ""), dispositivo).catch((e) => { console.error("denuncia voz", e); return false as const; });
  if (hecho) after(() => hecho.avisar().catch((e) => console.error("denuncia voz", e)));
  return Response.json({ ok: true });
}
