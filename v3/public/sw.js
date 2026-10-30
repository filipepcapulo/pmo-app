// Service worker do v3 (escopo /pmo-app/v3/): arquivos com hash (assets/) do cache; a página da rede, com o cache
// só quando estiver sem internet. Os dados (Supabase) nunca passam por aqui.
const CACHE = 'pmo-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icones/')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok) { const c = resp.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
      return resp;
    })));
    return;
  }
  e.respondWith(fetch(e.request).then(resp => {
    if (resp.ok && e.request.mode === 'navigate') { const c = resp.clone(); caches.open(CACHE).then(k => k.put('./', c)); }
    return resp;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
});
