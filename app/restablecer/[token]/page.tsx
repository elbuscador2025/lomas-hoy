import { redirect } from "next/navigation";
import { enlaceVigente } from "@/lib/cuentas";
import FormularioCuenta from "@/app/FormularioCuenta";

export const dynamic = "force-dynamic";

// Si el enlace ya se usó o venció, se vuelve a la app normal, sin mensajes raros.
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vigente = await enlaceVigente("reset", token).catch(() => false);
  if (!vigente) redirect("/");
  return <FormularioCuenta modo="restablecer" token={token} />;
}
