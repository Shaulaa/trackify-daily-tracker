// ============================================================
// INTEGRASI FCM KE script.js
// ============================================================
// Tambahkan snippet berikut ke script.js kamu.
// Jangan copy seluruh file ini — ini hanya panduan perubahan.
// ============================================================

// ── 1. Tambah import di bagian atas script.js ────────────────
//    (setelah import firebase.js dan notifications.js)

import { initFCM, removeFCMToken } from './fcm.js';


// ── 2. Di dalam onAuthChange callback, tambahkan initFCM ─────
//    Cari bagian ini di script.js kamu:
//
//    onAuthChange((user) => {
//      if (user) {
//        ...
//        setCurrentUser(user.uid);   // <- ini sudah ada
//        await initNotifications();  // <- ini sudah ada
//        ...
//      }
//    });
//
//    Tambahkan initFCM tepat setelah initNotifications():

onAuthChange(async (user) => {
  if (user) {
    // ... kode yang sudah ada ...
    setCurrentUser(user.uid);
    await initNotifications();

    await initFCM(user.uid);

    // ... sisa kode yang sudah ada ...
  }
});


// ── 3. Di fungsi logout, tambahkan removeFCMToken ────────────
//    Cari fungsi logout kamu, biasanya seperti ini:
//
//    window.handleLogout = async function() {
//      await logoutUser();
//      ...
//    };
//
//    Ubah jadi:

window.handleLogout = async function() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    await removeFCMToken(currentUser.uid);
  }

  await logoutUser();
  // ... sisa kode logout yang sudah ada ...
};
