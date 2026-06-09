const CACHE = 'eft-v16';
const ASSETS = [
  '/Prosperar-Em-Paz/',
  '/Prosperar-Em-Paz/index.html',
  '/Prosperar-Em-Paz/css/styles.css',
  '/Prosperar-Em-Paz/css/components.css',
  '/Prosperar-Em-Paz/js/app.js',
  '/Prosperar-Em-Paz/js/utils.js',
  '/Prosperar-Em-Paz/js/storage.js',
  '/Prosperar-Em-Paz/js/pages/dashboard.js',
  '/Prosperar-Em-Paz/js/pages/transactions.js',
  '/Prosperar-Em-Paz/js/pages/cards.js',
  '/Prosperar-Em-Paz/js/pages/goals.js',
  '/Prosperar-Em-Paz/js/modals/expense-modal.js',
  '/Prosperar-Em-Paz/js/modals/income-modal.js',
  '/Prosperar-Em-Paz/js/modals/card-modal.js',
  '/Prosperar-Em-Paz/js/modals/goal-modal.js',
  '/Prosperar-Em-Paz/manifest.json',
  '/Prosperar-Em-Paz/icons/icon-192.png',
  '/Prosperar-Em-Paz/icons/icon-512.png',
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
