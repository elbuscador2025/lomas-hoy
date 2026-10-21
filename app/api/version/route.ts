// La versión que está publicada ahora (la app abierta en un celular la compara con la suya)
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ v: process.env.NEXT_PUBLIC_VERSION ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
