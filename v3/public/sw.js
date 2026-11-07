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

// ---------------------------------------------------------------- notificações (push) — V11d-3
// A Edge Function "push" do banco envia { tipo, titulo, corpo, url } (mesmo formato do 2.x). Tocar na notificação
// abre o v3 na rota (url relativa ao escopo /pmo-app/v3/: ./#/ociosidade, ./#/reembolso, ./#/notificacoes).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'PMO BP-MS', {
    body: d.corpo || '',
    icon: 'icones/icone-192.png',
    badge: 'icones/icone-192.png',
    tag: d.tipo || 'pmo',
    renotify: true,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
    const j = janelas.find(w => w.url.startsWith(self.registration.scope));
    if (j) return j.focus().then(w => (w && w.navigate ? w.navigate(alvo) : w)).catch(() => self.clients.openWindow(alvo));
    return self.clients.openWindow(alvo);
  }));
});
