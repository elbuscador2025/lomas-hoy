import { timingSafeEqual } from "node:crypto";
import { guardarDato, registrarCorrida, CLAVES_VALIDAS } from "@/lib/ingesta";

// Lo llama GitHub Actions (el cadete de respaldo) con la clave secreta.
export async function POST(req: Request) {
  const esperada = Buffer.from(`Bearer ${process.env.INGEST_SECRET ?? ""}`);
  const dada = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.INGEST_SECRET || esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { clave, contenido, error } = await req.json().catch(() => ({}));
  if (!CLAVES_VALIDAS.includes(clave)) return Response.json({ ok: false }, { status: 400 });
  await guardarDato(clave, contenido, error);
  if (clave === "mascotas") await registrarCorrida("github"); // una vez por corrida
  return Response.json({ ok: true });
}
