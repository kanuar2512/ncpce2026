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
  CONFERENCE, RISE as RISE_CONFIG, PROGRAMME_TYPES, FILE_ICONS,
  t, localise, getLang,
} from './config.js';

import {
  fetchSiteConfig, fetchProgrammeAll, fetchSpeakers,
  fetchRise, fetchDownloads, fetchGallery,
  fetchFaq, fetchSponsors, fetchContact,
  ApiError,
} from './api.js';


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
      <div class="error-state__icon">⚠️</div>
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
      <div class="error-state__icon">📭</div>
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
  return FILE_ICONS[type?.toLowerCase()] ?? FILE_ICONS.default;
}

/**
 * Format a time range string: "08:30 – 10:30"
 * @param {string} start
 * @param {string} [end]
 * @returns {string}
 */
function timeRange(start, end) {
  if (!end || start === end) return start;
  return `${start} – ${end}`;
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
    { threshold: 0.35 }
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
          <div class="programme-table-wrap">
            <table class="programme-table">
              <thead>
                <tr>
                  <th>${lang === 'en' ? 'Time' : 'Masa'}</th>
                  <th>${lang === 'en' ? 'Programme' : 'Atur Cara'}</th>
                  <th>${lang === 'en' ? 'Speaker' : 'Pembentang'}</th>
                  <th>${lang === 'en' ? 'Venue' : 'Lokasi'}</th>
                </tr>
              </thead>
              <tbody>
                ${(byDay[day] || []).map(row => {
                  const typeConf = PROGRAMME_TYPES[row.type] || {};
                  const badge = typeConf.css
                    ? `<br><span class="type-badge ${typeConf.css}">${lang === 'en' ? typeConf.label_en : typeConf.label_ms}</span>`
                    : '';
                  return `
                    <tr>
                      <td class="time-cell">${timeRange(row.time_start, row.time_end)}</td>
                      <td>${lang === 'en' ? row.title_en : row.title_ms}${badge}</td>
                      <td>${lang === 'en' ? (row.speaker_en || '—') : (row.speaker_ms || '—')}</td>
                      <td>${lang === 'en' ? (row.venue_en || '—') : (row.venue_ms || '—')}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
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

    container.innerHTML = `
      <div class="speaker-grid">
        ${speakers.map(sp => {
          const name  = lang === 'en' ? sp.name_en  : sp.name_ms;
          const title = lang === 'en' ? sp.title_en : sp.title_ms;
          const org   = lang === 'en' ? sp.org_en   : sp.org_ms;
          const topic = lang === 'en' ? sp.topic_en : sp.topic_ms;
          const photo = safePhoto(sp.photo_url, name);

          return `
            <div class="speaker-card reveal" data-delay="${Math.min(speakers.indexOf(sp) + 1, 5)}">
              <img
                class="speaker-card__photo"
                src="${photo}"
                alt="${name}"
                loading="lazy"
                onerror="this.src='${safePhoto('', name)}'"
              >
              <div class="speaker-card__name">${name}</div>
              <div class="speaker-card__role">${title}</div>
              <div class="speaker-card__org">${org}</div>
              ${topic ? `<div class="speaker-card__topic">"${topic}"</div>` : ''}
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
                  ⬇ ${t('download')}
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
 * Render the photo gallery grid with lightbox support.
 * Shows "Coming Soon" placeholder when gallery is empty.
 * @param {string} containerId
 */
export async function renderGallery(containerId) {
  const container = $(containerId);
  if (!container) return;

  setLoading(container);

  try {
    const items = await fetchGallery();

    if (!items?.length) {
      // Coming soon placeholder
      container.innerHTML = `
        <div class="gallery-grid">
          <div class="gallery-placeholder">
            <div class="gallery-placeholder__icon">📸</div>
            <h3 class="section-title" style="font-size:1.4rem; margin-bottom:0.5rem;">
              ${t('gallery_placeholder_title')}
            </h3>
            <p class="gallery-placeholder__text">${t('gallery_placeholder_desc')}</p>
          </div>
        </div>`;
      return;
    }

    const lang = getLang();

    container.innerHTML = `
      <div class="gallery-grid" id="gallery-grid">
        ${items.map((item, i) => {
          const url   = item.url || driveThumb(item.drive_url, 800);
          const thumb = item.thumb_url || driveThumb(item.drive_url, 400) || url;
          const title = lang === 'en' ? item.title_en : item.title_ms;
          return `
            <div class="gallery-item reveal" data-index="${i}" data-src="${url}" data-caption="${title}">
              <img src="${thumb}" alt="${title}" loading="lazy">
              <div class="gallery-item__overlay">🔍</div>
            </div>`;
        }).join('')}
      </div>

      <!-- Lightbox -->
      <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="${lang === 'en' ? 'Image preview' : 'Pratonton gambar'}">
        <button class="lightbox__close" id="lightbox-close" aria-label="${t('close')}">✕</button>
        <img class="lightbox__img" id="lightbox-img" src="" alt="">
      </div>`;

    initLightbox();
    initScrollReveal();

  } catch (err) {
    console.error('[CMIP] renderGallery error:', err);
    setError(container);
  }
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

    container.innerHTML = `
      <div class="contact-grid">
        ${items.map(item => {
          const name = lang === 'en' ? item.name_en : item.name_ms;
          const role = lang === 'en' ? item.role_en : item.role_ms;
          return `
            <div class="contact-card reveal">
              <div class="contact-card__icon">📬</div>
              <div class="contact-card__name">${name}</div>
              <div class="contact-card__role">${role}</div>
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

    // DEBUG — remove after confirming data
    console.log('[RISE DEBUG] items count:', items?.length);
    console.log('[RISE DEBUG] first item:', JSON.stringify(items?.[0]));

    if (!items?.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:4rem 1rem; color:rgba(var(--clr-cream-rgb),0.5);">
          <div style="font-size:3rem; margin-bottom:1rem;">🕐</div>
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
      const countText = `${entries.length} ${lang === 'en' ? 'entries' : 'entri'}`;

      const rowsHtml = entries.length === 0
        ? `<tr><td colspan="5" class="rise-table__empty">
             ${lang === 'en' ? 'No entries yet.' : 'Tiada penyertaan buat masa ini.'}
           </td></tr>`
        : entries.map((item, i) => {
            const rowTitle      = item.title       || '—';
            const rowAuthor     = item.author      || '—';
            const rowBranch     = item.branch      || '—';
            const rowAbstract   = item.abstract_url || '';
            const rowPoster     = item.poster_url   || '';

            const actionHtml = [
              rowAbstract ? `<a class="rise-table__action-btn" href="${rowAbstract}" target="_blank" rel="noopener">📄 Abstrak</a>` : '',
              rowPoster   ? `<a class="rise-table__action-btn" href="${rowPoster}"   target="_blank" rel="noopener">🖼 Poster</a>`   : '',
            ].filter(Boolean).join('') || '<span class="rise-table__no-action">—</span>';

            return `
              <tr class="rise-table__row">
                <td class="rise-table__num">${i + 1}</td>
                <td class="rise-table__title">${rowTitle}</td>
                <td class="rise-table__author">${rowAuthor}</td>
                <td class="rise-table__branch">${rowBranch}</td>
                <td class="rise-table__actions">${actionHtml}</td>
              </tr>`;
          }).join('');

      return `
        <div class="rise-accordion" data-cat="${cat.num}">
          <button class="rise-accordion__hdr${isOpen ? ' is-open' : ''}"
                  aria-expanded="${isOpen}"
                  data-acc-toggle="${cat.num}">
            <div class="rise-accordion__hdr-left">
              <span class="rise-accordion__icon">${cat.icon || '📋'}</span>
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
                <thead>
                  <tr>
                    <th class="rise-table__num">#</th>
                    <th class="rise-table__title">${lang === 'en' ? 'Title' : 'Tajuk'}</th>
                    <th class="rise-table__author">${lang === 'en' ? 'Presenter' : 'Pembentang'}</th>
                    <th class="rise-table__branch">${lang === 'en' ? 'Branch / State' : 'Cawangan / Negeri'}</th>
                    <th class="rise-table__actions">${lang === 'en' ? 'Files' : 'Fail'}</th>
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
          <button class="rise-lb__close" aria-label="Tutup">✕</button>
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
      a.textContent = '🖼 Poster PDF';
      btns.appendChild(a);
    }
    if (abstractUrl) {
      const a = document.createElement('a');
      a.href = abstractUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'btn btn--outline btn--sm';
      a.textContent = '📄 Abstrak';
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
           🗳️ BUKA SISTEM UNDIAN
         </a>`
      : `<p class="voting-stub__text" style="color:rgba(250,206,92,0.5); font-size:0.8rem; margin-top:var(--sp-4);">
           [URL belum dikonfigurasi — kemaskini voting.url dalam config.js]
         </p>`;

  } else if (status === 'closed') {
    buttonHtml = `
      <button class="btn btn--outline" disabled style="margin-top:var(--sp-6); opacity:0.45; cursor:not-allowed;">
        🔒 UNDIAN TELAH DITUTUP
      </button>`;
    messageHtml = `
      <p class="voting-stub__text" style="margin-top:var(--sp-4);">
        Terima kasih atas penyertaan anda. Sistem undian telah ditutup.
      </p>`;

  } else {
    /* 'before' — default */
    buttonHtml = `
      <button class="btn btn--outline" disabled style="margin-top:var(--sp-6); opacity:0.45; cursor:not-allowed;">
        🕐 UNDIAN BELUM DIBUKA
      </button>`;
    messageHtml = `
      <p class="voting-stub__text" style="margin-top:var(--sp-4);">
        Sistem undian akan dibuka semasa tempoh persidangan.
      </p>`;
  }

  container.innerHTML = `
    <div class="voting-stub" style="${status === 'open' ? 'border-color:rgba(250,206,92,0.6);' : ''}">
      <div class="voting-stub__icon">🗳️</div>
      <div class="voting-stub__title">${CARD_TITLE}</div>
      <p class="voting-stub__text">${CARD_DESC}</p>
      ${buttonHtml}
      ${messageHtml}
    </div>`;
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

  if ($('programme-container'))  jobs.push(renderProgramme('programme-container'));
  if ($('speakers-container'))   jobs.push(renderSpeakers('speakers-container'));
  if ($('downloads-container'))  jobs.push(renderDownloads('downloads-container', 'main'));
  if ($('gallery-container'))    jobs.push(renderGallery('gallery-container'));
  if ($('faq-container'))        jobs.push(renderFaq('faq-container', 'main'));
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
