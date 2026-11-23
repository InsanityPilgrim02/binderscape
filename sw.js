/* BinderScape service worker.
   Cache-first: the installed app always runs from its saved copy and never updates by itself.
   Only the "Look for updates" button in Settings refreshes the cache (see downloadUpdate() in index.html).
   Keep CACHE in step with APP_CACHE in index.html. Installing never overwrites files that are already cached. */
const CACHE = 'binderscape-app';
const FILES = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  for (const f of FILES) {
    if (await cache.match(f)) continue;
    try { await cache.add(new Request(f, { cache: 'reload' })); }
    catch (err) { if (f === './index.html') throw err; }
  }
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('binderscape-')) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.cache === 'no-store') return;            // the update check uses no-store: let it reach the network
  if (new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(r.mode === 'navigate' ? './index.html' : r, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(r); }
    catch (err) { return (r.mode === 'navigate' && await cache.match('./index.html')) || Response.error(); }
  })());
});
