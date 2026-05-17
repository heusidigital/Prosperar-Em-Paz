const CACHE = 'eft-v1';
const ASSETS = [
  '/engenharia-financeira/',
  '/engenharia-financeira/index.html',
  '/engenharia-financeira/css/styles.css',
  '/engenharia-financeira/css/components.css',
  '/engenharia-financeira/js/app.js',
  '/engenharia-financeira/js/utils.js',
  '/engenharia-financeira/js/storage.js',
  '/engenharia-financeira/js/pages/dashboard.js',
  '/engenharia-financeira/js/pages/transactions.js',
  '/engenharia-financeira/js/pages/cards.js',
  '/engenharia-financeira/js/pages/goals.js',
  '/engenharia-financeira/js/modals/expense-modal.js',
  '/engenharia-financeira/js/modals/income-modal.js',
  '/engenharia-financeira/js/modals/card-modal.js',
  '/engenharia-financeira/js/modals/goal-modal.js',
  '/engenharia-financeira/manifest.json',
  '/engenharia-financeira/icons/icon-192.png',
  '/engenharia-financeira/icons/icon-512.png',
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
