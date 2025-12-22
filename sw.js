
// Zenith Portal Service Worker
const CACHE_NAME = 'zenith-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Periodic Background Sync (Experimental feature for modern browsers)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'birthday-check') {
    // Note: This requires browser permission and usually an installed PWA
    console.log('Periodic sync: Checking birthdays...');
  }
});
