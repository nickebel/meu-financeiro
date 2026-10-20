/* App shell PWA; nunca armazena respostas privadas do Supabase. */
const CACHE_NAME = "meu-financeiro-shell-v5";
const BASE_URL = new URL("./", self.location.href);
const SHELL_URLS = [
  BASE_URL.href,
  new URL("index.html", BASE_URL).href,
  new URL("style.css?v=20261020-13", BASE_URL).href,
  new URL("app.js?v=20261020-10", BASE_URL).href,
  new URL("config.js", BASE_URL).href,
  new URL("pwa.js?v=20261020-3", BASE_URL).href,
  new URL("offline-store.js?v=20261020-2", BASE_URL).href,
  new URL("manifest.webmanifest", BASE_URL).href,
  new URL("favicon.svg?v=20261020-1", BASE_URL).href,
  new URL("app-icon.svg", BASE_URL).href,
  new URL("app-icon-maskable.svg", BASE_URL).href,
  new URL("icon-192.png", BASE_URL).href,
  new URL("icon-512.png", BASE_URL).href
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL_URLS.map(async url => {
      try { await cache.add(url); } catch (error) {
        // Um arquivo que esteja temporariamente indisponível não bloqueia toda a instalação.
        console.warn("Não foi possível guardar o recurso:", url, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("meu-financeiro-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cached = await caches.match(request) || await caches.match(new URL("index.html", BASE_URL).href) || await caches.match(BASE_URL.href);
        if (cached) return cached;
        return new Response("Você está offline. Conecte-se à internet para abrir o Meu Financeiro.", {status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  // Cacheia somente recursos estáticos do mesmo site. Respostas privadas de APIs externas
  // (incluindo o Supabase) nunca entram neste cache.
  if (["style", "script", "image", "font", "manifest"].includes(request.destination) || url.pathname.endsWith(".js") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error("Recurso indisponível offline");
      }
    })());
  }
});
