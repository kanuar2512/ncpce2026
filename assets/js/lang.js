/**
 * lang.js — Bilingual Toggle (BM / EN)
 *
 * Responsibilities:
 *  - Apply saved language preference on page load
 *  - Handle toggle button click
 *  - Write active language to html[data-active-lang]
 *  - Persist preference in localStorage
 *  - Update all toggle button labels across the page
 *  - Call reRenderAll() so data-driven sections re-render
 *    in the new language
 *
 * CSS in main.css controls element visibility via:
 *   html[data-active-lang="en"] [data-lang="ms"] { display: none }
 *   html[data-active-lang="en"] [data-lang="en"] { display: revert }
 *
 * Usage in HTML:
 *   <button class="lang-toggle" aria-label="Tukar bahasa">
 *     <span data-lang="ms" class="lang-toggle__active-ms">BM</span>
 *     <span class="lang-toggle__separator">/</span>
 *     <span data-lang="en" class="lang-toggle__active-en">EN</span>
 *   </button>
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 */

'use strict';

import { reRenderAll } from './ui.js?v=20260702f';

/* ============================================================
   CONSTANTS
   ============================================================ */
const STORAGE_KEY   = 'cmip_lang';
const DEFAULT_LANG  = 'ms';
const VALID_LANGS   = ['ms', 'en'];


/* ============================================================
   CORE — READ / WRITE ACTIVE LANGUAGE
   ============================================================ */

/**
 * Get the currently active language from the DOM.
 * @returns {'ms'|'en'}
 */
export function getActiveLang() {
  const val = document.documentElement.dataset.activeLang;
  return VALID_LANGS.includes(val) ? val : DEFAULT_LANG;
}

/**
 * Apply a language to the document — sets html[data-active-lang],
 * saves to localStorage, and updates all toggle buttons.
 * Does NOT re-render data sections (call reRenderAll separately).
 *
 * @param {'ms'|'en'} lang
 */
export function applyLang(lang) {
  if (!VALID_LANGS.includes(lang)) lang = DEFAULT_LANG;

  // Set on <html> — CSS selectors read this
  document.documentElement.dataset.activeLang = lang;

  // Update <html lang> attribute for accessibility / screen readers
  document.documentElement.lang = lang === 'en' ? 'en' : 'ms';

  // Persist
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {
    // localStorage unavailable (private mode etc.) — safe to ignore
  }

  // Update all toggle buttons on the page
  _updateToggleButtons(lang);

  // Update <title> if data attributes are present
  _updatePageTitle(lang);
}

/**
 * Toggle between 'ms' and 'en'.
 * Applies the new language, then re-renders all data sections.
 */
export async function toggleLang() {
  const current = getActiveLang();
  const next    = current === 'ms' ? 'en' : 'ms';

  applyLang(next);

  // Re-render all dynamic sections in the new language
  try {
    await reRenderAll();
  } catch (err) {
    console.warn('[CMIP lang] reRenderAll error:', err);
  }
}


/* ============================================================
   TOGGLE BUTTON — VISUAL UPDATE
   ============================================================ */

/**
 * Update the visual state of all .lang-toggle buttons.
 * - Active language is highlighted in gold
 * - aria-label reflects current state
 * @param {'ms'|'en'} lang
 */
function _updateToggleButtons(lang) {
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    // Active / inactive labels
    const msSpan = btn.querySelector('.lang-toggle__active-ms');
    const enSpan = btn.querySelector('.lang-toggle__active-en');

    if (msSpan) msSpan.style.color = lang === 'ms' ? 'var(--clr-gold)' : '';
    if (enSpan) enSpan.style.color = lang === 'en' ? 'var(--clr-gold)' : '';

    // Accessibility label
    const ariaLabel = lang === 'ms'
      ? 'Tukar ke Bahasa Inggeris (Switch to English)'
      : 'Tukar ke Bahasa Malaysia (Switch to Malay)';
    btn.setAttribute('aria-label', ariaLabel);

    // Mark current state
    btn.setAttribute('data-active-lang', lang);
  });
}


/* ============================================================
   PAGE TITLE UPDATE
   ============================================================ */

/**
 * Switch the page <title> if data attributes are present on <title> or a meta tag.
 * Usage in HTML: <title data-title-ms="..." data-title-en="..."></title>
 * @param {'ms'|'en'} lang
 */
function _updatePageTitle(lang) {
  const titleEl = document.querySelector('title[data-title-ms]');
  if (!titleEl) return;
  const text = lang === 'en'
    ? titleEl.dataset.titleEn
    : titleEl.dataset.titleMs;
  if (text) titleEl.textContent = text;
}


/* ============================================================
   INIT — CALLED ONCE ON PAGE LOAD
   ============================================================ */

/**
 * Initialise the language system:
 *  1. Read saved preference from localStorage
 *  2. Apply it immediately (before data renders, so first render is correct)
 *  3. Attach click handlers to all .lang-toggle buttons
 *
 * Call this as early as possible in the page's script — before
 * any render functions run — so the first paint uses the right language.
 */
export function initLang() {
  // 1. Read saved preference
  let saved = DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID_LANGS.includes(stored)) saved = stored;
  } catch (_) {
    // localStorage blocked — use default
  }

  // 2. Apply immediately (no re-render needed — data hasn't loaded yet)
  applyLang(saved);

  // 3. Attach click handlers
  _attachToggleHandlers();
}

/**
 * Attach click handlers to all .lang-toggle buttons.
 * Uses event delegation on document so it catches buttons
 * injected into the DOM after init (e.g. inside the mobile drawer).
 */
function _attachToggleHandlers() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.lang-toggle');
    if (!btn) return;
    e.preventDefault();
    toggleLang();
  });
}