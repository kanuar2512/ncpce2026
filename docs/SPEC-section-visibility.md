# Spec — Config-Driven Section Visibility ("Admin" toggles)

**Status:** Draft for approval · **Author:** Lead Software Architect (assist) · **Date:** 2026-07-08
**Related:** `assets/js/api.js`, `assets/js/ui.js`, `assets/data/config.json`, `SiteConfig` sheet, `apps-script/Code.gs`, `index.html`

---

## 1. Goal

Let the site owner show/hide individual page sections (countdown, venue, etc.) **without editing code or redeploying** — by flipping a cell in the existing Google `SiteConfig` sheet. This is the "admin function" requested: the sheet *is* the admin panel.

Non-goals (explicitly out of scope for this spec): login/auth, a custom admin dashboard, time-based auto-switching, and editing content values. Those can be layered later without reworking this design.

---

## 2. Why this approach fits the architecture

- Reuses the existing data flow: **Google Sheet → Apps Script → JSON snapshot → frontend**. No new backend, no new endpoint.
- Honours project rules: *prefer configuration over hardcoded values*, *modular*, *one responsibility per file*, *avoid duplicate code*.
- Fully additive. Nothing existing changes behaviour when all flags are absent or `TRUE` (fail-open — see §6).

---

## 3. The flags

One boolean flag per toggleable section, named `show_<section>`. Stored as ordinary rows in the `SiteConfig` sheet, so they arrive in the frontend through the same `fetchSiteConfig()` path already in use.

> **Storage decision (confirmed):** flags go in a new **`value`** column added to `SiteConfig` (current columns are `key | value_ms | value_en`). `fetchSiteConfig()` already reads `row.value`, so once the column exists the flags flow through with **no `api.js` change**. Bilingual content keeps using `value_ms` / `value_en`; flags are language-independent and use only `value`.

| Flag key            | Controls (section)                     | DOM target (id)      | Default |
|---------------------|----------------------------------------|----------------------|---------|
| `show_countdown`    | Countdown timer block                  | `#countdown`         | TRUE    |
| `show_about`        | About / Overview                       | `#about`             | TRUE    |
| `show_why`          | Why attend                             | `#why`               | TRUE    |
| `show_programme`    | Programme / Agenda                     | `#programme`         | TRUE    |
| `show_venue`        | Venue / Location + map                 | `#venue`             | TRUE    |
| `show_speakers`     | Presenters                             | `#speakers`          | TRUE    |
| `show_awards`       | Awards                                 | `#awards`            | TRUE    |
| `show_gallery`      | Gallery                                | `#gallery`           | TRUE    |
| `show_faq`          | FAQ                                     | `#faq`               | TRUE    |
| `show_contact`      | Contact                                | `#contact`           | TRUE    |
| `show_announcement` | Top announcement bar (optional)        | `#announcement-bar`  | TRUE    |
| `show_nownext`      | "Happening now / next" widget          | `#now-next`          | TRUE    |

**Value convention:** case-insensitive. `FALSE`, `false`, `0`, `no`, `off`, `hide` → hidden. Anything else (including blank / missing row) → visible.

> **Typical conference-day switch:** set `show_countdown = FALSE`. Optionally keep `show_venue` / `show_about` TRUE (attendees still want the map). Everything else untouched.

---

## 4. Files that change (one per approval step, per project rules)

Implementation is deliberately split so each file can be approved and shipped independently. **No file is touched until you approve this spec, and then only one file at a time.**

### Step 1 — `SiteConfig` sheet (data, no code)
1. Add a header **`value`** in column D (row 1), after `value_en`.
2. Add the flag rows from §3 (`show_countdown`, `show_about`, …), each with `TRUE`/`FALSE` in the new `value` column. Leave `value_ms` / `value_en` blank for flag rows.

This alone changes nothing on the site until Steps 2–4 ship, so it is safe to add first. Because `fetchSiteConfig()` already reduces on `row.value`, no code change is needed for the flags to become readable.

### Step 2 — `index.html` (markup only)
- Add `id="countdown"` to the countdown `<section>` (it currently has no id — the only section that needs one added). All others already have stable ids.
- Add a stable hook to each subnav link so it can be hidden with its section. Recommended: `data-nav="<section-id>"` on each `<a>` in `#conf-subnav`. (The href already encodes the target, e.g. `#venue`; `data-nav` avoids parsing hrefs and is explicit.)
- No content or layout changes.

### Step 3 — `assets/js/visibility.js` (new module, single responsibility)
A small, self-contained module that:
1. reads the already-fetched site config,
2. resolves each `show_<section>` flag through one shared coercion helper,
3. hides the matching `<section>` **and** its subnav link when the flag is false.

Public surface (draft):

```js
// visibility.js
export function isSectionVisible(cfg, key, fallback = true) { /* coerce value */ }
export function applySectionVisibility(cfg) { /* hide sections + nav links */ }
```

Rules the module enforces:
- Hidden section: set the `hidden` attribute (semantic, accessible) — not just inline `display:none`.
- Hidden section → also hide `#conf-subnav a[data-nav="<id>"]` so no dead anchor remains.
- Unknown / missing flag → visible (fail-open).
- Never removes nodes from the DOM (reversible on next load; keeps it simple and cache-friendly).

### Step 4 — `index.html` boot script (wiring)
In the existing `<script type="module">` block, after config is available, call `applySectionVisibility(cfg)`. Because sections are static HTML, this should run **early** (before/independent of the async render calls) to avoid a flash of a section that should be hidden. See §5 for exact ordering and the anti-flash note.

---

## 5. Execution order & anti-flash

Current boot order (`index.html`): sync UI inits → async data renders. `fetchSiteConfig()` is async and already called inside `renderAbout`. To apply visibility we need the config object once, early.

Recommended:
1. `initLang()` (unchanged, must stay first).
2. `const cfg = await fetchSiteConfig();` once, near the top of the boot script.
3. `applySectionVisibility(cfg);` immediately after — before `initCountdown`, `initScrollReveal`, etc.
4. Pass the same `cfg` into `renderAbout` etc. to avoid a second fetch (it's cached anyway via `api.js`, so this refactor is optional, not required).

**Anti-flash options (pick one at implementation time):**
- **A (simplest):** accept a brief moment where a to-be-hidden section may paint before JS hides it. Low effort; acceptable because toggles change rarely.
- **B (cleaner but risky):** default toggleable sections to `hidden` in HTML and let `applySectionVisibility` *reveal* the visible ones. Zero flash, but inverts the fail-open default (if JS fails, sections stay hidden) — **not recommended** for a public info site.
- **C (recommended):** a tiny CSS rule hides only sections carrying a `data-flag` attribute until a `visibility-resolved` class is added to `<body>`; a `<noscript>` / safety timeout reveals all if JS never runs. Keeps fail-open, no flash. Slightly more work.

Recommendation: **C**, with **A** as an acceptable MVP if you want to ship fastest.

---

## 6. Failure behaviour (fail-open)

If the config snapshot fails to load, is empty, or a flag row is missing → **the section shows.** Rationale: a public conference site should degrade toward *showing* information, never toward a mysteriously blank page. The only capability lost on failure is hiding — which is the safe direction.

---

## 7. Resolved decisions

1. **Value column — RESOLVED.** Live `SiteConfig` has `key | value_ms | value_en` and no `value` column, so the current reader (`row.value`) feeds nothing (pre-existing latent bug, out of scope). Decision: add a **`value`** column (D) for language-independent scalars; flags live there. No `api.js` change needed for flags.
2. **Countdown during conference — RESOLVED.** Hide the **whole** countdown section (`show_countdown=FALSE`). The built-in "conference is live" message is not needed.
3. **Granularity — RESOLVED.** Per-section flags only. No master `site_phase` switch for now (kept as a future extension, §10).

> **Note (out of scope, flagged for awareness):** the bilingual config reader is currently non-functional because `fetchSiteConfig()` expects a `value` column that didn't exist, so `renderAbout` etc. get `undefined` and silently fall back to static HTML. Adding the `value` column does **not** fix the bilingual rows (they use `value_ms`/`value_en`). Fixing that reader is a separate task — recommend a follow-up, not part of this feature, per "never modify unrelated files."

---

## 8. Rollout / test checklist (for the verification step)

- [ ] With no flags added: page renders identically to today (regression check).
- [ ] `show_countdown=FALSE`: countdown section hidden, no countdown subnav gap, no JS errors, timer interval not started (or harmlessly no-ops).
- [ ] `show_venue=FALSE`: venue section + its subnav link both gone; page scroll/anchors still work.
- [ ] Config-load failure simulated (offline): all sections visible (fail-open verified).
- [ ] Language switch after hiding: hidden sections stay hidden (visibility runs independent of `reRenderAll`).
- [ ] Mobile + desktop: no layout gaps where a hidden section was.
- [ ] Accessibility: hidden sections use the `hidden` attribute; no focusable dead anchors remain.

---

## 9. Effort estimate

| Step | File | Size | Risk |
|------|------|------|------|
| 1 | SiteConfig sheet | ~12 rows | none |
| 2 | index.html markup | ~13 line edits | very low |
| 3 | visibility.js (new) | ~50–70 lines | low |
| 4 | boot script wiring | ~5 lines | low |

Total: small. No changes to `Code.gs`, `main.css` (beyond an optional anti-flash class in Option C), or any render function.

---

## 10. Future extension (not built now)

- **Master phase switch** (`site_phase`) computing per-section flags.
- **Time-based auto phase** using the existing conference date, with a manual override flag (`countdown_mode = auto | on | off`).
- **Feature-flagging future sections** — every new `<section>` just gets a `show_*` row for free.

---

## 11. Follow-up notes / tech debt (discovered during implementation)

### 11.1 Vestigial "About from config" code (decision pending)
`renderAbout()` in `ui.js` was built to pull About text from the sheet (`about_ms`/`about_en`, `milestone_desc_ms`/`milestone_desc_en`). Those `SiteConfig` rows have since been **deleted** (they were unused and were causing a stray `true` to render once the `value` column was added). Current state — harmless but dead:
- `renderAbout()` now reads `undefined`, its `if (text)` guards skip, and it only performs a cached no-op fetch. About renders from static HTML.
- `index.html` still has an empty `<p data-about-text></p>` slot (renders blank).
- `data-milestone-text` is referenced in JS but no matching element exists in the HTML — never functioned.

**Options:** (a) *Keep* if About/milestone text should become sheet-editable later — then re-add the `about_*` rows with real content and add a `data-milestone-text` element; or (b) *Remove* `renderAbout()`, its import + call in `index.html`, and the empty `<p data-about-text>` if About stays static. **Recommendation:** leave as-is for now (harmless; removing touches `ui.js`, which has unrelated uncommitted changes). Revisit as a standalone cleanup.

### 11.2 Programme sheet — unused `notes_ms` / `notes_en` columns
The `Programme` tab has `notes_ms` / `notes_en` columns that **no frontend code reads** (`renderProgramme` uses only `time_start/end`, `title_*`, `speaker*`, `venue*`, `type`). They appear to be placeholders for per-item footnotes that were never wired up. Either wire them into the programme row rendering (e.g. a secondary `.prog-note` line) or drop the columns. Not urgent; documented so it isn't mistaken for a bug. The `type` column, by contrast, **is** used — it drives the category badge via `PROGRAMME_TYPES`.

---

**Status:** Option A approved; all three §7 questions resolved. Ready to implement **Step 1 (SiteConfig sheet) only**, then pause for sign-off before each subsequent file, per project rules.

Since Step 1 edits the **live production Google Sheet**, confirm how you want it done: (a) I edit it directly via the browser, or (b) you add the `value` column + flag rows manually from the table in §3. Either way, no site code changes until Step 2 is approved.
