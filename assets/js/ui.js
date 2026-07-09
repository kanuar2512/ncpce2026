/**
 * ui.js — CMIP Renderer & UI Components
 *
 * Responsibilities:
 *  - Fetch data via api.js and render HTML for every section
 *  - Handle loading, error, and empty states per section
 *  - Initialise all interactive components (countdown, tabs,
 *    accordion, scroll reveal, nav, lightbox, toast, FAB)
 *
 * Convention:
 *  - render*() functions are async — they fetch then paint
 *  - init*() functions are sync — they attach event listeners
 *  - All text comes from LANG via t() / localise()
 *  - Never hardcode BM or EN strings here
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 */

'use strict';

import {
  CONFERENCE, RISE as RISE_CONFIG, GALLERY, PROGRAMME_TYPES, FILE_ICONS,
  THEME_SONG,
  t, localise, getLang,
} from './config.js?v=4';

import {
  fetchSiteConfig, fetchProgrammeAll, fetchSpeakers,
  fetchRise, fetchDownloads, fetchGallery,
  fetchFaq, fetchSponsors, fetchContact,
  ApiError,
} from './api.js?v=4';


/* ============================================================
   ICON SYSTEM — Heroicons (Outline)
   ------------------------------------------------------------
   Single source of truth for every icon in JS-rendered markup.
   hicon(name) returns an inline <svg> that inherits its size
   from the parent font-size (.hicon { width:1em; height:1em })
   and its colour from `currentColor` (never hardcoded).
   Static HTML uses the same markup inline. Heroicons v2 Outline.
   ============================================================ */

/** Inner path data for each Heroicon (24×24, stroke, round caps). */
const HEROICON_PATHS = Object.freeze({
  'map-pin': '<path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>',
  'user': '<path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>',
  'clock': '<path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  'building-office-2': '<path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>',
  'flag': '<path d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"/>',
  'trophy': '<path d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/>',
  'microphone': '<path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/>',
  'beaker': '<path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>',
  'globe-alt': '<path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>',
  'light-bulb': '<path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>',
  'calendar-days': '<path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"/>',
  'map': '<path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>',
  'truck': '<path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>',
  'envelope': '<path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>',
  'phone': '<path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>',
  'exclamation-triangle': '<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>',
  'inbox': '<path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/>',
  'arrow-down-tray': '<path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>',
  'photo': '<path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>',
  'document-text': '<path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>',
  'megaphone': '<path d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"/>',
  'lock-closed': '<path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>',
  'check': '<path d="M4.5 12.75l6 6 9-13.5"/>',
  'check-badge': '<path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>',
  'x-mark': '<path d="M6 18L18 6M6 6l12 12"/>',
  'cog': '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
  'clipboard': '<path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>',
  'home': '<path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>',
});

/**
 * Return an inline Heroicons (Outline) SVG string for the given name.
 * Inherits size from parent font-size and colour from currentColor.
 * @param {string} name  key in HEROICON_PATHS
 * @returns {string}
 */
function hicon(name) {
  const paths = HEROICON_PATHS[name] || HEROICON_PATHS['clipboard'];
  return `<svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}


/* ============================================================
   THEME SONG — Lagu Tema Rasmi playback
   ------------------------------------------------------------
   The ▶ Main Lagu button is driven entirely by THEME_SONG.url
   in config.js. When the URL is empty the play button is
   disabled; the moment a URL is added it becomes a working
   play/pause control — no markup changes required.
   ============================================================ */
export function initThemeSong() {
  const btn = document.getElementById('theme-song-play');
  if (!btn) return;

  const url = (THEME_SONG && THEME_SONG.url ? THEME_SONG.url : '').trim();

  if (!url) {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    return;
  }

  btn.disabled = false;
  btn.removeAttribute('aria-disabled');

  const audio = new Audio(url);
  audio.preload = 'none';

  btn.addEventListener('click', () => {
    if (audio.paused) { audio.play().catch(() => {}); }
    else { audio.pause(); }
  });
  audio.addEventListener('play',  () => btn.classList.add('is-playing'));
  audio.addEventListener('pause', () => btn.classList.remove('is-playing'));
  audio.addEventListener('ended', () => btn.classList.remove('is-playing'));
}


/* ============================================================
   DOM HELPERS
   ============================================================ */

/** @param {string} id @returns {HTMLElement|null} */
const $ = id => document.getElementById(id);

/** @param {string} sel @returns {HTMLElement|null} */
const $q = sel => document.querySelector(sel);

/** @param {string} sel @returns {NodeList} */
const $all = sel => document.querySelectorAll(sel);

/**
 * Show a loading spinner inside a container.
 * @param {HTMLElement} el
 */
function setLoading(el) {
  if (!el) return;
  el.innerHTML = `<div class="loading-spinner">${t('loading')}</div>`;
}

/**
 * Show an error state inside a container.
 * @param {HTMLElement} el
 * @param {string} [msg]
 */
function setError(el, msg) {
  if (!el) return;
  el.innerHTML = `
    <div class="error-state">
      <div class="error-state__icon">${hicon('exclamation-triangle')}</div>
      <p>${msg || t('error_load')}</p>
    </div>`;
}

/**
 * Show an empty-state message inside a container.
 * @param {HTMLElement} el
 * @param {string} [msg]
 */
function setEmpty(el, msg) {
  if (!el) return;
  el.innerHTML = `
    <div class="error-state">
      <div class="error-state__icon">${hicon('inbox')}</div>
      <p>${msg || t('no_data')}</p>
    </div>`;
}

/**
 * Convert a Google Drive shareable link to a direct image URL.
 * Input:  https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * Output: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
 * @param {string} url
 * @param {number} [size]
 * @returns {string}
 */
function driveThumb(url, size = 400) {
  if (!url || url === '#') return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`;
}

/**
 * Returns a safe photo URL — falls back to initials avatar if empty.
 * @param {string} url
 * @param {string} name
 * @returns {string}
 */
function safePhoto(url, name = '?') {
  if (url && url !== '#') return driveThumb(url, 300) || url;
  // SVG initials avatar (data URI)
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#800000"/>
    <text x="80" y="95" text-anchor="middle" font-family="system-ui" font-size="52" font-weight="700" fill="#FFF4D6">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Get file icon emoji from file type string.
 * @param {string} type
 * @returns {string}
 */
function fileIcon(type) {
  return hicon(FILE_ICONS[type?.toLowerCase()] ?? FILE_ICONS.default);
}

/**
 * Format a time range string: "08:30 – 10:30"
 * @param {string} start
 * @param {string} [end]
 * @returns {string}
 */
function timeRange(start, end) {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (!e || s === e) return s;
  return `${s} – ${e}`;
}

/**
 * Normalise a time value to "HH:MM".
 * Google Sheets serialises time-only cells as "1899-12-30THH:MM:SS";
 * this also accepts plain "HH:MM" or "HH:MM:SS".
 * @param {string} v
 * @returns {string}
 */
function fmtTime(v) {
  if (!v) return '';
  const s = String(v);
  const iso = s.match(/T(\d{2}):(\d{2})/);      // 1899-12-30T08:00:00
  if (iso) return `${iso[1]}:${iso[2]}`;
  const hm = s.match(/^(\d{1,2}):(\d{2})/);      // 08:00 or 8:00
  if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}`;
  return s;
}


/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
let _toastTimer = null;

/** @param {string} message */
export function showToast(message) {
  let toast = $('cmip-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cmip-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}


/* ============================================================
   COUNTDOWN TIMER
   ============================================================ */

/**
 * Initialise the live countdown timer.
 * Targets elements: #cd-days, #cd-hours, #cd-mins, #cd-secs
 * @param {string} isoDate — target date in ISO 8601
 */
export function initCountdown(isoDate) {
  const target = new Date(isoDate).getTime();

  const elDays  = $('cd-days');
  const elHours = $('cd-hours');
  const elMins  = $('cd-mins');
  const elSecs  = $('cd-secs');
  const elMsg   = $('cd-ended-msg');

  if (!elDays) return;

  function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

  function tick() {
    const now  = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      // Conference has started
      if (elMsg) {
        elMsg.textContent = t('countdown_ended');
        elMsg.style.display = 'block';
      }
      const wrap = $q('.countdown');
      if (wrap) wrap.style.display = 'none';
      return;
    }

    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000)  / 60_000);
    const s = Math.floor((diff % 60_000)     / 1_000);

    if (elDays)  elDays.textContent  = pad(d);
    if (elHours) elHours.textContent = pad(h);
    if (elMins)  elMins.textContent  = pad(m);
    if (elSecs)  elSecs.textContent  = pad(s);
  }

  tick();
  setInterval(tick, 1000);
}


/* ============================================================
   SCROLL REVEAL
   ============================================================ */

/** Initialise IntersectionObserver for .reveal / .reveal-left / .reveal-right */
export function initScrollReveal() {
  const targets = $all('.reveal, .reveal-left, .reveal-right');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('active');
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach(el => observer.observe(el));
}


/* ============================================================
   NAVIGATION
   ============================================================ */

/** Navbar scroll class + active section highlighting */
export function initNav() {
  const navbar = $q('.navbar');
  if (!navbar) return;

  // Scroll class
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Active section highlighting — conf-subnav links + drawer links
  const sections    = $all('section[id]');
  const subNavLinks = $all('#conf-subnav a, .navbar__drawer a[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          subNavLinks.forEach(a => {
            const href = a.getAttribute('href');
            a.classList.toggle('active', href === `#${id}`);
          });
        }
      });
    },
    // Activation line at the viewport centre: whichever section crosses the
    // middle is active. A fixed visibility threshold (0.35) fails for sections
    // taller than the viewport (e.g. Speakers/Programme), which never reach it
    // and so never highlight. Matches the rise.html scroll-spy.
    { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach(s => sectionObserver.observe(s));
}

/** Mobile hamburger drawer */
export function initNavDrawer() {
  const hamburger = $q('.navbar__hamburger');
  const drawer    = $q('.navbar__drawer');
  if (!hamburger || !drawer) return;

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close drawer when a link is clicked
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!navbar?.contains(e.target) && !hamburger.contains(e.target)) {
      drawer.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });
}


/* ============================================================
   BACK TO TOP
   ============================================================ */
export function initBackToTop() {
  const btn = $q('.fab-btn--top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* ============================================================
   PROGRAMME / AGENDA TABS
   ============================================================ */

/**
 * Render the full programme section with day tabs.
 * Target: container element wrapping .agenda-tabs + .agenda-panels
 * @param {string} containerId
 */
export async function renderProgramme(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const byDay = await fetchProgrammeAll();
    const days  = Object.keys(byDay).map(Number).sort();

    if (!days.length) {
      setEmpty(container);
      return;
    }

    const lang       = getLang();
    const dayLabels  = lang === 'en' ? CONFERENCE.dates.days_en : CONFERENCE.dates.days_ms;

    // Build tabs
    const tabsHtml = days.map((day, i) => `
      <button
        class="agenda-tab-btn${i === 0 ? ' active' : ''}"
        data-day="${day}"
        aria-controls="agenda-day-${day}"
        aria-selected="${i === 0}"
      >
        ${dayLabels[day - 1] ?? `Day ${day}`}
      </button>
    `).join('');

    // Build panels
    const panelsHtml = days.map((day, i) => `
      <div
        id="agenda-day-${day}"
        class="agenda-content${i === 0 ? ' active' : ''}"
        role="tabpanel"
      >
        <div class="glass-card">
          <div class="programme" role="list">
            <!-- Column header (desktop only) -->
            <div class="programme__head" role="presentation">
              <span>${lang === 'en' ? 'Time' : 'Masa'}</span>
              <span>${lang === 'en' ? 'Programme' : 'Atur Cara'}</span>
              <span>${lang === 'en' ? 'Venue' : 'Lokasi'}</span>
            </div>
            ${(byDay[day] || []).map(row => {
              const typeConf = PROGRAMME_TYPES[row.type] || {};
              const badge = typeConf.css
                ? `<span class="type-badge ${typeConf.css}">${lang === 'en' ? typeConf.label_en : typeConf.label_ms}</span>`
                : '';
              const title   = (lang === 'en' ? row.title_en : row.title_ms) || row.title_ms || row.title_en || '';
              const speaker = (lang === 'en' ? row.speaker_en : row.speaker_ms) || row.speaker || '';
              const role    = (lang === 'en' ? row.role_en : row.role_ms) || '';
              const org     = (lang === 'en' ? row.organisation_en : row.organisation_ms) || '';
              const venue   = (lang === 'en' ? row.venue_en   : row.venue_ms)   || row.venue   || '';

              // Role · Organisation — secondary meta under the name (only when filled).
              const speakerMeta = [role, org].filter(Boolean).join(' · ');

              // Speaker renders ONLY when present — under the title, visually secondary.
              const speakerHtml = speaker
                ? `<p class="prog-speaker">${hicon('user')}<span class="prog-speaker__name">${speaker}</span></p>` +
                  (speakerMeta ? `<p class="prog-speaker__meta">${speakerMeta}</p>` : '')
                : '';
              // Keep the venue column present (empty) so the 3-col grid stays aligned.
              const venueHtml = venue
                ? `<div class="prog-venue">${hicon('map-pin')}<span>${venue}</span></div>`
                : `<div class="prog-venue" aria-hidden="true"></div>`;

              return `
                <div class="prog-row" role="listitem">
                  <div class="prog-time">${timeRange(row.time_start, row.time_end)}</div>
                  <div class="prog-main">
                    <p class="prog-title">${title}</p>
                    ${badge}
                    ${speakerHtml}
                  </div>
                  ${venueHtml}
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="agenda-tabs" role="tablist" aria-label="${t('section_programme')}">
        ${tabsHtml}
      </div>
      <div class="agenda-panels">
        ${panelsHtml}
      </div>`;

    // Attach tab click logic
    container.querySelectorAll('.agenda-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.agenda-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        container.querySelectorAll('.agenda-content').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panel = $(`agenda-day-${btn.dataset.day}`);
        if (panel) panel.classList.add('active');
      });
    });

  } catch (err) {
    console.error('[CMIP] renderProgramme error:', err);
    setError(container);
  }
}


/* ============================================================
   SPEAKERS
   ============================================================ */

/**
 * Render the speakers grid.
 * @param {string} containerId
 */
export async function renderSpeakers(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const speakers = await fetchSpeakers();

    if (!speakers?.length) {
      setEmpty(container);
      return;
    }

    const lang = getLang();

    // Keep only rows that actually have a name (ignore blank rows)
    const list = speakers.filter(sp => sp && (sp.name_ms || sp.name_en));

    if (!list.length) {
      setEmpty(container);
      return;
    }

    container.innerHTML = `
      <div class="speaker-grid">
        ${list.map((sp, i) => {
          // Sheet columns: name_ms/en, role_ms/en, organisation_ms/en, session, photo_url
          const name    = (lang === 'en' ? sp.name_en : sp.name_ms) || sp.name_ms || sp.name_en || '';
          const role    = (lang === 'en' ? sp.role_en : sp.role_ms) || sp.role_ms || sp.role_en || '';
          const org     = (lang === 'en' ? sp.organisation_en : sp.organisation_ms) || sp.organisation_ms || sp.organisation_en || '';
          const session = sp.session || '';
          const photo   = safePhoto(sp.photo_url, name);

          return `
            <div class="speaker-card reveal" data-delay="${Math.min(i + 1, 5)}">
              <img
                class="speaker-card__photo"
                src="${photo}"
                alt="${name}"
                loading="lazy"
                onerror="this.onerror=null; this.src='${safePhoto('', name)}'"
              >
              <div class="speaker-card__name">${name}</div>
              ${role    ? `<div class="speaker-card__role">${role}</div>` : ''}
              ${org     ? `<div class="speaker-card__org">${org}</div>` : ''}
              ${session ? `<div class="speaker-card__topic">${session}</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;

    // Re-init reveal for newly added elements
    initScrollReveal();

  } catch (err) {
    console.error('[CMIP] renderSpeakers error:', err);
    setError(container);
  }
}


/* ============================================================
   DOWNLOADS
   ============================================================ */

/**
 * Render download cards.
 * @param {string} containerId
 * @param {'main'|'rise'|undefined} [section]
 */
export async function renderDownloads(containerId, section) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchDownloads(section);

    if (!items?.length) {
      setEmpty(container);
      return;
    }

    const lang = getLang();

    container.innerHTML = `
      <div class="download-grid">
        ${items.map(item => {
          const title = lang === 'en' ? item.title_en : item.title_ms;
          const icon  = fileIcon(item.file_type);
          const url   = item.drive_url || '#';

          return `
            <div class="download-card reveal">
              <div class="download-card__icon">${icon}</div>
              <div class="download-card__meta">
                <div class="download-card__title">${title}</div>
                <div class="download-card__type">${item.file_type?.toUpperCase() || 'FILE'}</div>
                <a
                  class="download-card__btn"
                  href="${url}"
                  target="_blank"
                  rel="noopener noreferrer"
                  ${url === '#' ? 'aria-disabled="true"' : ''}
                >
                  ${hicon('arrow-down-tray')} ${t('download')}
                </a>
              </div>
            </div>`;
        }).join('')}
      </div>`;

    initScrollReveal();

  } catch (err) {
    console.error('[CMIP] renderDownloads error:', err);
    setError(container);
  }
}


/* ============================================================
   GALLERY
   ============================================================ */

/**
 * Render the gallery as a simple per-day directory of cards.
 * Each card links to that day's Google Drive / Photos folder
 * (from GALLERY.days in config.js). If a folder URL isn't set yet,
 * the button is disabled and a "available after the event" note shows.
 * @param {string} containerId
 */
export function renderGallery(containerId) {
  const container = $(containerId);
  if (!container) return;

  const lang = getLang();
  const days = (GALLERY && GALLERY.days) || [];

  container.innerHTML = `
    <div class="gallery-dir-grid">
      ${days.map((d, i) => {
        const title    = lang === 'en' ? `Day ${d.day} (${d.date_en})` : `Hari ${d.day} (${d.date_ms})`;
        const desc     = lang === 'en'
          ? `Photos and highlights from Day ${d.day} of the conference.`
          : `Foto dan sorotan sepanjang Hari ${d.day} persidangan.`;
        const url      = String(d.url || '').trim();
        const ready    = url && !/replace/i.test(url) && url !== '#';
        const btnLabel = lang === 'en' ? 'View Gallery' : 'Lihat Galeri';
        const soon     = lang === 'en'
          ? 'The gallery will be available after the event.'
          : 'Galeri akan tersedia selepas majlis berlangsung.';

        return `
          <div class="gallery-day-card reveal" data-delay="${i + 1}">
            <div class="gallery-day-card__icon" aria-hidden="true">${hicon('photo')}</div>
            <div class="gallery-day-card__title">${title}</div>
            <p class="gallery-day-card__desc">${desc}</p>
            ${ready
              ? `<a class="btn btn--gold btn--sm gallery-day-card__btn" href="${url}" target="_blank" rel="noopener noreferrer">${btnLabel}</a>`
              : `<button class="btn btn--outline btn--sm gallery-day-card__btn" type="button" disabled aria-disabled="true">${btnLabel}</button>
                 <p class="gallery-day-card__note">${soon}</p>`}
          </div>`;
      }).join('')}
    </div>`;

  initScrollReveal();
}

/** Attach lightbox open/close events. */
function initLightbox() {
  const lightbox  = $('lightbox');
  const imgEl     = $('lightbox-img');
  const closeBtn  = $('lightbox-close');
  if (!lightbox || !imgEl) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      imgEl.src = item.dataset.src || '';
      imgEl.alt = item.dataset.caption || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    imgEl.src = '';
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });
}


/* ============================================================
   FAQ ACCORDION
   ============================================================ */

/**
 * Render FAQ accordion.
 * @param {string} containerId
 * @param {'main'|'rise'|undefined} [section]
 */
export async function renderFaq(containerId, section) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchFaq(section);

    if (!items?.length) {
      setEmpty(container);
      return;
    }

    const lang = getLang();

    container.innerHTML = `
      <div class="faq-list">
        ${items.map((item, i) => {
          const q = lang === 'en' ? item.question_en : item.question_ms;
          const a = lang === 'en' ? item.answer_en   : item.answer_ms;
          return `
            <div class="faq-item" id="faq-item-${i}">
              <button
                class="faq-question"
                aria-expanded="false"
                aria-controls="faq-answer-${i}"
              >
                <span>${q}</span>
                <span class="faq-question__icon" aria-hidden="true">+</span>
              </button>
              <div class="faq-answer" id="faq-answer-${i}" role="region">
                <p>${a}</p>
              </div>
            </div>`;
        }).join('')}
      </div>`;

    initFaqAccordion(container);

  } catch (err) {
    console.error('[CMIP] renderFaq error:', err);
    setError(container);
  }
}

/**
 * Attach accordion toggle logic to rendered FAQ items.
 * @param {HTMLElement} [scope] — defaults to document
 */
export function initFaqAccordion(scope = document) {
  scope.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item    = btn.closest('.faq-item');
      const isOpen  = item.classList.contains('open');

      // Close all others in the same list
      btn.closest('.faq-list')?.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}


/* ============================================================
   SPONSORS
   ============================================================ */

/**
 * Render sponsors/partners logo wall.
 * @param {string} containerId
 */
export async function renderSponsors(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchSponsors();

    if (!items?.length) {
      setEmpty(container);
      return;
    }

    const lang = getLang();

    container.innerHTML = `
      <div class="sponsors-grid">
        ${items.map(item => {
          const name = lang === 'en' ? item.full_name_en : item.full_name_ms;
          const logo = item.logo_url ? driveThumb(item.logo_url, 200) : '';
          const href = item.website || '#';

          return `
            <a
              class="sponsor-item"
              href="${href}"
              target="${href !== '#' ? '_blank' : '_self'}"
              rel="noopener noreferrer"
              title="${name}"
            >
              ${logo
                ? `<img src="${logo}" alt="${name}" loading="lazy">`
                : `<span class="sponsor-item__text">${item.name || name}</span>`
              }
            </a>`;
        }).join('')}
      </div>`;

  } catch (err) {
    console.error('[CMIP] renderSponsors error:', err);
    setError(container);
  }
}


/* ============================================================
   CONTACT
   ============================================================ */

/**
 * Render contact / committee cards.
 * @param {string} containerId
 */
export async function renderContact(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchContact();

    if (!items?.length) {
      setEmpty(container);
      return;
    }

    const lang = getLang();

    // Left → right follows the sheet's `order` column (NCPCE first, RISE next).
    const ordered = [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    container.innerHTML = `
      <div class="contact-grid">
        ${ordered.map(item => {
          const name = item.name || (lang === 'en' ? item.name_en : item.name_ms) || '';
          const role = lang === 'en' ? item.role_en : item.role_ms;
          const tag  = item.tag || '';
          return `
            <div class="contact-card reveal">
              ${tag ? `<div class="contact-card__tag">${tag}</div>` : ''}
              <div class="contact-card__name">${name}</div>
              ${role ? `<div class="contact-card__role">${role}</div>` : ''}
              ${item.email
                ? `<a class="contact-card__email" href="mailto:${item.email}">${item.email}</a>`
                : ''}
              ${item.phone
                ? `<div class="contact-card__email" style="margin-top:0.5rem;">${item.phone}</div>`
                : ''}
            </div>`;
        }).join('')}
      </div>`;

    initScrollReveal();

  } catch (err) {
    console.error('[CMIP] renderContact error:', err);
    setError(container);
  }
}


/* ============================================================
   ABOUT — from site config
   ============================================================ */

/**
 * Render the About section text from site config.
 * @param {string} containerId
 */
export async function renderAbout(containerId) {
  const container = $(containerId);
  if (!container) return;

  try {
    const cfg  = await fetchSiteConfig();
    const lang = getLang();
    const text = lang === 'en' ? cfg.about_en : cfg.about_ms;
    const mil  = lang === 'en' ? cfg.milestone_desc_en : cfg.milestone_desc_ms;

    if (text) {
      const aboutText = container.querySelector('[data-about-text]');
      if (aboutText) aboutText.textContent = text;
    }
    if (mil) {
      const milText = container.querySelector('[data-milestone-text]');
      if (milText) milText.textContent = mil;
    }
  } catch (err) {
    console.warn('[CMIP] renderAbout: could not load config', err);
  }
}


/* ============================================================
   AWARDS / GENERAL TABS
   ============================================================ */

/**
 * Initialise general tab switching for Awards section.
 * Expects: .tab-nav-btn[data-target="PANEL_ID"] + .tab-panel[id="PANEL_ID"]
 */
export function initAwardsTabs() {
  const container = $q('.tab-container');
  if (!container) return;

  container.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;

      container.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = $(targetId);
      if (panel) panel.classList.add('active');
    });
  });
}


/* ============================================================
   RISE — CATEGORIES (rendered from config, not Sheets)
   ============================================================ */

/**
 * Render RISE category cards from config.js (no API call needed).
 * @param {string} containerId
 */
export function renderRiseCategories(containerId) {
  const container = $(containerId);
  if (!container) return;

  const lang = getLang();

  container.innerHTML = `
    <div class="rise-cat-grid">
      ${RISE_CONFIG.categories.map((cat, idx) => {
        const title  = lang === 'en' ? cat.title_en  : cat.title_ms;
        const type   = lang === 'en' ? cat.type_en   : cat.type_ms;
        const method = lang === 'en' ? cat.method_en : cat.method_ms;
        const label  = lang === 'en' ? cat.label_en  : cat.label_ms;

        return `
          <div class="rise-cat-card reveal" data-delay="${idx + 1}">
            <div class="rise-cat-card__badge-wrap">
              <div class="rise-cat-card__badge">${label}</div>
            </div>
            <div class="rise-cat-card__title">${title}</div>
            <a href="#rise-gallery" class="btn btn--outline btn--sm rise-cat-card__cta"
               onclick="window._riseOpenAccordion && window._riseOpenAccordion('${cat.num}')">
              ${lang === 'en' ? 'Accepted Entries' : 'Senarai Penyertaan'} →
            </a>
          </div>`;
      }).join('')}
    </div>`;

  initScrollReveal();
}


/* ============================================================
   RISE — GALLERY HEADING UPDATER
   ============================================================ */

/**
 * Update the dynamic heading of the gallery section based on the selected filter.
 * @param {string} catNum — '01'|'02'|'03'|'all'
 */
function _updateGalleryHeading(catNum) {
  const subtitle = document.getElementById('rise-gallery-subtitle');
  if (!subtitle) return;

  const lang = getLang();

  if (!catNum || catNum === 'all') {
    subtitle.textContent = lang === 'en' ? 'All Categories' : 'Semua Kategori';
    return;
  }

  const cat = RISE_CONFIG.categories.find(c => String(c.num) === String(catNum));
  if (!cat) return;

  subtitle.textContent = lang === 'en' ? cat.title_en : cat.title_ms;
}


/* ============================================================
   RISE — POSTER / ABSTRACT GALLERY
   ============================================================ */

/**
 * Render RISE poster/abstract gallery from Sheets.
 * @param {string} containerId
 * @param {'poster'|'kolokium'|'qip'|undefined} [category]
 */
export async function renderRiseGallery(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchRise();

    if (!items?.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:4rem 1rem; color:rgba(var(--clr-cream-rgb),0.5);">
          <div style="font-size:3rem; margin-bottom:1rem;">${hicon('clock')}</div>
          <p style="font-size:1.1rem;">Senarai pembentangan akan dikemaskini tidak lama lagi.</p>
          <p style="font-size:0.85rem; margin-top:0.5rem; opacity:0.6;">Presentation list will be updated soon.</p>
        </div>`;
      return;
    }

    const lang = getLang();

    /* ── Group items by category ── */
    const grouped = {};
    RISE_CONFIG.categories.forEach(cat => {
      grouped[cat.num] = items
        .filter(item => String(item.category) === String(cat.num))
        .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
    });

    /* ── Build accordion sections ── */
    const sectionsHtml = RISE_CONFIG.categories.map((cat, idx) => {
      const entries   = grouped[cat.num] || [];
      const label     = lang === 'en' ? cat.label_en : cat.label_ms;
      const title     = lang === 'en' ? cat.title_en : cat.title_ms;
      const isOpen    = idx === 0;
      const countText = `${entries.length} ${lang === 'en' ? 'entries' : 'penyertaan'}`;

      const rowsHtml = entries.length === 0
        ? `<tr><td colspan="6" class="rise-table__empty">
             ${lang === 'en' ? 'No entries yet.' : 'Tiada penyertaan buat masa ini.'}
           </td></tr>`
        : entries.map((item, i) => {
            const rowTitle      = item.title       || '—';
            const rowAuthor     = item.author      || '—';
            const rowBranch     = item.branch      || '—';
            const rowAbstract   = item.abstract_url || '';
            const rowPoster     = item.poster_url   || '';

            const abstractHtml = rowAbstract
              ? `<a class="rise-table__action-btn" href="${rowAbstract}" target="_blank" rel="noopener" aria-label="Abstrak / Abstract">${hicon('document-text')}</a>`
              : `<span class="rise-table__no-action">—</span>`;

            const posterHtml = rowPoster
              ? `<a class="rise-table__action-btn" href="${rowPoster}" target="_blank" rel="noopener" aria-label="Poster">${hicon('photo')}</a>`
              : `<span class="rise-table__no-action">—</span>`;

            return `
              <tr class="rise-table__row">
                <td class="rise-table__num">${i + 1}</td>
                <td class="rise-table__title">${rowTitle}</td>
                <td class="rise-table__author">${rowAuthor}</td>
                <td class="rise-table__branch">${rowBranch}</td>
                <td class="rise-table__abstract">${abstractHtml}</td>
                <td class="rise-table__poster">${posterHtml}</td>
              </tr>`;
          }).join('');

      return `
        <div class="rise-accordion" data-cat="${cat.num}">
          <button class="rise-accordion__hdr${isOpen ? ' is-open' : ''}"
                  aria-expanded="${isOpen}"
                  data-acc-toggle="${cat.num}">
            <div class="rise-accordion__hdr-left">
              <span class="rise-accordion__icon">${hicon(cat.icon || 'clipboard')}</span>
              <div>
                <div class="rise-accordion__label">${label}</div>
                <div class="rise-accordion__subtitle">${title}</div>
              </div>
            </div>
            <div class="rise-accordion__hdr-right">
              <span class="rise-accordion__count">${countText}</span>
              <span class="rise-accordion__arrow" aria-hidden="true">▼</span>
            </div>
          </button>
          <div class="rise-accordion__body${isOpen ? ' is-open' : ''}">
            <div class="rise-table-wrap">
              <table class="rise-table">
                <colgroup>
                  <col class="rise-table__col-num">
                  <col class="rise-table__col-title">
                  <col class="rise-table__col-author">
                  <col class="rise-table__col-branch">
                  <col class="rise-table__col-abstract">
                  <col class="rise-table__col-poster">
                </colgroup>
                <thead>
                  <tr>
                    <th class="rise-table__num">#</th>
                    <th class="rise-table__title">${lang === 'en' ? 'Title' : 'Tajuk'}</th>
                    <th class="rise-table__author">${lang === 'en' ? 'Presenter' : 'Pembentang'}</th>
                    <th class="rise-table__branch">${lang === 'en' ? 'Branch / State' : 'Cawangan / Negeri'}</th>
                    <th class="rise-table__abstract">${lang === 'en' ? 'Abstract' : 'Abstrak'}</th>
                    <th class="rise-table__poster">${lang === 'en' ? 'Poster' : 'Poster'}</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = sectionsHtml;

    /* ── Accordion toggle logic ── */
    container.querySelectorAll('[data-acc-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const body    = btn.nextElementSibling;
        const isOpen  = body.classList.contains('is-open');
        body.classList.toggle('is-open', !isOpen);
        btn.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    /* ── Global helper: open specific accordion from category cards ── */
    window._riseOpenAccordion = (catNum) => {
      container.querySelectorAll('.rise-accordion__hdr').forEach(btn => {
        const acc   = btn.closest('.rise-accordion');
        const body  = btn.nextElementSibling;
        const match = acc.dataset.cat === String(catNum);
        body.classList.toggle('is-open', match);
        btn.classList.toggle('is-open', match);
        btn.setAttribute('aria-expanded', String(match));
      });
      // Scroll to the opened accordion after short delay
      setTimeout(() => {
        const target = container.querySelector(`.rise-accordion[data-cat="${catNum}"] .rise-accordion__hdr`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    };

  } catch (err) {
    console.error('[CMIP] renderRiseGallery error:', err);
    setError(container);
  }
}

/**
 * Init RISE poster lightbox — mobile-friendly full-screen overlay.
 * Uses window.__riseThumb() as the trigger (set from card onclick).
 */
function _initRiseLightbox() {
  const LB_ID = 'rise-lightbox';

  if (!document.getElementById(LB_ID)) {
    const lb = document.createElement('div');
    lb.id = LB_ID;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Poster viewer');
    lb.innerHTML = `
      <div class="rise-lb__backdrop"></div>
      <div class="rise-lb__panel">
        <div class="rise-lb__toolbar">
          <span class="rise-lb__title"></span>
          <button class="rise-lb__close" aria-label="Tutup">${hicon('x-mark')}</button>
        </div>
        <div class="rise-lb__img-wrap">
          <img class="rise-lb__img" src="" alt="" draggable="false">
        </div>
        <div class="rise-lb__btns"></div>
      </div>`;
    document.body.appendChild(lb);

    /* Close handlers */
    lb.querySelector('.rise-lb__backdrop').addEventListener('click', _closeRiseLb);
    lb.querySelector('.rise-lb__close').addEventListener('click', _closeRiseLb);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeRiseLb(); });

    /* Inject lightbox CSS */
    if (!document.getElementById('rise-lb-style')) {
      const s = document.createElement('style');
      s.id = 'rise-lb-style';
      s.textContent = `
        #rise-lightbox { display:none; position:fixed; inset:0; z-index:9999; }
        #rise-lightbox.open { display:flex; align-items:center; justify-content:center; }
        .rise-lb__backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.92); }
        .rise-lb__panel {
          position:relative; z-index:1; display:flex; flex-direction:column;
          width:min(95vw,860px); max-height:94vh;
          background:var(--clr-primary-deep,#280000);
          border:1px solid rgba(250,206,92,0.25); border-radius:12px; overflow:hidden;
        }
        .rise-lb__toolbar {
          display:flex; align-items:center; justify-content:space-between;
          padding:0.75rem 1rem; border-bottom:1px solid rgba(250,206,92,0.15);
          background:rgba(0,0,0,0.3);
        }
        .rise-lb__title { color:var(--clr-gold,#FACE5C); font-size:0.85rem; font-weight:600; flex:1; margin-right:1rem; }
        .rise-lb__close {
          background:none; border:1px solid rgba(250,206,92,0.3); color:var(--clr-gold,#FACE5C);
          width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:1rem; flex-shrink:0;
        }
        .rise-lb__img-wrap { flex:1; overflow:auto; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .rise-lb__img { max-width:100%; max-height:70vh; object-fit:contain; border-radius:4px; }
        .rise-lb__btns { display:flex; gap:0.75rem; justify-content:center; padding:0.75rem 1rem; flex-wrap:wrap; border-top:1px solid rgba(250,206,92,0.1); }
        /* Card thumbnail styles */
        .rise-poster-card__thumb { position:relative; cursor:pointer; overflow:hidden; background:rgba(0,0,0,0.2); aspect-ratio:3/4; }
        .rise-poster-card__thumb img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .rise-poster-card__thumb:hover img { transform:scale(1.04); }
        .rise-poster-card__zoom-hint {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,0.45); color:#fff; font-size:0.85rem; font-weight:600;
          opacity:0; transition:opacity 0.25s;
        }
        .rise-poster-card__thumb:hover .rise-poster-card__zoom-hint { opacity:1; }
        .rise-poster-card__no-img {
          width:100%; height:100%; min-height:180px; display:flex; align-items:center;
          justify-content:center; font-size:3rem; opacity:0.3;
        }
        .rise-poster-card__actions { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem; }
        .rise-poster-card__actions .btn { flex:1; min-width:100px; text-align:center; }
        .rise-poster-grid {
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(260px,1fr));
          gap:1.5rem;
        }
        @media (max-width:480px) {
          .rise-poster-grid { grid-template-columns: 1fr; }
          .rise-poster-card__actions .btn { flex:1 1 100%; }
        }
      `;
      document.head.appendChild(s);
    }
  }

  window.__riseThumb = function(imgUrl, title, posterPdfUrl, abstractUrl) {
    const lb = document.getElementById(LB_ID);
    if (!lb) return;
    lb.querySelector('.rise-lb__img').src  = imgUrl;
    lb.querySelector('.rise-lb__img').alt  = title;
    lb.querySelector('.rise-lb__title').textContent = title;

    const btns = lb.querySelector('.rise-lb__btns');
    btns.innerHTML = '';
    if (posterPdfUrl) {
      const a = document.createElement('a');
      a.href = posterPdfUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'btn btn--gold btn--sm';
      a.innerHTML = `${hicon('photo')} Poster PDF`;
      btns.appendChild(a);
    }
    if (abstractUrl) {
      const a = document.createElement('a');
      a.href = abstractUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'btn btn--outline btn--sm';
      a.innerHTML = `${hicon('document-text')} Abstrak`;
      btns.appendChild(a);
    }

    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
}

function _closeRiseLb() {
  const lb = document.getElementById('rise-lightbox');
  if (lb) { lb.classList.remove('open'); document.body.style.overflow = ''; }
}


/* ============================================================
   RISE — DOWNLOADS
   ============================================================ */

/** Render RISE-specific downloads. Delegates to renderDownloads. */
export async function renderRiseDownloads(containerId) {
  return renderDownloads(containerId, 'rise');
}


/* ============================================================
   RISE — VOTING STUB
   ============================================================ */

/**
 * Render the voting card.
 * Reads RISE_CONFIG.voting.status ('before' | 'open' | 'closed')
 * and renders the appropriate button state automatically.
 * To update: change only RISE_CONFIG.voting.status (and url when 'open').
 * @param {string} containerId
 */
export function renderVoting(containerId) {
  const container = $(containerId);
  if (!container) return;

  const cfg    = RISE_CONFIG.voting;
  const status = cfg.status || 'before';  // 'before' | 'open' | 'closed'

  /* ── Static labels (no config needed) ── */
  const CARD_TITLE = 'SISTEM UNDIAN';
  const CARD_DESC  = 'Klik butang di bawah untuk mengakses Sistem Undian Anugerah Pilihan RISE.';

  /* ── State-specific rendering ── */
  let buttonHtml;
  let messageHtml = '';

  if (status === 'open') {
    const isConfigured = cfg.url && !cfg.url.includes('REPLACE_WITH');
    buttonHtml = isConfigured
      ? `<a
           class="btn btn--gold"
           href="${cfg.url}"
           target="_blank"
           rel="noopener noreferrer"
           style="margin-top:var(--sp-6); display:inline-flex;"
         >
           ${hicon('check-badge')} UNDI SEKARANG
         </a>`
      : `<p class="voting-stub__text" style="color:rgba(250,206,92,0.5); font-size:0.8rem; margin-top:var(--sp-4);">
           [URL belum dikonfigurasi — kemaskini voting.url dalam config.js]
         </p>`;

    messageHtml = `
      <p class="voting-stub__text" style="margin-top:var(--sp-5); font-size:0.85rem;">
        Akses kepada sistem pengundian akan dibuka pada 28 Julai 2026 (Selasa), 8.00 pagi hingga 5.00 petang. Pengundian hanya boleh dibuat dalam tempoh yang ditetapkan.
      </p>`;

  } else if (status === 'closed') {
    buttonHtml = `
      <button class="btn btn--outline" disabled style="margin-top:var(--sp-6); opacity:0.45; cursor:not-allowed;">
        ${hicon('lock-closed')} UNDIAN TELAH DITUTUP
      </button>`;
    messageHtml = `
      <p class="voting-stub__text" style="margin-top:var(--sp-4);">
        Terima kasih atas penyertaan anda. Sistem undian telah ditutup.
      </p>`;

  } else {
    /* 'before' — default */
    buttonHtml = `
      <button class="btn btn--outline" disabled style="margin-top:var(--sp-6); opacity:0.45; cursor:not-allowed;">
        ${hicon('clock')} UNDIAN BELUM DIBUKA
      </button>`;
    messageHtml = `
      <p class="voting-stub__text" style="margin-top:var(--sp-4);">
        Sistem undian akan dibuka semasa tempoh persidangan.
      </p>`;
  }

  container.innerHTML = `
    <div class="voting-stub" style="${status === 'open' ? 'border-color:rgba(250,206,92,0.6);' : ''}">
      <div class="voting-stub__icon">${hicon('check-badge')}</div>
      <div class="voting-stub__title">${CARD_TITLE}</div>
      <p class="voting-stub__text">${CARD_DESC}</p>
      ${buttonHtml}
      ${messageHtml}
    </div>`;
}


/* ============================================================
   SECTION NAV — scroll-progress bar + active-pill auto-scroll
   Active-link highlighting is handled by initNav() (scroll spy
   already targets "#conf-subnav a").
   ============================================================ */

/** Initialise the sticky section sub-nav progress bar + mobile auto-scroll. */
export function initSectionNav() {
  const nav = $('conf-subnav');
  if (!nav) return;

  const bar   = $('section-progress');
  const inner = nav.querySelector('.section-nav__inner');

  // Scroll-progress fill across the whole page
  const updateProgress = () => {
    if (!bar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    bar.style.width = `${pct.toFixed(2)}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  // Keep the active pill in view on mobile (horizontal scroll)
  if (inner) {
    const mo = new MutationObserver(() => {
      const active = inner.querySelector('a.active');
      if (!active) return;
      const target = active.offsetLeft - inner.clientWidth / 2 + active.offsetWidth / 2;
      inner.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    });
    inner.querySelectorAll('a').forEach(a =>
      mo.observe(a, { attributes: true, attributeFilter: ['class'] })
    );
  }
}


/* ============================================================
   ANNOUNCEMENT BANNER
   Live-editable notice driven by the `config` sheet.
   Add these keys to the config sheet to control it (no redeploy):
     announcement_active  → yes | no      (turns the banner on/off)
     announcement_ms      → Malay text
     announcement_en      → English text
     announcement_level   → info | warning (colour; optional)
   ============================================================ */

const _ANN_DISMISS_KEY = 'cmip_ann_dismissed';

/**
 * Render (or hide) the announcement banner from site config.
 * @param {string} containerId
 */
export async function renderAnnouncement(containerId) {
  const el = $(containerId);
  if (!el) return;

  try {
    const cfg    = await fetchSiteConfig();
    const raw    = String(cfg.announcement_active ?? '').trim().toLowerCase();
    const isOn   = ['yes', 'true', '1', 'ya', 'on'].includes(raw);
    const lang   = getLang();
    const msg    = lang === 'en'
      ? (cfg.announcement_en || cfg.announcement_ms || '')
      : (cfg.announcement_ms || cfg.announcement_en || '');

    if (!isOn || !msg) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    // Respect a per-message dismissal for this browser session
    let dismissed = '';
    try { dismissed = sessionStorage.getItem(_ANN_DISMISS_KEY) || ''; } catch (_) {}
    if (dismissed === msg) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    const level = String(cfg.announcement_level ?? 'info').trim().toLowerCase();
    el.hidden = false;
    el.className = `announce announce--${level === 'warning' ? 'warning' : 'info'}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="announce__inner">
        <span class="announce__icon" aria-hidden="true">${hicon('megaphone')}</span>
        <span class="announce__text">${msg}</span>
        <button class="announce__close" aria-label="${lang === 'en' ? 'Dismiss' : 'Tutup'}">${hicon('x-mark')}</button>
      </div>`;

    el.querySelector('.announce__close')?.addEventListener('click', () => {
      el.hidden = true;
      try { sessionStorage.setItem(_ANN_DISMISS_KEY, msg); } catch (_) {}
    });

  } catch (err) {
    console.warn('[CMIP] renderAnnouncement:', err);
    el.hidden = true;
  }
}


/* ============================================================
   NOW / NEXT SESSION INDICATOR
   Auto-highlights the current and upcoming session using the
   existing programme data. Time is resolved in Malaysia time
   (Asia/Kuala_Lumpur) so it is correct regardless of the
   visitor's device timezone.
   ============================================================ */

/** Current wall-clock time in Malaysia, as a comparable UTC-based number. */
function _mytNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value;
  let hh = Number(get('hour'));
  if (hh === 24) hh = 0;   // some engines emit '24' for midnight
  return Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day')), hh, Number(get('minute')));
}

/** Comparable value for a session on conference day `d` at "HH:MM". */
function _sessionVal(day, hhmm) {
  const [by, bm, bd] = CONFERENCE.dates.start.slice(0, 10).split('-').map(Number);
  const [h, m] = fmtTime(hhmm).split(':').map(Number);
  return Date.UTC(by, bm - 1, bd + (Number(day) - 1), h || 0, m || 0);
}

/**
 * Fetch programme, build a sorted session list, and paint the indicator.
 * @param {string} containerId
 */
export async function renderNowNext(containerId) {
  const el = $(containerId);
  if (!el) return;

  try {
    const byDay = await fetchProgrammeAll();
    const rows = Object.values(byDay).flat()
      .filter(r => r && r.time_start)
      .map(r => ({
        ...r,
        _s: _sessionVal(r.day, r.time_start),
        _e: _sessionVal(r.day, r.time_end || r.time_start),
      }))
      .sort((a, b) => a._s - b._s);

    if (!rows.length) { el.hidden = true; return; }

    el._nnRows = rows;   // cached for the ticker
    _paintNowNext(el);
  } catch (err) {
    console.warn('[CMIP] renderNowNext:', err);
    el.hidden = true;
  }
}

/** Paint the Now/Next card from cached rows + current MYT time. */
function _paintNowNext(el) {
  const rows = el._nnRows;
  if (!rows || !rows.length) return;

  const now   = _mytNow();
  const lang  = getLang();
  const first = rows[0];
  const last  = rows[rows.length - 1];

  const title = r => (lang === 'en' ? r.title_en : r.title_ms) || '';
  const venue = r => (lang === 'en' ? r.venue_en : r.venue_ms) || r.venue || '';
  const range = r => timeRange(r.time_start, r.time_end);
  const meta  = r => `${range(r)}${venue(r) ? ' · ' + venue(r) : ''}`;

  const L = {
    head:  lang === 'en' ? 'Live now'          : 'Kini Berlangsung',
    now:   lang === 'en' ? 'Now'               : 'Berlangsung',
    next:  lang === 'en' ? 'Next'              : 'Seterusnya',
    soon:  lang === 'en' ? 'Starting soon'     : 'Akan Bermula',
    brk:   lang === 'en' ? 'Break'             : 'Rehat',
    firstS:lang === 'en' ? 'First session'     : 'Sesi Pertama',
    nobody:lang === 'en' ? 'No session in progress' : 'Tiada sesi sedang berlangsung',
    ended: lang === 'en' ? 'The conference has concluded. Thank you!' : 'Persidangan telah tamat. Terima kasih!',
  };

  const row = (badge, cls, titleHtml, metaHtml) => `
    <div class="now-next__row${cls ? ' ' + cls : ''}">
      <span class="now-next__badge${cls === 'now-next__row--live' ? ' now-next__badge--live' : (badge === L.next ? ' now-next__badge--next' : '')}">${badge}</span>
      <div class="now-next__body">
        ${titleHtml ? `<div class="now-next__title">${titleHtml}</div>` : ''}
        ${metaHtml ? `<div class="now-next__meta">${metaHtml}</div>` : ''}
      </div>
    </div>`;

  let body = '';

  if (now < first._s) {
    body = row(L.soon, '', title(first), `${L.firstS} · ${meta(first)}`);
  } else if (now >= last._e) {
    body = row(hicon('check'), '', L.ended, '');
  } else {
    const current = rows.find(r => now >= r._s && now < r._e);
    const next    = rows.find(r => r._s > now);
    body += current
      ? row(L.now, 'now-next__row--live', title(current), meta(current))
      : row(L.brk, '', '', L.nobody);
    if (next) body += row(L.next, '', title(next), meta(next));
  }

  el.hidden = false;
  el.innerHTML = `<div class="now-next__head">${L.head}</div>${body}`;
}

/**
 * Start the Now/Next auto-refresh (repaints every 30s from cached rows).
 * @param {string} containerId
 */
export function initNowNext(containerId) {
  const el = $(containerId);
  if (!el) return;
  setInterval(() => { if (el._nnRows) _paintNowNext(el); }, 30_000);
}


/* ============================================================
   LANGUAGE CHANGE — RE-RENDER
   Called by lang.js after toggling the active language.
   Re-renders all data-driven sections with the new language.
   ============================================================ */

/**
 * Re-render all dynamic sections after a language switch.
 * Only re-renders sections that are present on the current page.
 */
export async function reRenderAll() {
  const jobs = [];

  if ($('announcement-bar'))     jobs.push(renderAnnouncement('announcement-bar'));
  if ($('now-next'))             jobs.push(renderNowNext('now-next'));

  if ($('programme-container'))  jobs.push(renderProgramme('programme-container'));
  if ($('speakers-container'))   jobs.push(renderSpeakers('speakers-container'));
  if ($('downloads-container'))  jobs.push(renderDownloads('downloads-container', 'main'));
  if ($('gallery-container'))    jobs.push(renderGallery('gallery-container'));
  if ($('faq-container'))        jobs.push(renderFaq('faq-container', 'general'));
  if ($('sponsors-container'))   jobs.push(renderSponsors('sponsors-container'));
  if ($('contact-container'))    jobs.push(renderContact('contact-container'));
  if ($('about-container'))      jobs.push(renderAbout('about-container'));

  // RISE page
  if ($('rise-categories-container')) renderRiseCategories('rise-categories-container');
  if ($('rise-gallery-container'))    jobs.push(renderRiseGallery('rise-gallery-container'));
  if ($('rise-downloads-container'))  jobs.push(renderRiseDownloads('rise-downloads-container'));
  if ($('rise-faq-container'))        jobs.push(renderFaq('rise-faq-container', 'rise'));
  if ($('rise-voting-container'))     renderVoting('rise-voting-container');

  await Promise.allSettled(jobs);
}
