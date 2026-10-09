import { redis } from "@/lib/servidor";

export async function POST(req: Request) {
  const token = /(?:^|;\s*)muni=([a-f0-9]{64})/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (token) await redis([["DEL", `muni:sesion:${token}`]]);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": "muni=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" } });
}
