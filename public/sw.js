// Guarda la app en el celu para que abra sin internet, y muestra las notificaciones.
const CACHE = "lomas-hoy-v5";
const AVISOS = "lomas-hoy-avisos"; // "Mis avisos": lo que llegó en los últimos 7 días, guardado en el propio celular
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== AVISOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // Si había pantallas abiertas con una versión vieja de la app, se recargan solas con la nueva
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((ventanas) => ventanas.forEach((v) => v.navigate(v.url).catch(() => {})))
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("/") : Response.error())))
  );
});

// Notificaciones: ícono de Lomas Hoy, título corto y una línea de texto.
async function guardarAviso(d) {
  try {
    const cache = await caches.open(AVISOS);
    const previo = await cache.match("/avisos.json");
    const ahora = Date.now();
    const lista = (previo ? await previo.json() : []).filter((x) => ahora - x.t <= 7 * 86400_000);
    lista.unshift({ id: ahora + "-" + Math.random().toString(36).slice(2, 6), t: ahora, tipo: d.tipo || "", titulo: d.titulo || "Lomas Hoy", cuerpo: d.cuerpo || "", url: d.url || "/" });
    await cache.put("/avisos.json", new Response(JSON.stringify(lista.slice(0, 50)), { headers: { "Content-Type": "application/json" } }));
  } catch {}
  // Si la app está abierta, que actualice el número de la campanita
  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  ventanas.forEach((v) => v.postMessage({ lomasHoy: "aviso" }));
}
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch {}
  e.waitUntil(Promise.all([
    guardarAviso(d),
    self.registration.showNotification(d.titulo || "Lomas Hoy", {
      body: d.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || "/" },
    }),
  ]));
});
// Al tocarla se abre la app directamente en ese aviso o sección.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const v = ventanas.find((x) => "focus" in x);
      return v ? v.navigate(destino).then(() => v.focus()) : self.clients.openWindow(destino);
    })
  );
});

// Si el navegador cambia o vence la suscripción, se renueva sola y se avisa al servidor (que pasa las preferencias de la anterior).
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil((async () => {
    try {
      const vieja = e.oldSubscription;
      const key = vieja?.options?.applicationServerKey;
      const nueva = e.newSubscription || (key ? await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : null);
      if (!nueva) return;
      await fetch("/api/push/suscribir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "renovar", subscription: nueva.toJSON(), anterior: vieja ? vieja.endpoint : "" }) });
    } catch {}
  })());
});
