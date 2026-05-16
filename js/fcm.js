// ============================================================
// fcm.js — Trackify FCM Client Module
// ============================================================
// Tanggung jawab:
//   1. Register service worker firebase-messaging-sw.js
//   2. Minta permission & ambil FCM token dari browser
//   3. Simpan token ke Firestore users/{uid}/fcmTokens/{token}
//   4. Hapus token saat logout
//
// Cara pakai di script.js:
//   import { initFCM, removeFCMToken } from './fcm.js';
//
//   // Panggil setelah user login (di onAuthChange):
//   await initFCM(user.uid);
//
//   // Panggil saat logout:
//   await removeFCMToken(user.uid);
// ============================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getMessaging, getToken, deleteToken } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── VAPID KEY ────────────────────────────────────────────────
// Dapatkan dari Firebase Console:
// Project Settings → Cloud Messaging → Web Push certificates → Key pair
// Klik "Generate key pair" kalau belum ada, lalu copy nilai "Key pair"-nya
const VAPID_KEY = 'BNtIAPmVYAT-bKjcRiU8UyR7U6egdSl9c-thaCl00Jf03SmUWyTqb4eJc_JiVsE20R9tIQp0Eaw-AAntmBC5UMo';

// ── Lazy init Firebase app & messaging ───────────────────────
function getApp() {
  return getApps()[0] || null;
}

function getDB() {
  const app = getApp();
  return app ? getFirestore(app) : null;
}

function getMessagingInstance() {
  const app = getApp();
  return app ? getMessaging(app) : null;
}

// ── Register Service Worker ──────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Worker tidak didukung browser ini.');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FCM] Service Worker terdaftar:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[FCM] Gagal register Service Worker:', err);
    return null;
  }
}

// ── Simpan token ke Firestore ────────────────────────────────
async function saveTokenToFirestore(uid, token) {
  const db = getDB();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'fcmTokens', token),
      {
        token,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userAgent: navigator.userAgent.slice(0, 200),
      },
      { merge: true }
    );
    console.log('[FCM] Token tersimpan ke Firestore.');
  } catch (err) {
    console.warn('[FCM] Gagal simpan token ke Firestore:', err);
  }
}

// ── Hapus token dari Firestore ───────────────────────────────
async function deleteTokenFromFirestore(uid, token) {
  const db = getDB();
  if (!db || !token) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'fcmTokens', token));
    console.log('[FCM] Token dihapus dari Firestore.');
  } catch (err) {
    console.warn('[FCM] Gagal hapus token dari Firestore:', err);
  }
}

// ── Cache token di localStorage ──────────────────────────────
const LS_TOKEN_KEY = 'Trackify_fcmToken';

function getCachedToken() {
  try { return localStorage.getItem(LS_TOKEN_KEY); } catch { return null; }
}
function setCachedToken(token) {
  try { localStorage.setItem(LS_TOKEN_KEY, token); } catch {}
}
function clearCachedToken() {
  try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
}

// ── Init FCM (dipanggil setelah login) ───────────────────────
/**
 * Inisialisasi FCM untuk user yang sudah login.
 * - Register service worker
 * - Minta izin notifikasi
 * - Ambil FCM token
 * - Simpan token ke Firestore
 *
 * @param {string} uid - UID user yang login
 * @returns {string|null} FCM token atau null kalau gagal
 */
export async function initFCM(uid) {
  if (!uid) return null;

  // Cek dukungan browser
  if (!('Notification' in window)) {
    console.warn('[FCM] Browser tidak mendukung notifikasi.');
    return null;
  }

  // Minta izin jika belum
  if (Notification.permission === 'denied') {
    console.warn('[FCM] Izin notifikasi ditolak oleh user.');
    return null;
  }
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      console.warn('[FCM] User menolak izin notifikasi.');
      return null;
    }
  }

  // Register service worker
  const swReg = await registerSW();
  if (!swReg) return null;

  // Ambil FCM token
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.warn('[FCM] Messaging tidak terinisialisasi.');
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn('[FCM] Tidak dapat mengambil token. Cek VAPID_KEY dan konfigurasi.');
      return null;
    }

    console.log('[FCM] Token didapat:', token.slice(0, 20) + '...');

    // Simpan ke Firestore kalau token baru / berubah
    const cachedToken = getCachedToken();
    if (token !== cachedToken) {
      await saveTokenToFirestore(uid, token);
      setCachedToken(token);
    }

    return token;
  } catch (err) {
    console.error('[FCM] Gagal ambil token:', err);
    return null;
  }
}

// ── Remove FCM token (dipanggil saat logout) ─────────────────
/**
 * Hapus FCM token dari Firestore dan invalidasi di Firebase.
 * Dipanggil saat user logout agar tidak menerima notifikasi setelah keluar.
 *
 * @param {string} uid - UID user yang akan logout
 */
export async function removeFCMToken(uid) {
  const token = getCachedToken();
  if (!token) return;

  const messaging = getMessagingInstance();
  if (messaging) {
    try {
      await deleteToken(messaging);
      console.log('[FCM] Token diinvalidasi dari Firebase.');
    } catch (err) {
      console.warn('[FCM] Gagal invalidasi token:', err);
    }
  }

  if (uid) {
    await deleteTokenFromFirestore(uid, token);
  }

  clearCachedToken();
}
