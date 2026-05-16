// ============================================================
// pwa.js — Trackify PWA Install Prompt Module
// ============================================================
// Tanggung jawab:
//   1. Tangkap event beforeinstallprompt (Chrome/Android)
//   2. Tampilkan banner install custom yang elegan
//   3. Handle install & dismiss, simpan state ke localStorage
//   4. Export fungsi untuk dipanggil dari script.js
//
// Cara pakai di script.js:
//   import { initPWA } from './pwa.js';
//   initPWA(); // panggil di DOMContentLoaded atau awal script
// ============================================================

'use strict';

const LS_DISMISSED_KEY  = 'Trackify_pwaPromptDismissed';
const LS_INSTALLED_KEY  = 'Trackify_pwaInstalled';
const DISMISS_COOLDOWN  = 7 * 24 * 60 * 60 * 1000; // 7 hari sebelum prompt muncul lagi

let _deferredPrompt = null; // simpan event beforeinstallprompt

// ── Cek apakah sudah running sebagai PWA installed ───────────
function isRunningAsPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS
  );
}

// ── Cek apakah prompt boleh ditampilkan ──────────────────────
function canShowPrompt() {
  if (isRunningAsPWA()) return false;
  if (localStorage.getItem(LS_INSTALLED_KEY)) return false;

  const dismissed = localStorage.getItem(LS_DISMISSED_KEY);
  if (dismissed) {
    const elapsed = Date.now() - parseInt(dismissed, 10);
    if (elapsed < DISMISS_COOLDOWN) return false;
  }
  return true;
}

// ── Inject CSS banner ────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('pwa-prompt-styles')) return;
  const style = document.createElement('style');
  style.id = 'pwa-prompt-styles';
  style.textContent = `
    #pwa-install-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      z-index: 9999;
      width: min(420px, calc(100vw - 32px));
      background: var(--card, #1a1d27);
      border: 1px solid var(--border, #2a2d3a);
      border-radius: 16px;
      padding: 16px 18px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      gap: 14px;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.3s ease;
      opacity: 0;
    }
    #pwa-install-banner.pwa-banner-visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    #pwa-install-banner.pwa-banner-hiding {
      transform: translateX(-50%) translateY(120px);
      opacity: 0;
    }
    .pwa-banner-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      object-fit: contain;
      flex-shrink: 0;
      background: var(--bg2, #13151f);
      padding: 4px;
    }
    .pwa-banner-text {
      flex: 1;
      min-width: 0;
    }
    .pwa-banner-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #e8eaf0);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pwa-banner-desc {
      font-size: 11.5px;
      color: var(--text3, #6b7280);
      line-height: 1.4;
    }
    .pwa-banner-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .pwa-btn-install {
      font-size: 12px;
      font-weight: 700;
      padding: 7px 14px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      background: var(--accent, #6c63ff);
      color: #fff;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .pwa-btn-install:hover { opacity: 0.85; }
    .pwa-btn-dismiss {
      font-size: 11px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border, #2a2d3a);
      cursor: pointer;
      background: transparent;
      color: var(--text3, #6b7280);
      text-align: center;
      transition: color 0.15s;
    }
    .pwa-btn-dismiss:hover { color: var(--text, #e8eaf0); }

    /* iOS banner — instruksi manual */
    #pwa-ios-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      z-index: 9999;
      width: min(380px, calc(100vw - 32px));
      background: var(--card, #1a1d27);
      border: 1px solid var(--border, #2a2d3a);
      border-radius: 16px;
      padding: 16px 18px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.45);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.3s ease;
      opacity: 0;
    }
    #pwa-ios-banner.pwa-banner-visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    #pwa-ios-banner.pwa-banner-hiding {
      transform: translateX(-50%) translateY(120px);
      opacity: 0;
    }
    .pwa-ios-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #e8eaf0);
      margin-bottom: 8px;
    }
    .pwa-ios-steps {
      font-size: 12px;
      color: var(--text3, #6b7280);
      line-height: 1.8;
      margin-bottom: 10px;
    }
    .pwa-ios-steps b { color: var(--text2, #b0b3c1); }
    .pwa-ios-close {
      font-size: 11px;
      float: right;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border, #2a2d3a);
      cursor: pointer;
      background: transparent;
      color: var(--text3, #6b7280);
    }
  `;
  document.head.appendChild(style);
}

// ── Buat banner Android/Chrome ────────────────────────────────
function createAndroidBanner() {
  if (document.getElementById('pwa-install-banner')) return;

  const assetBase = document.querySelector('meta[name="trackify-asset-base"]')
    ?.getAttribute('content') || './frontend/';

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', 'Install Trackify');
  banner.innerHTML = `
    <img class="pwa-banner-icon" src="${assetBase}img/favicon.png" alt="Trackify icon">
    <div class="pwa-banner-text">
      <div class="pwa-banner-title">Install Trackify</div>
      <div class="pwa-banner-desc">Pasang ke home screen untuk notifikasi walau browser tutup</div>
    </div>
    <div class="pwa-banner-actions">
      <button class="pwa-btn-install" id="pwa-btn-install">Install</button>
      <button class="pwa-btn-dismiss" id="pwa-btn-dismiss">Nanti</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Trigger animasi masuk
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('pwa-banner-visible'));
  });

  // Event listeners
  document.getElementById('pwa-btn-install').addEventListener('click', handleInstall);
  document.getElementById('pwa-btn-dismiss').addEventListener('click', handleDismiss);
}

// ── Buat banner iOS (instruksi manual) ───────────────────────
function createIOSBanner() {
  if (document.getElementById('pwa-ios-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-ios-banner';
  banner.setAttribute('role', 'complementary');
  banner.innerHTML = `
    <div class="pwa-ios-title">📲 Install Trackify ke Home Screen</div>
    <div class="pwa-ios-steps">
      1. Tap tombol <b>Share</b> (kotak dengan panah ke atas) di browser<br>
      2. Pilih <b>"Add to Home Screen"</b><br>
      3. Tap <b>"Add"</b> — selesai!
    </div>
    <button class="pwa-ios-close" id="pwa-ios-close">Oke, mengerti</button>
  `;
  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('pwa-banner-visible'));
  });

  document.getElementById('pwa-ios-close').addEventListener('click', () => {
    hideBanner('pwa-ios-banner');
    localStorage.setItem(LS_DISMISSED_KEY, Date.now().toString());
  });
}

// ── Sembunyikan banner dengan animasi ────────────────────────
function hideBanner(id) {
  const banner = document.getElementById(id);
  if (!banner) return;
  banner.classList.remove('pwa-banner-visible');
  banner.classList.add('pwa-banner-hiding');
  setTimeout(() => banner.remove(), 400);
}

// ── Handle install (Android/Chrome) ─────────────────────────
async function handleInstall() {
  if (!_deferredPrompt) return;
  hideBanner('pwa-install-banner');

  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  console.log('[PWA] Install outcome:', outcome);

  if (outcome === 'accepted') {
    localStorage.setItem(LS_INSTALLED_KEY, '1');
    console.log('[PWA] App berhasil diinstall!');
  }
  _deferredPrompt = null;
}

// ── Handle dismiss ───────────────────────────────────────────
function handleDismiss() {
  hideBanner('pwa-install-banner');
  localStorage.setItem(LS_DISMISSED_KEY, Date.now().toString());
}

// ── Deteksi iOS ──────────────────────────────────────────────
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

// ── Init PWA ─────────────────────────────────────────────────
/**
 * Inisialisasi PWA install prompt.
 * Panggil sekali di awal script.js.
 */
export function initPWA() {
  injectStyles();

  // Kalau sudah running sebagai PWA, tidak perlu prompt
  if (isRunningAsPWA()) {
    console.log('[PWA] Sudah berjalan sebagai installed PWA.');
    return;
  }

  // Android/Chrome — tangkap beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt tertangkap.');

    if (canShowPrompt()) {
      // Tunda sedikit agar tidak langsung muncul saat page load
      setTimeout(createAndroidBanner, 3000);
    }
  });

  // iOS Safari — instruksi manual
  if (isIOS() && canShowPrompt()) {
    setTimeout(createIOSBanner, 3000);
  }

  // Tandai kalau app sudah diinstall lewat appinstalled event
  window.addEventListener('appinstalled', () => {
    localStorage.setItem(LS_INSTALLED_KEY, '1');
    hideBanner('pwa-install-banner');
    console.log('[PWA] App installed via appinstalled event.');
  });
}

// ── Trigger install prompt manual (dari tombol di settings) ──
/**
 * Tampilkan install prompt secara manual.
 * Bisa dipanggil dari tombol "Install App" di halaman settings.
 * @returns {boolean} true kalau prompt berhasil ditampilkan
 */
export function triggerInstallPrompt() {
  if (_deferredPrompt) {
    handleInstall();
    return true;
  }
  if (isIOS() && !isRunningAsPWA()) {
    createIOSBanner();
    return true;
  }
  return false; // Sudah installed atau browser tidak support
}

/**
 * Cek apakah app bisa diinstall (untuk tampilkan/sembunyikan tombol install di UI)
 * @returns {boolean}
 */
export function canInstall() {
  if (isRunningAsPWA()) return false;
  if (localStorage.getItem(LS_INSTALLED_KEY)) return false;
  return !!_deferredPrompt || isIOS();
}
