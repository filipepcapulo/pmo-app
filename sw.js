// Service worker: abre o app na hora e funciona sem internet.
// - Arquivos com versão (?v=), ícones e manifest: do cache (a versão nova tem outra URL).
// - Página (index.html): rede com limite de 2,5 s; se demorar, abre do cache e atualiza por trás.
const CACHE = 'pmo-web-v2.0.2';
const ARQUIVOS = ['./', 'index.html', 'app.js?v=2.0.2', 'estilos.css?v=2.0.2', 'manifest.webmanifest', 'icones/icone-180.png', 'icones/icone-192.png', 'icones/icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function daRede(req) {
  return fetch(req).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // servidor: sempre rede
  const fixo = url.searchParams.has('v') || url.pathname.includes('/icones/') || url.pathname.endsWith('.webmanifest');
  if (fixo) {
    e.respondWith(caches.match(e.request).then(r => r || daRede(e.request)));
    return;
  }
  const rede = daRede(e.request);
  e.waitUntil(rede.catch(() => {}));
  const limite = new Promise(ok => setTimeout(ok, 2500)).then(() => caches.match(e.request));
  e.respondWith(
    Promise.race([rede.catch(() => null), limite])
      .then(r => r || rede)
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
