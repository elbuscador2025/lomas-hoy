import { redirect } from "next/navigation";
import { porToken } from "@/lib/trueque";
import BajarTrueque from "./BajarTrueque";

export const dynamic = "force-dynamic";

// El enlace propio de quien publicó. Si ya no existe (se bajó o venció), se vuelve a la app normal.
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await porToken(token).catch(() => null);
  if (!r) redirect("/");
  return (
    <main className="wrap">
      <h1>Tu publicación</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-mascota" src={r.foto.url} alt="Foto de lo que ofrecés" />
      <p><b>Ofrezco:</b> {r.ofrezco}</p>
      <p><b>Busco a cambio:</b> {r.busco}</p>
      <p className="vacio">{r.situacion === "pendiente" ? "Todavía la estamos revisando." : "Ya está publicada en Lomas Hoy."}</p>
      <BajarTrueque token={token} />
    </main>
  );
}
