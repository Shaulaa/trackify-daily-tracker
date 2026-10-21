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

  if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) {
    return res.status(415).json({ ok: false, error: 'JSON body required' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Invalid feedback' });
  }
  const limits = { type: 80, name: 120, email: 254, message: 2000, timestamp: 80 };
  for (const [field, max] of Object.entries(limits)) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > max)) {
      return res.status(400).json({ ok: false, error: 'Invalid feedback' });
    }
  }
  const { type, name, email, timestamp } = body;
  const message = body.message?.trim();
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

  if (text.length > 4096) {
    return res.status(400).json({ ok: false, error: 'Feedback is too long' });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
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
      console.error('[Feedback] Telegram rejected feedback');
      return res.status(502).json({ ok: false, error: 'Unable to send feedback' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    // Fetch errors can contain the request URL, including the bot token.
    console.error('[Feedback] Upstream request failed');
    return res.status(502).json({ ok: false, error: 'Unable to send feedback' });
  }
}

// Escape karakter spesial Markdown Telegram
function escapeMarkdown(str) {
  return String(str).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
