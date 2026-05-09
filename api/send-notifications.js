// ============================================================
// api/send-notifications.js — Vercel Serverless Function
// ============================================================
// Endpoint ini dipanggil oleh cron-notifications.js setiap menit.
// Tugasnya:
//   1. Ambil semua FCM token dari Firestore (semua user)
//   2. Cek jadwal notifikasi tiap user dari notifPrefs/{uid}
//   3. Kirim push notification via FCM REST API ke token yang relevan
//
// Environment variables yang diperlukan (set di Vercel dashboard):
//   FIREBASE_SERVICE_ACCOUNT_JSON_BASE64  — service account JSON di-encode base64
//   CRON_SECRET                           — secret bebas, harus sama dengan vercel.json
//
// Cara dapat FIREBASE_SERVICE_ACCOUNT_JSON_BASE64:
//   Firebase Console → Project Settings → Service Accounts
//   → Generate new private key → download JSON
//   → encode ke base64:
//       Mac/Linux : base64 -i serviceAccountKey.json | tr -d '\n'
//       Windows   : [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
//   → paste hasilnya ke Vercel env var
// ============================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { getMessaging }                  from 'firebase-admin/messaging';

// ── Init Firebase Admin (singleton) ─────────────────────────
function initAdmin() {
  if (getApps().length > 0) return;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 tidak ditemukan di env vars.');

  // Decode base64 → JSON
  const serviceAccount = JSON.parse(
    Buffer.from(b64, 'base64').toString('utf8')
  );

  initializeApp({
    credential: cert(serviceAccount),
  });
}

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * Waktu sekarang dalam format HH:MM (Jakarta, UTC+7).
 * Penting karena jadwal notif user disimpan dalam WIB.
 */
function nowHHMM() {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(11, 16); // HH:MM
}

// ── Main handler ─────────────────────────────────────────────
export default async function handler(req, res) {
  // Hanya izinkan POST (dipanggil dari cron)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifikasi secret agar tidak bisa dipanggil sembarangan
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    initAdmin();
    const db        = getFirestore();
    const messaging = getMessaging();
    const today     = todayStr();
    const hhmm      = nowHHMM();

    console.log(`[Cron] Tick — ${today} ${hhmm} WIB`);

    // ── 1. Ambil semua user yang punya FCM token ──────────────
    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      return res.status(200).json({ message: 'No users found', sent: 0 });
    }

    const results = [];

    // ── 2. Proses tiap user ───────────────────────────────────
    await Promise.all(usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;

      // Ambil preferensi notifikasi user
      const prefsSnap = await db.doc(`notifPrefs/${uid}`).get();
      if (!prefsSnap.exists) return;

      const prefs = prefsSnap.data();
      if (!prefs?.enabled) return;

      // Ambil semua FCM token user
      const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
      if (tokensSnap.empty) return;

      const tokens = tokensSnap.docs.map(d => d.id).filter(Boolean);
      if (tokens.length === 0) return;

      // ── 3. Cek tiap tipe notifikasi ───────────────────────
      const types = prefs.types || {};
      const notifsToBeSent = [];

      Object.entries(types).forEach(([key, t]) => {
        if (!t?.enabled)           return; // tipe ini dinonaktifkan
        if (t.lastSent === today)  return; // sudah kirim hari ini
        if (t.time !== hhmm)       return; // belum waktunya

        notifsToBeSent.push({
          key,
          title: `Trackify — ${t.label}`,
          body:  t.body,
          tag:   `trackify-${key}`,
        });
      });

      if (notifsToBeSent.length === 0) return;

      // ── 4. Kirim notifikasi via FCM ───────────────────────
      for (const notif of notifsToBeSent) {
        try {
          // sendEachForMulticast: kirim ke semua token user sekaligus
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: notif.title,
              body:  notif.body,
            },
            webpush: {
              notification: {
                icon:  '/frontend/img/favicon.png',
                badge: '/frontend/img/favicon.png',
                tag:   notif.tag,
                renotify: true,
              },
              fcmOptions: {
                link: '/',
              },
            },
          });

          console.log(`[Cron] Sent "${notif.key}" to uid=${uid}: success=${response.successCount}, fail=${response.failureCount}`);
          results.push({ uid, type: notif.key, success: response.successCount, fail: response.failureCount });

          // Update lastSent di Firestore agar tidak dikirim ulang hari ini
          await db.doc(`notifPrefs/${uid}`).update({
            [`types.${notif.key}.lastSent`]: today,
          });

          // Bersihkan token yang sudah tidak valid (expired/unregistered)
          const invalidTokens = response.responses
            .map((r, i) => (!r.success && (
              r.error?.code === 'messaging/registration-token-not-registered' ||
              r.error?.code === 'messaging/invalid-registration-token'
            )) ? tokens[i] : null)
            .filter(Boolean);

          if (invalidTokens.length > 0) {
            await Promise.all(
              invalidTokens.map(token =>
                db.doc(`users/${uid}/fcmTokens/${token}`).delete()
              )
            );
            console.log(`[Cron] Removed ${invalidTokens.length} invalid token(s) for uid=${uid}`);
          }

        } catch (err) {
          console.error(`[Cron] Error sending "${notif.key}" to uid=${uid}:`, err.message);
        }
      }
    }));

    return res.status(200).json({
      message: 'OK',
      time:    `${today} ${hhmm} WIB`,
      results,
    });

  } catch (err) {
    console.error('[Cron] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
