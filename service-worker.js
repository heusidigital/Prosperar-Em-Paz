const CACHE = 'eft-v1';
const ASSETS = [
  '/engenharia-finan%C3%A7as/',
  '/engenharia-finan%C3%A7as/index.html',
  '/engenharia-finan%C3%A7as/css/styles.css',
  '/engenharia-finan%C3%A7as/css/components.css',
  '/engenharia-finan%C3%A7as/js/app.js',
  '/engenharia-finan%C3%A7as/js/utils.js',
  '/engenharia-finan%C3%A7as/js/storage.js',
  '/engenharia-finan%C3%A7as/js/pages/dashboard.js',
  '/engenharia-finan%C3%A7as/js/pages/transactions.js',
  '/engenharia-finan%C3%A7as/js/pages/cards.js',
  '/engenharia-finan%C3%A7as/js/pages/goals.js',
  '/engenharia-finan%C3%A7as/js/modals/expense-modal.js',
  '/engenharia-finan%C3%A7as/js/modals/income-modal.js',
  '/engenharia-finan%C3%A7as/js/modals/card-modal.js',
  '/engenharia-finan%C3%A7as/js/modals/goal-modal.js',
  '/engenharia-finan%C3%A7as/manifest.json',
  '/engenharia-finan%C3%A7as/icons/icon-192.png',
  '/engenharia-finan%C3%A7as/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
