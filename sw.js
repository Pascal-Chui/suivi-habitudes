const CACHE_NAME = "suivi-static-v2";

const LOCAL_FILES = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

const PRECACHE_URLS = LOCAL_FILES.map(
  (path) => new URL(path, self.registration.scope).href
);

const INDEX_URL = new URL(
  "./index.html",
  self.registration.scope
).href;

const SCOPE_URL = new URL(
  "./",
  self.registration.scope
).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(LOCAL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (cacheName) =>
                  cacheName !== CACHE_NAME
              )
              .map((cacheName) =>
                caches.delete(cacheName)
              )
          )
        ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
   * Ne jamais intercepter Supabase.
   * Ces appels restent entièrement réseau.
   */
  if (
    url.hostname === "supabase.co" ||
    url.hostname.endsWith(".supabase.co")
  ) {
    return;
  }

  /*
   * Ne jamais intercepter les CDN ou autres origines externes.
   * Cela inclut jsDelivr.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * Navigation vers la racine de l'application :
   * utilise index.html déjà présent dans le cache.
   */
  if (
    request.mode === "navigate" &&
    (url.href === SCOPE_URL ||
      url.pathname.endsWith("/"))
  ) {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => {
          const cached = await cache.match(
            INDEX_URL
          );

          if (cached) {
            return cached;
          }

          return fetch(request);
        })
    );

    return;
  }

  /*
   * Cache-first uniquement pour les fichiers locaux
   * explicitement précachés.
   */
  if (!PRECACHE_URLS.includes(url.href)) {
    return;
  }

  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        const response = await fetch(request);

        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {
          await cache.put(
            request,
            response.clone()
          );
        }

        return response;
      })
  );
});
