// Cosas que solo corren en el servidor (usan la clave secreta de Supabase).
export const URL_DB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function db(path: string, init: RequestInit = {}) {
  return fetch(`${URL_DB}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
  });
}

export function hoyArgentina() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
