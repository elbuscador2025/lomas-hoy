import { cerrarSesion, cookieVacia } from "@/lib/cuentas";

export async function POST(req: Request) {
  await cerrarSesion(req);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookieVacia } });
}
