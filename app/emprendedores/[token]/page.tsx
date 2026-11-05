import { redirect } from "next/navigation";
import { porToken } from "@/lib/emprendedores";
import GuardarCodigo from "./GuardarCodigo";

export const dynamic = "force-dynamic";

// El enlace propio de quien publicó: guarda el código en este celular y abre su publicación. Si ya no existe (se borró o venció), se vuelve a la app normal.
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await porToken(token).catch(() => null);
  if (!r) redirect("/");
  return (
    <main className="wrap">
      <h1>Tu emprendimiento</h1>
      <p><b>{r.titulo}</b></p>
      <GuardarCodigo id={r.id} token={token} />
    </main>
  );
}
