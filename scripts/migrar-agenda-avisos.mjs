// Una sola vez: todos los celulares que ya tienen avisos activados pasan a recibir también los avisos de la Agenda ("🎉 Nuevo en Lomas…").
// Se pueden apagar desde "Configurar avisos". Uso: node --env-file=.env.local scripts/migrar-agenda-avisos.mjs
const rd = async (c) => (await (await fetch(process.env.KV_REST_API_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN }, body: JSON.stringify(c) })).json()).map((x) => x.result);
const [h] = await rd([["HGETALL", "push:subs"]]);
let total = 0, ya = 0, cambiados = 0;
const cmds = [];
for (let i = 0; i < h.length; i += 2) {
  const s = JSON.parse(h[i + 1]); total++;
  if (s.tipos?.agenda === true) { ya++; continue; }
  cmds.push(["HSET", "push:subs", h[i], JSON.stringify({ ...s, tipos: { ...(s.tipos ?? {}), agenda: true } })]); cambiados++;
}
if (cmds.length) await rd(cmds);
console.log(`Celulares con avisos: ${total}. Ya la tenían: ${ya}. Pasaron a recibirla: ${cambiados}. Ahora reciben la Agenda: ${total}.`);
