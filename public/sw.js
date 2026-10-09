// Guarda la app en el celu para que abra sin internet, y muestra las notificaciones.
const CACHE = "lomas-hoy-v2";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
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
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(d.titulo || "Lomas Hoy", {
      body: d.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || "/" },
    })
  );
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
