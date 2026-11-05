import { esAdmin } from "@/lib/cuentas";
import { operacionesDelMes, LIMITE_OPERACIONES, AVISO_OPERACIONES } from "@/lib/blobcuenta";

// Mi panel: cuántas subidas de fotos (operaciones avanzadas de Vercel Blob) van en el mes, contra las 2.000 del plan gratis.
export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const n = await operacionesDelMes().catch(() => null);
  return Response.json({ ok: n !== null, operaciones: n ?? 0, limite: LIMITE_OPERACIONES, aviso: n !== null && n >= LIMITE_OPERACIONES * AVISO_OPERACIONES });
}
