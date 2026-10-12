// Llamadas a mi panel: la sesión viaja en la cookie. Si venció, se vuelve a la pantalla de entrada.
export async function post(ruta: string, cuerpo: object = {}) {
  const r = await fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  if (r.status === 401) location.href = "/entrar";
  return r;
}
export async function salir(destino = "/") {
  await fetch("/api/salir", { method: "POST" }).catch(() => {});
  location.href = destino;
}
