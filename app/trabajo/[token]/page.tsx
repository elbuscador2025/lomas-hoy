import { redirect } from "next/navigation";
import { porToken } from "@/lib/trabajo";
import BajarTrabajo from "./BajarTrabajo";

export const dynamic = "force-dynamic";

// El enlace propio de quien publicó. Si ya no existe (se bajó o venció), se vuelve a la app normal.
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await porToken(token).catch(() => null);
  if (!r) redirect("/");
  return (
    <main className="wrap">
      <h1>Tu publicación</h1>
      <p><b>{r.modo === "ofrezco" ? "Ofrezco trabajo" : "Busco trabajo"}</b> · {r.rubro} · {r.barrio}</p>
      <p>{r.texto}</p>
      <p className="vacio">{r.situacion === "pendiente" ? "Todavía la estamos revisando." : "Ya está publicada en Lomas Hoy."}</p>
      <BajarTrabajo token={token} modo={r.modo} />
    </main>
  );
}
