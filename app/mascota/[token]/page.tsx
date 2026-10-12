import { redirect } from "next/navigation";
import { porToken } from "@/lib/mascotas";
import BajarMascota from "./BajarMascota";

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
      <img className="foto-mascota" src={r.foto.url} alt="Foto de la mascota" />
      <p><b>{r.estado === "perdido" ? "Perdido" : "Encontrado"}</b> · {r.barrio}</p>
      <p>{r.descripcion}</p>
      <p className="vacio">{r.situacion === "pendiente" ? "Todavía la estamos revisando." : "Ya está publicada en Lomas Hoy."}</p>
      <BajarMascota token={token} />
    </main>
  );
}
