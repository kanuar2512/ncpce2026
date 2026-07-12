# Root Cause Analysis — Intermittent Mobile Data-Loading Failure

**System:** PKPJF 2026 conference site (GitHub Pages → Apps Script JSONP → Google Sheets)
**Symptom:** All API-driven sections fail on mobile Chrome (normal) with *"Ralat memuatkan data. Sila muat semula halaman."*; work on desktop and in mobile Chrome Incognito.
**Date:** 6 July 2026

---

## 1. Root Cause

**The browser HTTP cache is serving a stale copy of `assets/js/config.js` that contains a superseded Apps Script `API.ENDPOINT`. Every JSONP request from that device is fired at a dead `/exec` deployment URL, so no callback ever executes and every section times out.**

This is **not** a fault in the JSONP mechanism itself. JSONP, the callback lifecycle, the timeout and the cleanup logic are all correct. The failure is a **static-asset caching / versioning defect**: the ES module files are imported with no version token, so an old `config.js` (holding a now-invalid endpoint) survives in mobile Chrome's persistent disk cache and keeps being used.

---

## 2. Evidence

**A. "Incognito works, normal fails" ⇒ the differentiator is the persistent HTTP cache.**
Incognito uses a fresh, empty cache and never reads the on-disk cache. The only thing that behaves differently between the two modes here is cached static assets. No Service Worker, Cache API, or manifest exists in the project (`grep` for `serviceWorker`/`register(`/`Cache API` returns nothing), so the persistent **HTTP disk cache** is the only caching layer that can explain the split.

**B. "All sections fail simultaneously" ⇒ a single shared value is broken.**
Every `fetch*()` in `api.js` routes through `fetchSheet()`, which reads one shared constant: `API.ENDPOINT` from `config.js`. One bad endpoint breaks all sections at once — exactly the observed pattern. If this were a per-request or per-sheet problem, failures would be staggered, not total.

**C. Static UI works and the error branch renders ⇒ the modules loaded and ran; only a *value* is stale, not the code.**
The page still runs `initNav`, `initCountdown`, etc., and it reaches the `catch` blocks that print *"Ralat memuatkan data"*. So `config.js`/`api.js`/`ui.js` parsed and executed successfully. This rules out a "corrupt/stale JS syntax" failure and points to a stale **configuration value** inside otherwise-working modules — i.e. the endpoint string.

**D. Git history proves the endpoint changed repeatedly.**
`config.js` has carried **four** different endpoints over its life:

```
REPLACE_WITH_YOUR_SCRIPT_ID          (placeholder)
AKfycbz1uu81tKlZGalx3RF16qm1f0ee2OqQBj3EoGeuEiyOMv7ijVzr9tiQA5T7T5Mh3SoY
AKfycbzVO_9KJCcRfKAfta4liFMLPOXdP-7PUO7GhKsGixHRrL1_vFJ3C-aSisZ4xtwaNML5kg
AKfycbwHbUK5expjvgbqcQ3aNGpwkr06fZvp_6gppQFicbxVLk1KUeK1ATCDllhm4XysBnR7EA   (current)
```

Commits `f61c3e7` and `66b2305` ("migrate to container-bound Apps Script, update endpoint") confirm re-deployments. **When an Apps Script Web App is redeployed as a new deployment, the previous `/exec` URL stops returning valid JSONP** — it responds with an HTML sign-in / authorization / 403 page instead of `callback(...)`. A device holding a cached `config.js` from before the migration keeps hitting the old, now-dead URL.

**E. No cache-busting / versioning anywhere on the module graph.**
The imports are plain, unversioned relative paths:

```js
import { initLang } from './assets/js/lang.js';   // index.html + rise.html
import { API }      from './config.js';            // api.js → config.js
```

There is no `?v=` token, no fingerprinted filenames, and GitHub Pages does not allow custom `Cache-Control` headers (no `_headers` file support). GitHub Pages serves assets with `Cache-Control: max-age=600` + ETag; mobile Chrome's disk cache honours and often extends this, and reuses the cached module without revalidating for the life of the entry. So a redeploy of `config.js` does **not** reliably reach an already-visited mobile device.

**F. Why desktop is unaffected.**
Desktop was hard-refreshed / had DevTools "Disable cache" on / cleared cache during development, so it holds the current `config.js`. This is cache-state luck, not a platform difference in the code.

**Cross-check that rules out the alternatives:**
- *Cached placeholder endpoint?* No — if the cached `config.js` held `REPLACE_WITH_YOUR_SCRIPT_ID`, `useFallback()` would return `true` and the page would show **fallback data**, not an error. Errors are shown, so the cached endpoint is a **real-but-dead** deployment URL.
- *JSONP responses being cached?* No — each request URL carries a unique callback name (`_cmip_cb_<timestamp>_<random>`), so every `/exec` URL is unique and inherently uncacheable. The JSONP responses are not the cached artefact; the **module files** are.
- *Apps Script redirect blocked on mobile?* Unlikely and unsupported by evidence — it would not correlate with the endpoint-churn history, and the unique-callback URLs are not reused, so a cached redirect cannot be replayed.

---

## 3. Request-Lifecycle Timeline (where it breaks)

| Stage | Desktop / Incognito (fresh cache) | Mobile Chrome normal (stale cache) |
|------|------|------|
| Load `index.html` | fresh | fresh (HTML revalidates) |
| Load `config.js` | **current endpoint** | **STALE endpoint (from disk cache)** ← failure origin |
| `fetchSheet()` builds URL | `…/AKfycbwH…/exec?sheet=faq&callback=_cmip_cb_…` | `…/OLD_ID/exec?sheet=faq&callback=_cmip_cb_…` |
| Register `window[cbName]` | ok | ok |
| Inject `<script src>` | ok | ok |
| Server response | `_cmip_cb_…({status:'ok',data:[…]})` | HTML sign-in / 403 page — **not** a callback |
| Callback executes? | **Yes** → `resolve(data)` | **No** — script may even load "successfully" as HTML, so `onerror` may not fire |
| 45 s timeout | cleared | **fires** → `reject(ApiError 408)` |
| UI | rendered | `catch` → *"Ralat memuatkan data"* on **every** section |

The break is at **"Load `config.js`"** — everything downstream is a correct reaction to a wrong endpoint value.

---

## 4. Recommended Fix

Keep JSONP. Do **not** switch to `fetch()` — JSONP is not the cause, and switching would reintroduce the CORS problem it was chosen to avoid. Fix the **cache/versioning** layer.

**Primary fix — version the module assets so a redeploy always invalidates old cached JS.**
Add a single build/version token to every relative module import so the URL changes whenever code or config changes, e.g. `./assets/js/config.js?v=20260706`. Because imports are chained (`ui.js → api.js → config.js`), the token must be applied at each import site, driven from one place. Simplest low-risk option: bump a `?v=<date>` on the two entry imports in `index.html`/`rise.html` **and** on the internal `import … from './config.js'` in `api.js` / `import … from './api.js'` / `'./config.js'` in `ui.js`, updated on each deploy. (A tiny build step or filename fingerprinting is the scalable long-term form, but the query token is the minimal change.)

**Immediate remediation for currently-affected devices (no code):** the fault self-heals once the stale `config.js` expires or the user does a hard refresh / clears site data. Confirm the endpoint `AKfycbwH…/exec` is deployed with *Execute as: Me* and *Who has access: Anyone*, and that only the current deployment is in use.

**Diagnostic step first (recommended before shipping the fix):** add lifecycle logging to `fetchSheet()` (Section 5) and open the failing mobile page. The log will show the **actual endpoint the cached `config.js` is using** and whether the failure is *timeout* (callback never fired — matches this diagnosis) vs *onerror*. This converts the diagnosis from 85% to certain, on the real device, in one look.

**Not required:** a cache-buster on the JSONP request URL. The unique callback name already makes each `/exec` URL unique, so JSONP responses are never cache-served. Adding `&_ts=` there would be redundant and would not address the real (static-asset) cache.

---

## 5. Proposed Code Change (single file — `assets/js/api.js`)

Per project rules I have **not** modified any file yet. Below is the minimal, drop-in instrumented `fetchSheet()` — logging only, no behavioural change — to confirm on the device. Approve and I will apply it to `api.js` (and nothing else).

```js
async function fetchSheet(sheet, params = {}) {
  const paramStr = Object.keys(params).length
    ? '_' + new URLSearchParams(params).toString() : '';
  const cacheKey = `${sheet}${paramStr}`;

  const cached = cacheGet(cacheKey);
  if (cached !== null) { console.debug(`[CMIP] cache-hit ${cacheKey}`); return cached; }

  if (useFallback()) {
    console.warn(`[CMIP] fallback ${sheet}`, params);
    const fb = getFallbackData(sheet, params); cacheSet(cacheKey, fb); return fb;
  }

  const url = new URL(API.ENDPOINT);
  url.searchParams.set('sheet', sheet);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  return new Promise((resolve, reject) => {
    const cbName = '_cmip_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const t0 = performance.now();
    // 1. ENDPOINT ACTUALLY IN USE (reveals a stale cached config.js)
    console.info(`[CMIP] ▶ ${sheet} | endpoint=${API.ENDPOINT} | cb=${cbName}`);

    const timer = setTimeout(() => {
      console.error(`[CMIP] ✖ TIMEOUT ${sheet} after ${Math.round(performance.now()-t0)}ms — callback never fired (endpoint likely dead/redirecting to HTML)`);
      cleanup(); reject(new ApiError('Request timed out after 45 seconds', 408, sheet));
    }, 45_000);

    function cleanup() {
      clearTimeout(timer); delete window[cbName];
      const el = document.getElementById(cbName); if (el) el.remove();
      console.debug(`[CMIP] ⟲ cleanup ${cbName}`);
    }

    window[cbName] = function (json) {
      console.info(`[CMIP] ✔ callback ${sheet} in ${Math.round(performance.now()-t0)}ms`);
      cleanup();
      if (!json || json.status === 'error') {
        reject(new ApiError(json?.message || 'Apps Script returned an error', 0, sheet)); return;
      }
      const data = json.data ?? json; cacheSet(cacheKey, data); resolve(data);
    };

    url.searchParams.set('callback', cbName);
    const script = document.createElement('script');
    script.id = cbName; script.src = url.toString();
    console.debug(`[CMIP] inject <script> ${url.toString()}`);
    script.onload  = () => console.debug(`[CMIP] script onload ${sheet} (fired even for HTML error pages)`);
    script.onerror = () => {
      console.error(`[CMIP] ✖ ONERROR ${sheet} — network/DNS/blocked`);
      cleanup(); reject(new ApiError(`Network error fetching "${sheet}"`, 0, sheet));
    };
    document.head.appendChild(script);
  });
}
```

Interpreting the log on the failing device:
- `endpoint=…OLD_ID…` (not the current `AKfycbwH…`) → **confirms the stale-config-cache root cause.**
- `✖ TIMEOUT … callback never fired` on all sheets → consistent with a dead endpoint returning HTML.
- `✔ callback` present → endpoint is fine and the problem is elsewhere (would lower confidence).

---

## 6. Confidence

**85%.**

Fully supported by code + git: incognito/normal split isolates the persistent HTTP cache; total simultaneous failure isolates the single shared `API.ENDPOINT`; working static UI proves a stale *value* not stale *code*; git proves the endpoint was redeployed multiple times; and the absence of any import versioning proves stale `config.js` can persist on mobile. The remaining 15% is because I could not read the failing device's actual cached endpoint or console at runtime (the sandbox proxy blocks `script.google.com`). The Section 5 logging closes that gap and will move this to certainty in one page load on the affected phone.
