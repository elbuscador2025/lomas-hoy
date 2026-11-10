import { del } from "@vercel/blob";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { put } from "@/lib/blobcuenta";
import { CLAVE_INST, type Institucion } from "@/lib/deportes";

// Mi panel: subir la foto de una institución (JPG de hasta 900 KB, ya achicado por el panel). Usa el mismo sistema de fotos que el resto de la app.
export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "").slice(0, 20);
  const f = form?.get("foto");
  if (!form || !(f instanceof File) || f.size === 0) return Response.json({ ok: false, error: "Elegí una foto." }, { status: 400 });
  if (f.size > 900_000) return Response.json({ ok: false, error: "La foto es muy pesada. Probá con otra." }, { status: 400 });
  const [x] = await redis([["HGET", CLAVE_INST, id]]);
  if (!x) return Response.json({ ok: false, error: "Guardá primero la institución." }, { status: 404 });
  const bytes = Buffer.from(await f.arrayBuffer());
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return Response.json({ ok: false, error: "La foto tiene que ser un JPG." }, { status: 400 });
  try {
    const i = JSON.parse(String(x)) as Institucion;
    const { url } = await put(`deportes/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
    if (i.foto) await del(i.foto).catch(() => {});
    await redis([["HSET", CLAVE_INST, id, JSON.stringify({ ...i, foto: url, actualizado: new Date().toISOString() })]]);
    return Response.json({ ok: true, url });
  } catch (e) {
    console.error("foto deportes:", e);
    return Response.json({ ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." }, { status: 500 });
  }
}
