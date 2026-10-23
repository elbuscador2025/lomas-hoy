// Comprueba que un pedido lo mandó de verdad el despertador (Upstash QStash): firma HS256 con las claves de firma de la cuenta.
// Sin las claves cargadas en Vercel, todo pedido se rechaza.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const b64 = (b: Buffer) => b.toString("base64url");

function firmaValida(jwt: string, clave: string, cuerpo: string) {
  const [h, p, f] = jwt.split(".");
  if (!h || !p || !f) return false;
  const esperada = createHmac("sha256", clave).update(`${h}.${p}`).digest();
  const dada = Buffer.from(f, "base64url");
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return false;
  let c: { iss?: string; exp?: number; nbf?: number; body?: string };
  try { c = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); } catch { return false; }
  const ahora = Math.floor(Date.now() / 1000);
  if (c.iss !== "Upstash" || (c.exp && c.exp < ahora) || (c.nbf && c.nbf > ahora + 60)) return false;
  // el contenido del pedido tiene que ser el que se firmó (aunque venga vacío)
  const huella = b64(createHash("sha256").update(cuerpo).digest());
  return (c.body ?? "").replace(/=+$/, "") === huella;
}

export async function vieneDelDespertador(req: Request) {
  const jwt = req.headers.get("upstash-signature");
  if (!jwt) return false;
  const cuerpo = await req.clone().text();
  return [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY].some((k) => !!k && firmaValida(jwt, k, cuerpo));
}

// El saludo de las 7:00 lo dispara el despertador (QStash) con hora de Argentina; el reloj de Vercel queda de respaldo
// (las dos vías usan la misma clave por día, así que el saludo sale una sola vez). Se comprueba una vez por día que la programación exista y, si falta, se crea.
export async function asegurarSaludo() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return;
  const { redis } = await import("@/lib/servidor");
  const [marca] = await redis([["GET", "qstash:saludo"]]);
  if (marca) return;
  const base = (process.env.QSTASH_URL ?? "https://qstash.upstash.io").replace(/\/$/, "");
  const destino = "https://lomas-hoy.vercel.app/api/cron/saludo";
  const h = { Authorization: `Bearer ${token}` };
  const lista = await (await fetch(`${base}/v2/schedules`, { headers: h })).json().catch(() => []);
  const hay = (Array.isArray(lista) ? lista : []).some((s: { destination?: string }) => s.destination === destino);
  if (!hay) {
    const r = await fetch(`${base}/v2/schedules/${destino}`, { method: "POST", headers: { ...h, "Upstash-Cron": "CRON_TZ=America/Argentina/Buenos_Aires 0 7 * * *", "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) throw new Error(`QStash ${r.status}`);
  }
  await redis([["SET", "qstash:saludo", "1", "EX", 86400]]);
}
