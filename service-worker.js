const CACHE   = 'igreja-vendas-v3';
const ASSETS  = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/api.js',
  './js/app.js',
  './js/dashboard.js',
  './js/produtos.js',
  './js/vendas.js',
  './js/relatorios.js',
  './js/bluetooth.js',
  './js/maquininha.js'
];

// ---------- INSTALL ----------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('Cache install falhou:', err))
  );
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---------- FETCH ----------
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // NÃO interceptar chamadas para Apps Script / Google / PagSeguro
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('pagseguro.com')
  ) {
    return; // deixa o navegador lidar direto (sempre online)
  }

  // Network-first para o resto; cache como fallback
  event.respondWith(
    fetch(req)
      .then(resp => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || caches.match('./index.html'))
      )
  );
});
