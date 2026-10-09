// Cosas que solo corren en el servidor. La base es Redis (Upstash), conectada desde Vercel.
const URL_DB = process.env.KV_REST_API_URL!;
const TOKEN = process.env.KV_REST_API_TOKEN!;

type Comando = (string | number)[];

export async function redis(comandos: Comando[]): Promise<unknown[]> {
  const r = await fetch(`${URL_DB}/pipeline`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  const filas: { result?: unknown; error?: string }[] = await r.json();
  const mala = filas.find((f) => f.error);
  if (mala) throw new Error(mala.error);
  return filas.map((f) => f.result);
}

export function hoyArgentina(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
}
