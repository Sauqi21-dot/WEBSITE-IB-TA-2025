const CACHE_NAME = "ib-2025-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/jadwal",
  "/mahasiswa",
  "/galeri",
  "/ulang-tahun",
  "/manifest.json",
  "/api/public/schedules",
  "/api/public/students",
  "/api/public/gallery",
  "/api/public/birthdays",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("SW precache failed for some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan tangani non-GET atau request autentikasi
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/auth")) {
    return;
  }

  // Strategi stale-while-revalidate untuk halaman dan data publik
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan network gagal, kembalikan cache jika ada
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
