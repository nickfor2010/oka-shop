// Makes "OKA 管理" installable as a desktop app. It caches nothing on purpose: admin always shows live orders.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
