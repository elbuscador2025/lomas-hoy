import { after } from "next/server";
import { MOTIVOS_ESTAFA, guardarDenunciaLibre, huella } from "@/lib/moderacion";
import { notificarAdmin } from "@/lib/push";
import { normalizarWhatsapp } from "@/lib/mascotas-comun";
import { redis, hoyArgentina } from "@/lib/servidor";

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

// "Denunciar una estafa" de Trueque o Trabajo: llega a mi panel y me avisa. Máximo 5 por día por celular.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const seccion = c.seccion === "trabajo" ? "trabajo" : c.seccion === "trueque" ? "trueque" : null;
  const dispositivo = String(c.dispositivo ?? "");
  const motivo = String(c.motivo ?? "");
  if (!seccion || dispositivo.length < 8 || dispositivo.length > 64 || !MOTIVOS_ESTAFA.includes(motivo)) return Response.json({ ok: false, error: "Elegí qué pasó." }, { status: 400 });
  const crudo = limpio(c.whatsapp, 30);
  const whatsapp = crudo ? normalizarWhatsapp(crudo) : "";
  if (whatsapp === null) return Response.json({ ok: false, error: "El número de WhatsApp no es válido. Ponelo con código de área (ej. 11 5555-5555) o dejalo vacío." }, { status: 400 });
  const llave = `estafas:dia:${hoyArgentina()}:${huella(dispositivo)}`;
  const [n] = await redis([["INCR", llave], ["EXPIRE", llave, 2 * 86400]]);
  if (Number(n) > 5) return Response.json({ ok: false, error: "Ya mandaste varias denuncias hoy. Probá mañana." }, { status: 429 });
  const publicacion = limpio(c.publicacion, 150), texto = limpio(c.texto, 300);
  await guardarDenunciaLibre({ seccion, motivo, whatsapp, publicacion, texto });
  after(() => notificarAdmin("Denuncia de estafa", `${motivo}${publicacion ? `: ${publicacion}` : ""}`.slice(0, 100), "/panel#denuncias"));
  return Response.json({ ok: true });
}
