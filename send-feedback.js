// ============================================================
// api/send-feedback.js — Kirim feedback ke Telegram Bot
// ============================================================
// Environment variables yang diperlukan di Vercel:
//   TELEGRAM_BOT_TOKEN  — dari @BotFather
//   TELEGRAM_CHAT_ID    — chat ID kamu
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { type, name, email, message, timestamp } = req.body || {};

  if (!message) {
    return res.status(400).json({ ok: false, error: 'Message is required' });
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('[Feedback] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID tidak ditemukan');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  // Format pesan Telegram (Markdown)
  const text = [
    `📬 *Feedback Baru — Trackify*`,
    ``,
    `*Jenis:* ${escapeMarkdown(type || '-')}`,
    `*Dari:* ${escapeMarkdown(name || '(anonim)')}`,
    `*Email:* ${escapeMarkdown(email || '(tidak diisi)')}`,
    `*Waktu:* ${escapeMarkdown(timestamp || new Date().toLocaleString('id-ID'))}`,
    ``,
    `*Pesan:*`,
    `${escapeMarkdown(message)}`,
  ].join('\n');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('[Feedback] Telegram error:', data);
      return res.status(500).json({ ok: false, error: data.description });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[Feedback] Fetch error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Escape karakter spesial Markdown Telegram
function escapeMarkdown(str) {
  return String(str).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
