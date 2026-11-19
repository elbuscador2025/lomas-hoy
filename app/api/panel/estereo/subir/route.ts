import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { esAdmin } from "@/lib/cuentas";
import { MAX_BYTES_ESTEREO } from "@/lib/estereo-comun";

// El MP3 se sube directo desde mi panel al almacenamiento (así no choca con el límite de tamaño de los pedidos al servidor).
// Acá solo se da el permiso: únicamente yo (con el panel abierto), solo MP3 y hasta 8 MB.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Pedido inválido" }, { status: 400 });
  try {
    const r = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await esAdmin(req))) throw new Error("No autorizado");
        if (!/^estereo\/[^/]{1,120}\.mp3$/i.test(pathname)) throw new Error("Nombre de archivo no válido");
        return { allowedContentTypes: ["audio/mpeg"], maximumSizeInBytes: MAX_BYTES_ESTEREO, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
