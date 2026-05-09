// ============================================================
// firebase-messaging-sw.js — Trackify FCM Service Worker
// ============================================================
// PENTING: File ini HARUS diletakkan di ROOT project
// (sama level dengan index.html), bukan di subfolder.
// Kalau diletakkan di subfolder, scope service worker tidak
// akan mencakup seluruh app dan notifikasi tidak akan muncul.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Ganti dengan config Firebase kamu (sama persis dengan firebase.js)
firebase.initializeApp({
  apiKey: "AIzaSyAsRDFhH4V0PHOumpwYXs4U6Z-uZS5g1C4",
  authDomain: "trackify-app-420ea.firebaseapp.com",
  projectId: "trackify-app-420ea",
  storageBucket: "trackify-app-420ea.firebasestorage.app",
  messagingSenderId: "815026874634",
  appId: "1:815026874634:web:2185ab91685070677632f3"
});

const messaging = firebase.messaging();

// ── Handle pesan background (browser tutup / tab tidak aktif) ──
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body, icon, tag, data } = payload.notification || {};
  const notifTitle = title || 'Trackify';
  const notifOptions = {
    body:  body  || '',
    icon:  icon  || './frontend/img/favicon.png',
    badge: './frontend/img/favicon.png',
    tag:   tag   || 'trackify-push',
    data:  data  || {},
    requireInteraction: false,
    // Tampilkan notif bahkan kalau sudah ada notif dengan tag yang sama
    renotify: true,
  };

  return self.registration.showNotification(notifTitle, notifOptions);
});

// ── Handle klik notifikasi ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau tab Trackify sudah terbuka, fokus ke situ
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Kalau tidak ada, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
