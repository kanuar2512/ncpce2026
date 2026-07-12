# Production-Readiness Audit — PKPJF 2026 Website

**Scope:** `index.html`, `rise.html`, `assets/css/main.css`, `assets/js/*`, `assets/data/*`, GitHub workflows, hero design review (desktop + mobile screenshots).
**Date:** 12 Julai 2026 · 15 days to conference.
**Verdict:** Solid architecture (static JSON snapshot pipeline is the right call). No launch-blockers in the data layer. There are **4 real bugs**, **1 legal risk**, and a set of performance/a11y fixes that should land before launch.

---

## A. BUGS (fix before launch)

### A1. Countdown uses the visitor's timezone, not Malaysia time
`index.html:1021` → `initCountdown('2026-07-27T08:30:00')`. An ISO string **without offset** is parsed in the device's local timezone. A visitor abroad (or a device with wrong TZ) sees a countdown that is hours off.
**Fix:** `initCountdown('2026-07-27T08:30:00+08:00')` — and take the date from `CONFERENCE.dates.start` (add `+08:00` there) instead of hardcoding it in the HTML (violates the project's config-over-hardcode rule; the same date currently lives in two places).

### A2. `show_nownext` / `show_announcement` config flags are silently overridden
`applySectionVisibility()` correctly sets `hidden` on `#now-next` and `#announcement-bar` at boot, but `_paintNowNext()` (`ui.js:1765`) and `renderAnnouncement()` (`ui.js:1635`) later set `el.hidden = false` unconditionally. Turning these sections off in the Sheet **does nothing**.
**Fix:** gate the render calls in `index.html` the same way countdown is gated:
```js
if (isSectionVisible(siteConfig, 'show_nownext')) { initNowNext(...); renderNowNext(...); }
```

### A3. Download buttons read the wrong field — all links dead
`renderDownloads()` (`ui.js:750`) uses `item.drive_url`, but the sheet/JSON column is `file_url` (confirmed in `assets/data/downloads.json`). Every download card renders `href="#"`. It also ignores the `published` flag, so unpublished rows would show. No downloads section is currently in the markup, so this is latent — but it will bite the moment you add the "Buku Program" section (likely during conference week).
**Fix:** `const url = item.file_url || '#';` and filter `eqi(item.published, 'true')`.

### A4. Slow config fetch blanks the whole page (top-level `await`)
`index.html:1013` — `await fetchSiteConfig()` runs **before** `initNav()`, `initNavDrawer()`, `initScrollReveal()`, etc. `fetch(..., {cache:'no-cache'})` always revalidates with the server. On a slow/flaky connection (conference hotel Wi-Fi):
- `.reveal` elements — **including the entire hero content** — stay at `opacity:0`,
- the hamburger menu doesn't respond,
until the fetch resolves. The `.catch(()=>({}))` handles *failure*, but not *slowness*. Worse: if JS fails entirely (old browser, CSP, bad deploy), the page is permanently blank because `.reveal { opacity:0 }` has no no-JS fallback.
**Fix (3 parts):**
1. Run all sync `init*()` calls **before** the `await`.
2. Race the config fetch against a timeout: `Promise.race([fetchSiteConfig(), timeout(2500)])`.
3. Add a no-JS fallback: `<html class="no-js">` + `<script>document.documentElement.classList.remove('no-js')</script>` and `.no-js .reveal { opacity:1; transform:none; }`.

### A5. (Code smell, works by accident) `initNavDrawer` references an undeclared `navbar`
`ui.js:409` — the outside-click handler uses `navbar?.contains(...)`. There is no `navbar` variable in scope; it only works because `<nav id="navbar">` creates a global `window.navbar`. If the id is ever renamed, every document click throws a `ReferenceError` in a strict-mode module.
**Fix:** `const nav = $q('.navbar');` inside the function. Also: the drawer has no `Escape`-to-close and no focus management (see D3).

---

## B. LEGAL / COMPLIANCE RISK

### B1. Trial-licensed fonts are shipped publicly — 4.9 MB of them
`assets/fonts/sugo-pro-display/` contains **20 "trial" TTFs** (Sugo Pro Classic/Display, `-trial` suffix). They are:
- no longer referenced anywhere (CSS switched to Bebas Neue — good),
- still deployed to public GitHub Pages with every build (the Pages artifact uploads the repo root),
- trial fonts are licensed for evaluation only — **redistributing them on a government website is a licence violation.**
**Fix:** delete the folder (or at minimum add it to a `.gitignore`/artifact exclusion). This also removes 4.9 MB from every deploy.

---

## C. PERFORMANCE

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| C1 | `hero.png` is **1.6 MB** and is only used as `og:image` | Wasted repo/deploy weight; WhatsApp/Telegram often refuse preview images > ~600 KB — link shares may show **no image at all** | Export a 1200×630 JPG ≤ 300 KB for OG; delete the PNG |
| C2 | `logo-50tahun.png` 438 KB, `logo-50tahun-mark.png` 273 KB (rendered at 42 px!), `logo-kkm.png` 154 KB | Slow first paint on mobile data; nav logo alone is ~270 KB | Resize to 2× render size, convert to WebP (keep PNG fallback if desired). Expected total savings ≈ 800 KB+ |
| C3 | Google Fonts loaded via `@import` **inside** main.css | Serialises CSS → font-CSS → font files; delays first text render; the `<link rel="preconnect">` in HTML barely helps because discovery happens late | Move to `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` in `<head>`; also trim Poppins weights (300/800/italic appear unused) |
| C4 | No `width`/`height` on navbar logos and dynamic images | Layout shift (CLS) as images load | Add intrinsic dimensions (hero emblem already has them — good) |
| C5 | Two `setInterval`s never pause (countdown 1 s, now/next 30 s) and countdown keeps ticking after it ends | Minor battery/CPU; SR chatter (see D2) | Clear interval on end; pause on `visibilitychange` |
| C6 | Snapshot workflow cron `*/5 * * * *` runs 288×/day through July even when nothing changes | Burns Actions minutes; risk of hitting limits mid-conference | Fine to keep during conference week; afterwards drop to hourly. Consider a guard that disables after `2026-08-15` |
| C7 | Favicon is a 60 KB full-size PNG; no `apple-touch-icon` | Minor | 32 px + 180 px icons |

---

## D. ACCESSIBILITY

| # | Issue | Fix |
|---|-------|-----|
| D1 | **Awards tabs never update `aria-selected`** — `initAwardsTabs()` only toggles classes (programme tabs do it correctly). Buttons also lack keyboard arrow-key support, and panels lack `aria-labelledby`/`tabindex="-1"` | Mirror the programme-tab ARIA handling; add left/right arrow key switching |
| D2 | Countdown region is `role="timer" aria-live="polite"` with a **seconds** digit — screen readers may announce every second | Remove `aria-live` (a timer role is enough), or move live announcements to a minute-level string |
| D3 | Mobile drawer uses `role="menu"`/`role="menuitem"` (menus imply desktop-app keyboard semantics), no `Escape` close, no focus trap, focus not returned to hamburger | Drop the menu roles (plain `<nav><ul>`), add `Escape` handling + focus return |
| D4 | Programme day-tab buttons have `aria-controls`/`aria-selected` but **no `role="tab"`**, and panels get `role="tabpanel"` without `aria-labelledby` | Add the missing roles/relationships |
| D5 | `html { font-size: 16px }` overrides the user's browser font-size preference | Use `font-size: 100%` |
| D6 | Sheet content is injected via `innerHTML` unescaped (FAQ answers, speaker names — a name containing `"` breaks the `alt` attribute; `<script>` in a sheet cell would execute) | Add a tiny `esc()` helper for text fields (editors are trusted, but one pasted `<` shouldn't break the page) |
| D7 | `&` unescaped in several headings (`Tempat & Penginapan` etc.) — parses fine but invalid HTML | Use `&amp;` |
| D8 | Good work worth keeping: `:focus-visible` ring, `prefers-reduced-motion` block forcing `.reveal` visible, bilingual `lang` attribute switching, `aria-expanded` on hamburger/FAQ/speakers | — |

---

## E. BROWSER COMPATIBILITY

1. **`min-height: 100vh` hero** — on iOS Safari/Chrome Android the URL bar makes 100vh taller than the visible viewport; CTAs can sit under the toolbar. Use `min-height: 100svh` with `100vh` fallback:
   ```css
   .hero { min-height: 100vh; min-height: 100svh; }
   ```
2. **`backdrop-filter` missing `-webkit-` prefix** in 3 places (`.rise-subnav:620`, `.navbar__drawer:687`, `.hero__venue:922`) — older iOS Safari (< 16) shows no blur. Add the prefixed twin (already done correctly for `.navbar.scrolled`).
3. **`<details name="...">` exclusive accordion** (logo meaning) needs Chrome 120+/Safari 17.2+/Firefox 130. Older browsers degrade gracefully (multiple open) — acceptable, just be aware.
4. **Top-level `await`** requires Safari 15+/Chrome 89+. Fine for 2026, but combined with A4 it's another reason to restructure the boot sequence.
5. `text-wrap: balance/pretty`, `aspect-ratio`, `:focus-visible` — all degrade gracefully. OK.

---

## F. SEO / SHARING (matters a lot for a WhatsApp-shared event site)

1. **`og:image` is a relative path** (`assets/img/hero.png`) — Open Graph requires an **absolute URL**. Right now WhatsApp/Facebook/Telegram previews show **no image** on both pages.
2. Missing `og:url`, `og:locale` (`ms_MY`), `og:site_name`, and Twitter card tags.
3. No `<link rel="canonical">`.
4. No JSON-LD `Event` structured data — cheap win: name, dates, venue with address, organiser. Google can then show the event card in search.
5. No `robots.txt` / `sitemap.xml` / custom 404 (GitHub Pages serves a default 404). Low priority but easy.

---

## G. UX FINDINGS

1. **FAB collision on mobile:** the back-to-top + contact FABs sit bottom-right exactly where the hero CTAs end (your mobile screenshot shows an overlapping round button on the CTA). The hero already pads 6rem for this, but on short viewports it still collides. Consider hiding FABs until the user scrolls past the hero (back-to-top already does this — apply the same to the contact FAB).
2. **Announcement bar loads late** and pushes content down when it appears (it's above `<main>`) — reserve space or animate it in as an overlay to avoid the jump.
3. **Gallery buttons are already live** with Drive folder links before the event. If the folders are empty, visitors land on an empty Drive. Consider keeping them disabled until each day ends (the config mechanism exists).
4. **Theme song hosted at `storage3.me-qr.com`** — a third-party QR-tool CDN with unknown longevity. Host the MP3 in the repo (or Drive direct link) before conference week.
5. **Error states** tell the user to refresh — good. But a fetch failure of one sheet leaves that section stuck on the spinner-styled error only; consider a retry button.
6. **Voting is `status:'open'` today** (July 12) while the copy says voting opens 28 Julai 8:00 pagi. If go.gov.my link is live, people can vote early. Set `status:'before'` until day 2, or better: derive open/closed from date automatically.
7. `schedule-component.html` is a dev artefact — exclude it from the deploy artifact so it isn't publicly reachable.
8. Dead code adding weight/confusion: `initLightbox()`, `_initRiseLightbox()`/`window.__riseThumb`, unused `NAV`/`NAV_RISE` arrays (NAV_RISE still lists a downloads section that no longer exists), unused `CONFERENCE.venue` (its parking text "percuma" contradicts the HTML "disediakan" — exactly the drift the project rules warn about). Either render from config or delete the config.

---

## H. HERO SECTION — DESIGN REVIEW (desktop + mobile)

**What already works:** the maroon/gold cinematic backdrop, hexagon/particle FX, government emblem block, and bilingual title read as official and dignified. Mobile stacking is correct and the full-width CTAs are good.

**What holds it back from "premium conference":**

1. **No date urgency in the hero.** The single most important fact — 27–29 Julai — is buried in a small pill. Premium event sites lead with date + a countdown chip. Suggestion: split the pill into two chips (📍 venue / 📅 date) and add a compact live countdown strip at the hero's bottom edge (data already exists; move or mirror the countdown here).
2. **Flat title hierarchy.** All three lines are the same cream/white Bebas Neue; "PENGUATKUASAAN" dominates only by size. Give the middle line a **gold gradient text treatment** (same recipe as `.countdown__num`) so the eye lands on the brand line — an on-palette change, no rebranding:
   ```css
   .hero__title .l2 {
     background: linear-gradient(180deg, var(--gold-3), var(--gold-1));
     -webkit-background-clip: text; background-clip: text;
     color: transparent; -webkit-text-fill-color: transparent;
   }
   ```
3. **The Golden Jubilee story is invisible in the hero.** The 50-tahun mark only appears at 42 px in the navbar, yet the jubilee is the headline of the event. Add `logo-50tahun-mark.png` as a large, very low-opacity (≈ 6–8%) watermark behind the right half of the hero, echoing the monogram watermarks used further down the page — instant thematic depth, zero new assets.
4. **Tagline is whispering.** `opacity: .85` + tiny clamp floor (0.62rem) makes "JUBLI EMAS · 50 TAHUN…" nearly invisible on mobile (visible in your screenshot). Raise the floor to ~0.72rem, full opacity, and consider flanking hairlines like `.section-subtitle` for a crafted look.
5. **CTAs compete.** Cream "Lihat Atur Cara" vs gold "Portal RISE" have equal visual weight. Pick one primary (gold, filled) and demote the other to outline. For a pre-event visitor, *Atur Cara* is the primary task.
6. **Dead space on desktop.** Between the emblem block and title there's a large gap (`clamp(3rem,7vh,5rem)`); on 1080p the composition floats with empty flanks. Tighten to `clamp(2rem,5vh,3.5rem)` and let the watermark (point 3) fill the right flank.
7. **Entrance choreography.** Everything fades up in one block (`fadeUp 1s` on the whole `.hero__content`). Stagger it — emblem → title lines → tagline → chips → CTAs with 80–120 ms delays — for a far more polished first impression at zero asset cost (respecting the existing reduced-motion block).
8. **Mobile viewport:** switch to `100svh` (see E1) so the CTAs never hide behind the browser toolbar, and reduce particles to ~6 on mobile (they animate `filter: blur(42px)` glows — cheap wins for battery).
9. **Scroll hint** sits bottom-right on desktop; convention is bottom-centre. Minor, but centring it reads more deliberate.

All suggestions stay strictly within the official palette/typography — no rebranding.

---

## I. PRIORITISED ACTION PLAN

**P0 — before next deploy (bugs & legal):**
1. A1 countdown timezone (`+08:00`) — 1 line
2. A2 visibility-flag override — 3 lines
3. A4 boot order + no-JS fallback — the biggest robustness win
4. B1 delete trial fonts — legal
5. F1 absolute `og:image` (+ compressed 1200×630 image) — link previews

**P1 — this week (quality):**
6. A3 downloads field fix, A5 navbar reference
7. C2/C3 image compression + font loading
8. E1/E2 `svh` + `-webkit-backdrop-filter`
9. D1–D4 ARIA fixes
10. G6 voting status

**P2 — nice to have:**
11. Hero premium pass (H1–H9)
12. JSON-LD event schema, canonical, 404 page
13. Dead-code removal, dedupe venue/date config

---

*Per project rules, no source files were modified. Each fix above will be delivered as a single-file change for approval, starting with P0 item 3 (index.html boot sequence) if you agree with the priorities.*
