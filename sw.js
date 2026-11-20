const CACHE_NAME = "mis-potingues-v12";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./pwa-icon.svg",
  "./favicon.svg",
  "./styles-mobile.css",
  "./scripts-bows.js",
  "./firebase-config.js",
  "./firebase-sync.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      const isCode = request.destination === "script" || request.destination === "style";
      if (isCode) {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const copy = fresh.clone();
            await caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return fresh;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      }
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })(),
  );
});
