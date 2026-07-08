/**
 * visibility.js — Config-Driven Section Visibility
 *
 * Single responsibility: given the site config object (from
 * fetchSiteConfig()), show or hide top-level page sections and
 * their matching sub-nav links based on `show_<section>` flags.
 *
 * Design:
 *  - Fail-open: a missing/blank/unreadable flag → section VISIBLE.
 *    A public info site should degrade toward showing content.
 *  - Non-destructive: toggles the `hidden` attribute only; never
 *    removes nodes. Fully reversible on the next load.
 *  - Configuration over hardcoding: the flag→target map is the
 *    one place to register a new toggleable section.
 *
 * Flags live in the `SiteConfig` sheet as rows:
 *    key = show_countdown | value = TRUE / FALSE
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 */

'use strict';

/* ============================================================
   FLAG → DOM TARGET MAP
   The single source of truth. To make a new section
   toggleable: add a `show_*` row in SiteConfig and one line
   here. `id` is the section element id; `nav` (optional) is the
   value of the sub-nav link's data-nav attribute to hide too.
   ============================================================ */
const SECTION_FLAGS = Object.freeze({
  show_countdown:    { id: 'countdown' },
  show_about:        { id: 'about',    nav: 'about' },
  show_why:          { id: 'why' },
  show_programme:    { id: 'programme', nav: 'programme' },
  show_venue:        { id: 'venue',    nav: 'venue' },
  show_speakers:     { id: 'speakers', nav: 'speakers' },
  show_awards:       { id: 'awards',   nav: 'awards' },
  show_gallery:      { id: 'gallery',  nav: 'gallery' },
  show_faq:          { id: 'faq',      nav: 'faq' },
  show_contact:      { id: 'contact',  nav: 'contact' },
  show_announcement: { id: 'announcement-bar' },
  show_nownext:      { id: 'now-next' },
});

/**
 * Values that explicitly mean "hidden" (case-insensitive).
 * NOTE: blank/empty is intentionally NOT here — a present-but-blank
 * flag fails open to VISIBLE, matching the spec.
 */
const FALSY = Object.freeze(['false', '0', 'no', 'off', 'hide', 'hidden']);

/**
 * Resolve a flag to a boolean visibility.
 * Fail-open: anything not explicitly falsy → visible.
 * @param {Object} cfg — site config (key→value)
 * @param {string} key — e.g. 'show_countdown'
 * @param {boolean} [fallback=true] — used when the key is absent
 * @returns {boolean} true = visible
 */
export function isSectionVisible(cfg, key, fallback = true) {
  if (!cfg || !(key in cfg)) return fallback;
  const raw = cfg[key];
  if (raw === true)  return true;
  if (raw === false) return false;
  return !FALSY.includes(String(raw).trim().toLowerCase());
}

/**
 * Show/hide one section element and its optional nav link.
 * @param {{id:string, nav?:string}} target
 * @param {boolean} visible
 */
function applyOne(target, visible) {
  const section = document.getElementById(target.id);
  if (section) section.hidden = !visible;

  if (target.nav) {
    const link = document.querySelector(`#conf-subnav a[data-nav="${target.nav}"]`);
    if (link) link.hidden = !visible;
  }
}

/**
 * Apply visibility for every registered section based on config.
 * Safe to call once, early in boot, before section renders.
 * @param {Object} cfg — resolved site config (key→value)
 */
export function applySectionVisibility(cfg) {
  for (const [flag, target] of Object.entries(SECTION_FLAGS)) {
    try {
      applyOne(target, isSectionVisible(cfg, flag));
    } catch (err) {
      // Never let one bad flag break the page — fail-open per section.
      console.warn(`[CMIP] visibility: could not apply "${flag}"`, err);
    }
  }
}
