/* MYVYB Web Push handlers, imported into the Workbox-generated service worker.
   Kept intentionally minimal and calm: bundled copy only, a clean deep link, no
   heavy images. Payload shape: { title, body, url, tag }. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "MYVYB";
  const options = {
    body: data.body || "",
    icon: "/brand/icon.png",
    badge: "/brand/icon.png",
    tag: data.tag || "myvyb",
    renotify: false,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(url).catch(() => {});
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
