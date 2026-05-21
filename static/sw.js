const CACHE_NAME = "omniops-cache-v1";
const ASSETS_TO_CACHE = [
    "/",
    "/static/css/style.css",
    "/static/js/db.js",
    "/static/js/app.js",
    "https://cdn.jsdelivr.net/npm/idb@7/+esm"
];
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {

            console.log("Caching app shell...");

            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request);
        })
    );
});