/**
 * Trackify Service Worker
 * Caching strategy untuk performa & offline support
 */

const CACHE_NAME = 'trackify-v2.6.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/animations.css',
  './js/script.js',
  './js/firebase.js',
  './js/notifications.js',
  './js/pwa.js',
  './js/fcm.js',
  './img/favicon.png',
  './img/logo-pwa-dark-192.png',
  './img/logo-pwa-dark-512.png',
  './img/logo-pwa-light-192.png',
  './img/logo-pwa-light-512.png',
  './img/logo-trackify_lightmode.png',
  './img/logo_trackify_darkmodet.png',
  './manifest.json',
  './manifest-dark.json'
];

// Install — cache semua asset penting
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — hapus cache lama
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — cache-first strategy untuk asset, network-first untuk API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Network-first untuk Firebase & API eksternal
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache response untuk fallback offline
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first untuk asset lokal
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        
        return fetch(event.request).then(response => {
          // Jangan cache jika error
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Cache untuk next time
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          
          return response;
        });
      })
      .catch(() => {
        // Fallback untuk offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Background sync untuk notifikasi
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Placeholder untuk future background sync features
  console.log('[SW] Background sync triggered');
}

// Push notification handler (sudah ada di firebase-messaging-sw.js, ini backup)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.notification?.title || 'Trackify';
    const options = {
      body: data.notification?.body || '',
      icon: './img/favicon.png',
      badge: './img/logo-pwa-dark-192.png',
      tag: 'trackify-notification',
      renotify: true,
      requireInteraction: false,
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('[SW] Push notification error:', e);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Fokus ke tab yang sudah ada
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Buka tab baru jika belum ada
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
