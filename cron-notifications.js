// ============================================================
// api/cron-notifications.js — Vercel Cron Trigger
// ============================================================
// File ini dipanggil otomatis oleh Vercel Cron setiap menit
// (jadwal diatur di vercel.json).
//
// Tugasnya sederhana: panggil /api/send-notifications
// dengan header secret yang benar.
//
// Kenapa dipisah dari send-notifications.js?
// Supaya send-notifications juga bisa dipanggil manual
// dari dashboard/debugging tanpa harus trigger cron.
// ============================================================

export default async function handler(req, res) {
  // Vercel Cron hanya kirim GET, tapi kita verifikasi CRON_SECRET
  // lewat header Authorization yang Vercel set otomatis
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Panggil send-notifications dengan internal fetch
    // BASE_URL wajib diset di Vercel env vars
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/send-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-cron-secret':  process.env.CRON_SECRET || '',
      },
    });

    const data = await response.json();
    console.log('[Cron Trigger] send-notifications response:', data);

    return res.status(200).json({ triggered: true, result: data });
  } catch (err) {
    console.error('[Cron Trigger] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
