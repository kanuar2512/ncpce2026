/**
 * api.js — CMIP Data Layer
 *
 * Responsibilities:
 *  - Fetch all data from Google Apps Script JSON API
 *  - In-memory cache with configurable TTL (avoids re-fetching on tab switches)
 *  - Graceful error handling with meaningful console messages
 *  - Fallback to static placeholder data when API is not yet configured
 *  - Dev mode detection (localhost / file://) for offline development
 *
 * All functions are async and return plain JS arrays or objects.
 * ui.js consumes these — never fetch directly from HTML.
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 */

'use strict';

import { API } from './config.js?v=20260702b';

/* ============================================================
   IN-MEMORY CACHE
   Structure: { [cacheKey]: { data: any, expiresAt: number } }
   ============================================================ */
const _cache = new Map();

/**
 * In-flight request map — de-duplicates concurrent identical fetches so
 * the same sheet isn't requested twice at once (e.g. `programme` is used
 * by both the Now/Next indicator and the programme table on page load).
 * This keeps concurrent calls to the Apps Script deployment low.
 * @type {Map<string, Promise<any>>}
 */
const _inflight = new Map();

/**
 * Read from cache. Returns data if fresh, null if expired/missing.
 * @param {string} key
 * @returns {any|null}
 */
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Write to cache with TTL.
 * @param {string} key
 * @param {any} data
 * @param {number} [ttl] — milliseconds; defaults to API.CACHE_TTL
 */
function cacheSet(key, data, ttl = API.CACHE_TTL) {
  _cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** Manually clear one cache entry (e.g., after a forced refresh). */
export function cacheClear(key) {
  _cache.delete(key);
}

/** Clear all cached data. */
export function cacheClearAll() {
  _cache.clear();
}


/* ============================================================
   DEV MODE DETECTION
   When running on localhost or via file://, the Apps Script
   endpoint may not be reachable. Use fallback static data.
   ============================================================ */
const IS_DEV = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:'
);

const API_NOT_CONFIGURED = API.ENDPOINT.includes('REPLACE_WITH_YOUR_SCRIPT_ID');

/**
 * Returns true when the API is unavailable and fallback data should be used.
 * @returns {boolean}
 */
function useFallback() {
  return IS_DEV || API_NOT_CONFIGURED;
}


/* ============================================================
   CORE FETCH — JSONP (bypasses CORS with Google Apps Script)
   All public fetch functions call this internally.
   ============================================================ */

/**
 * Fetch a sheet from the Apps Script JSON API using JSONP.
 * JSONP injects a <script> tag — no CORS preflight, works with GAS redirects.
 *
 * @param {string} sheet    — Sheet name (from API.SHEETS)
 * @param {Object} [params] — Additional query params (e.g. { day: 1 })
 * @returns {Promise<Array|Object>}
 * @throws {ApiError}
 */
async function fetchSheet(sheet, params = {}) {
  // Build cache key
  const paramStr = Object.keys(params).length
    ? '_' + new URLSearchParams(params).toString()
    : '';
  const cacheKey = `${sheet}${paramStr}`;

  // Return cached result if fresh
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    console.debug(`[CMIP API] Cache hit: ${cacheKey}`);
    return cached;
  }

  // Use fallback data in dev / unconfigured mode
  if (useFallback()) {
    console.warn(`[CMIP API] Using fallback data for sheet: ${sheet}`, params);
    const fallback = getFallbackData(sheet, params);
    cacheSet(cacheKey, fallback);
    return fallback;
  }

  // Reuse an in-flight request for the same key (prevents duplicate
  // concurrent JSONP calls hitting the Apps Script deployment at once).
  if (_inflight.has(cacheKey)) {
    return _inflight.get(cacheKey);
  }

  // Build URL
  const url = new URL(API.ENDPOINT);
  url.searchParams.set('sheet', sheet);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  console.debug(`[CMIP API] JSONP fetch: ${url.toString()}`);

  const request = new Promise((resolve, reject) => {
    // Unique callback name — safe global identifier
    const cbName = '_cmip_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);

    // Timeout
    const timer = setTimeout(() => {
      cleanup();
      reject(new ApiError('Request timed out after 45 seconds', 408, sheet));
    }, 45_000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      const el = document.getElementById(cbName);
      if (el) el.remove();
    }

    // Register global callback — Apps Script will call cbName({ status, data })
    window[cbName] = function (json) {
      cleanup();
      if (!json || json.status === 'error') {
        reject(new ApiError(json?.message || 'Apps Script returned an error', 0, sheet));
        return;
      }
      const data = json.data ?? json;
      cacheSet(cacheKey, data);
      resolve(data);
    };

    // Inject <script> tag — triggers JSONP call
    url.searchParams.set('callback', cbName);
    const script = document.createElement('script');
    script.id  = cbName;
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new ApiError(`Network error fetching "${sheet}"`, 0, sheet));
    };
    document.head.appendChild(script);
  });

  // Track as in-flight; clear once settled so failures can be retried later.
  _inflight.set(cacheKey, request);
  request.finally(() => _inflight.delete(cacheKey));
  return request;
}


/* ============================================================
   CUSTOM ERROR CLASS
   ============================================================ */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status  — HTTP status or 0 for network/timeout errors
   * @param {string} sheet   — Which sheet was being fetched
   */
  constructor(message, status, sheet) {
    super(message);
    this.name    = 'ApiError';
    this.status  = status;
    this.sheet   = sheet;
  }
}


/* ============================================================
   PUBLIC FETCH FUNCTIONS
   One function per data type. Each is independently cacheable.
   ============================================================ */

/**
 * Fetch site configuration from the `config` sheet.
 * Returns a key→value object (all rows merged).
 * @returns {Promise<Object>}
 */
export async function fetchSiteConfig() {
  const rows = await fetchSheet(API.SHEETS.CONFIG);
  // Convert [{key, value}, ...] array to a flat object
  if (Array.isArray(rows)) {
    return rows.reduce((acc, row) => {
      if (row.key) acc[row.key] = row.value;
      return acc;
    }, {});
  }
  return rows;
}

/**
 * Fetch programme / agenda rows for a specific day.
 * @param {number} day — 1, 2, or 3
 * @returns {Promise<Array<ProgrammeRow>>}
 */
export async function fetchProgramme(day) {
  return fetchSheet(API.SHEETS.PROGRAMME, { day });
}

/**
 * Fetch all programme rows across all days.
 * Returns an object keyed by day number: { 1: [...], 2: [...], 3: [...] }
 * @returns {Promise<Object<number, Array<ProgrammeRow>>>}
 */
export async function fetchProgrammeAll() {
  const rows = await fetchSheet(API.SHEETS.PROGRAMME);
  if (!Array.isArray(rows)) return {};
  return rows.reduce((acc, row) => {
    const d = Number(row.day) || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(row);
    return acc;
  }, {});
}

/**
 * Fetch all speakers.
 * @returns {Promise<Array<SpeakerRow>>}
 */
export async function fetchSpeakers() {
  return fetchSheet(API.SHEETS.SPEAKERS);
}

/**
 * Fetch RISE entries, optionally filtered by category.
 * @param {string} [category] — 'poster' | 'kolokium' | 'qip' | undefined (all)
 * @returns {Promise<Array<RiseRow>>}
 */
export async function fetchRise(category) {
  const params = category ? { cat: category } : {};
  return fetchSheet(API.SHEETS.RISE, params);
}

/**
 * Fetch download items.
 * @param {string} [section] — 'main' | 'rise' | undefined (all)
 * @returns {Promise<Array<DownloadRow>>}
 */
export async function fetchDownloads(section) {
  const params = section ? { section } : {};
  return fetchSheet(API.SHEETS.DOWNLOADS, params);
}

/**
 * Fetch gallery images.
 * @returns {Promise<Array<GalleryRow>>}
 */
export async function fetchGallery() {
  return fetchSheet(API.SHEETS.GALLERY);
}

/**
 * Fetch FAQ items.
 * @param {string} [section] — 'main' | 'rise' | undefined (all)
 * @returns {Promise<Array<FaqRow>>}
 */
export async function fetchFaq(section) {
  const params = section ? { section } : {};
  return fetchSheet(API.SHEETS.FAQ, params);
}

/**
 * Fetch sponsors / partners.
 * @returns {Promise<Array<SponsorRow>>}
 */
export async function fetchSponsors() {
  return fetchSheet(API.SHEETS.SPONSORS);
}

/**
 * Fetch contact / committee information.
 * @returns {Promise<Array<ContactRow>>}
 */
export async function fetchContact() {
  return fetchSheet(API.SHEETS.CONTACT);
}


/* ============================================================
   FALLBACK STATIC DATA
   Used during development or before Apps Script is deployed.
   Replace with real data once Google Sheets is set up.
   ============================================================ */

/**
 * @param {string} sheet
 * @param {Object} params
 * @returns {Array|Object}
 */
function getFallbackData(sheet, params = {}) {
  switch (sheet) {

    case API.SHEETS.CONFIG:
      return [
        { key: 'conference_name_ms', value: 'Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026' },
        { key: 'conference_name_en', value: 'National Conference on Pharmaceutical Crime Enforcement 2026' },
        { key: 'about_ms',           value: 'Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026 merupakan platform utama yang menyatukan pegawai penguatkuasaan farmasi seluruh Malaysia bagi berkongsi pengetahuan, pengalaman dan inovasi dalam memerangi jenayah farmaseutikal.' },
        { key: 'about_en',           value: 'The National Conference on Pharmaceutical Crime Enforcement 2026 is the premier platform uniting pharmaceutical enforcement officers across Malaysia to share knowledge, experience and innovation in combating pharmaceutical crime.' },
        { key: 'milestone_desc_ms',  value: 'Tahun ini menandakan jubli emas 50 tahun penguatkuasaan farmasi Malaysia — satu pencapaian bersejarah yang mencerminkan dedikasi generasi pegawai dalam melindungi kesihatan awam.' },
        { key: 'milestone_desc_en',  value: 'This year marks the golden jubilee of 50 years of pharmaceutical enforcement in Malaysia — a historic milestone reflecting the dedication of generations of officers in protecting public health.' },
        // Live announcement banner — controlled from the `config` sheet during the event.
        { key: 'announcement_active', value: 'no' },     // yes | no
        { key: 'announcement_ms',     value: '' },
        { key: 'announcement_en',     value: '' },
        { key: 'announcement_level',  value: 'info' },    // info | warning
      ];

    case API.SHEETS.PROGRAMME: {
      const day = Number(params.day);
      const all = {
        1: [
          { day: 1, time_start: '15:00', time_end: '15:30', title_ms: 'Pendaftaran Masuk', title_en: 'Check-In Registration', speaker_ms: '—', speaker_en: '—', venue_ms: 'Lobi Utama', venue_en: 'Main Lobby', type: 'registration' },
          { day: 1, time_start: '15:30', time_end: '16:30', title_ms: 'Kudapan Petang & Networking', title_en: 'Afternoon Tea & Networking', speaker_ms: '—', speaker_en: '—', venue_ms: 'Lobi Dewan', venue_en: 'Hall Lobby', type: 'break' },
          { day: 1, time_start: '18:30', time_end: '20:00', title_ms: 'Makan Malam', title_en: 'Dinner', speaker_ms: '—', speaker_en: '—', venue_ms: 'Restoran Hotel', venue_en: 'Hotel Restaurant', type: 'dinner' },
          { day: 1, time_start: '20:00', time_end: '20:15', title_ms: 'Pendaftaran Peserta & Taklimat Urus Setia', title_en: 'Participant Registration & Secretariat Briefing', speaker_ms: 'Urus Setia', speaker_en: 'Secretariat', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'registration' },
          { day: 1, time_start: '20:15', time_end: '20:30', title_ms: 'Kata Alu-aluan Tuan Pengarah BPF', title_en: 'Welcome Address by Director of BPF', speaker_ms: 'Pengarah BPF', speaker_en: 'Director of BPF', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'ceremony' },
          { day: 1, time_start: '20:30', time_end: '21:30', title_ms: 'Ceramah 1: Evolusi Penguatkuasaan Farmasi Malaysia — 50 Tahun Perjalanan', title_en: 'Talk 1: Evolution of Pharmaceutical Enforcement in Malaysia — A 50-Year Journey', speaker_ms: 'TBC', speaker_en: 'TBC', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
        ],
        2: [
          { day: 2, time_start: '07:00', time_end: '08:30', title_ms: 'Sarapan', title_en: 'Breakfast', speaker_ms: '—', speaker_en: '—', venue_ms: 'Restoran Hotel', venue_en: 'Hotel Restaurant', type: 'break' },
          { day: 2, time_start: '08:30', time_end: '10:30', title_ms: 'Majlis Perasmian Rasmi (Ketua Pengarah Kesihatan)', title_en: 'Official Opening Ceremony (Director-General of Health)', speaker_ms: 'KPK', speaker_en: 'DG of Health', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'ceremony' },
          { day: 2, time_start: '10:45', time_end: '11:45', title_ms: 'Ceramah 2: Teknologi Pengesahan Hologram — Kalis Masa Depan', title_en: 'Talk 2: Hologram Authentication Technology — Future-Proofing', speaker_ms: 'TBC', speaker_en: 'TBC', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
          { day: 2, time_start: '11:45', time_end: '13:00', title_ms: 'Lawatan Poster & Pameran R&D / RISE', title_en: 'Poster & R&D/RISE Exhibition Visit', speaker_ms: '—', speaker_en: '—', venue_ms: 'Lobi Dewan', venue_en: 'Hall Lobby', type: 'poster' },
          { day: 2, time_start: '14:30', time_end: '15:30', title_ms: 'Ceramah 3: Jejak Digital — Penyiasatan Jenayah Farmaseutikal Siber (PDRM)', title_en: 'Talk 3: Digital Trail — Cyber Pharmaceutical Crime Investigation (PDRM)', speaker_ms: 'PDRM', speaker_en: 'PDRM', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
          { day: 2, time_start: '15:30', time_end: '16:30', title_ms: 'Ceramah 4: Forensik Digital & Regulasi Platform (SKMM)', title_en: 'Talk 4: Digital Forensics & Platform Regulation (MCMC)', speaker_ms: 'SKMM', speaker_en: 'MCMC', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
          { day: 2, time_start: '19:30', time_end: '23:00', title_ms: 'Malam Gala / Grand Dinner', title_en: 'Gala Night / Grand Dinner', speaker_ms: '—', speaker_en: '—', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'dinner' },
        ],
        3: [
          { day: 3, time_start: '08:30', time_end: '09:30', title_ms: 'Ceramah 5: Rangkaian Jenayah Kewangan Farmaseutikal (NFCC)', title_en: 'Talk 5: Pharmaceutical Financial Crime Network (NFCC)', speaker_ms: 'NFCC', speaker_en: 'NFCC', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
          { day: 3, time_start: '09:30', time_end: '10:30', title_ms: 'Ceramah 6: Rangkaian Kerjasama Antarabangsa (Interpol / WHO)', title_en: 'Talk 6: International Cooperation Networks (Interpol / WHO)', speaker_ms: 'TBC', speaker_en: 'TBC', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'talk' },
          { day: 3, time_start: '11:00', time_end: '13:00', title_ms: 'Majlis Penutup, Penyampaian Anugerah & Hadiah RISE', title_en: 'Closing Ceremony, Award & RISE Prize Presentation', speaker_ms: '—', speaker_en: '—', venue_ms: 'Dewan Utama', venue_en: 'Main Hall', type: 'award' },
          { day: 3, time_start: '13:00', time_end: '14:00', title_ms: 'Makan Tengah Hari & Bersurai', title_en: 'Lunch & Dismissal', speaker_ms: '—', speaker_en: '—', venue_ms: 'Restoran Hotel', venue_en: 'Hotel Restaurant', type: 'break' },
        ],
      };
      return day && all[day] ? all[day] : Object.values(all).flat();
    }

    case API.SHEETS.SPEAKERS:
      return [
        { id: 'SP01', name_ms: 'TBC', name_en: 'TBC', title_ms: 'Pembentang Jemputan', title_en: 'Invited Speaker', org_ms: 'TBC', org_en: 'TBC', bio_ms: 'Butiran pembentang akan dikemaskini.', bio_en: 'Speaker details will be updated.', photo_url: '', topic_ms: 'Ceramah 1', topic_en: 'Talk 1', day: 1 },
        { id: 'SP02', name_ms: 'TBC', name_en: 'TBC', title_ms: 'Pembentang Jemputan', title_en: 'Invited Speaker', org_ms: 'TBC', org_en: 'TBC', bio_ms: 'Butiran pembentang akan dikemaskini.', bio_en: 'Speaker details will be updated.', photo_url: '', topic_ms: 'Ceramah 2', topic_en: 'Talk 2', day: 2 },
        { id: 'SP03', name_ms: 'TBC', name_en: 'TBC', title_ms: 'Pembentang Jemputan', title_en: 'Invited Speaker', org_ms: 'PDRM', org_en: 'PDRM', bio_ms: 'Butiran pembentang akan dikemaskini.', bio_en: 'Speaker details will be updated.', photo_url: '', topic_ms: 'Ceramah 3', topic_en: 'Talk 3', day: 2 },
        { id: 'SP04', name_ms: 'TBC', name_en: 'TBC', title_ms: 'Pembentang Jemputan', title_en: 'Invited Speaker', org_ms: 'SKMM', org_en: 'MCMC', bio_ms: 'Butiran pembentang akan dikemaskini.', bio_en: 'Speaker details will be updated.', photo_url: '', topic_ms: 'Ceramah 4', topic_en: 'Talk 4', day: 2 },
        { id: 'SP05', name_ms: 'TBC', name_en: 'TBC', title_ms: 'Pembentang Jemputan', title_en: 'Invited Speaker', org_ms: 'NFCC', org_en: 'NFCC', bio_ms: 'Butiran pembentang akan dikemaskini.', bio_en: 'Speaker details will be updated.', photo_url: '', topic_ms: 'Ceramah 5', topic_en: 'Talk 5', day: 3 },
      ];

    case API.SHEETS.RISE: {
      const cat = params.cat;
      const all = [
        { id: 'R001', title_ms: 'Kajian Keberkesanan Operasi Pembersihan Farmasi Haram', title_en: 'Effectiveness Study of Illegal Pharmacy Clearance Operations', author_ms: 'Nama Peserta', author_en: 'Participant Name', cawangan_ms: 'Cawangan Klang', cawangan_en: 'Klang Branch', category: 'poster', drive_url: '#', abstract_url: '#' },
        { id: 'R002', title_ms: 'Inovasi Sistem Pengesanan Produk Farmasi Palsu Menggunakan AI', title_en: 'AI-Based Counterfeit Pharmaceutical Product Detection System Innovation', author_ms: 'Nama Peserta', author_en: 'Participant Name', cawangan_ms: 'HQ BPF', cawangan_en: 'BPF HQ', category: 'poster', drive_url: '#', abstract_url: '#' },
        { id: 'R003', title_ms: 'Perkongsian Amalan Terbaik Pengurusan Kes Farmasi Siber', title_en: 'Best Practice Sharing for Cyber Pharmaceutical Case Management', author_ms: 'Nama Peserta', author_en: 'Participant Name', cawangan_ms: 'Cawangan Johor Bahru', cawangan_en: 'Johor Bahru Branch', category: 'kolokium', drive_url: '#', abstract_url: '#' },
        { id: 'R004', title_ms: 'Projek Penambahbaikan Sistem Rekod Tangkapan Farmasi', title_en: 'Pharmaceutical Seizure Record System Improvement Project', author_ms: 'Nama Peserta', author_en: 'Participant Name', cawangan_ms: 'Cawangan Pulau Pinang', cawangan_en: 'Penang Branch', category: 'qip', drive_url: '#', abstract_url: '#' },
      ];
      return cat ? all.filter(r => r.category === cat) : all;
    }

    case API.SHEETS.DOWNLOADS: {
      const section = params.section;
      const all = [
        { id: 'DL01', title_ms: 'Surat Jemputan Peserta', title_en: 'Participant Invitation Letter', filename: 'surat-jemputan.pdf', file_type: 'pdf', section: 'main', drive_url: '#' },
        { id: 'DL02', title_ms: 'Terma & Syarat Penyertaan', title_en: 'Terms & Conditions of Participation', filename: 'terma-syarat.pdf', file_type: 'pdf', section: 'main', drive_url: '#' },
        { id: 'DL03', title_ms: 'Aturcara Lengkap Persidangan', title_en: 'Full Conference Programme', filename: 'aturcara.pdf', file_type: 'pdf', section: 'main', drive_url: '#' },
        { id: 'DL04', title_ms: 'Garis Panduan Poster RISE', title_en: 'RISE Poster Guidelines', filename: 'garis-panduan-poster.pdf', file_type: 'pdf', section: 'rise', drive_url: '#' },
        { id: 'DL05', title_ms: 'Borang Penilaian RISE', title_en: 'RISE Evaluation Form', filename: 'borang-penilaian.pdf', file_type: 'pdf', section: 'rise', drive_url: '#' },
        { id: 'DL06', title_ms: 'Templat Abstrak RISE', title_en: 'RISE Abstract Template', filename: 'templat-abstrak.docx', file_type: 'docx', section: 'rise', drive_url: '#' },
      ];
      return section ? all.filter(d => d.section === section) : all;
    }

    case API.SHEETS.GALLERY:
      return [];   // Empty = shows "Coming Soon" placeholder

    case API.SHEETS.FAQ: {
      const section = params.section;
      const all = [
        { id: 'F01', question_ms: 'Siapakah yang layak menyertai persidangan ini?', question_en: 'Who is eligible to participate in this conference?', answer_ms: 'Persidangan ini terbuka kepada semua pegawai Bahagian Penguatkuasaan Farmasi (BPF), agensi penguatkuasaan jemputan, dan rakan strategik yang dilantik oleh urus setia.', answer_en: 'This conference is open to all Pharmaceutical Enforcement Division (BPF) officers, invited enforcement agencies, and strategic partners appointed by the secretariat.', section: 'main' },
        { id: 'F02', question_ms: 'Di manakah lokasi persidangan?', question_en: 'Where is the conference venue?', answer_ms: 'Persidangan diadakan di KSL Esplanade Hotel & Resort, Jalan Meru, 41050 Klang, Selangor.', answer_en: 'The conference is held at KSL Esplanade Hotel & Resort, Jalan Meru, 41050 Klang, Selangor.', section: 'main' },
        { id: 'F03', question_ms: 'Adakah kemudahan penginapan disediakan?', question_en: 'Is accommodation provided?', answer_ms: 'Penginapan perlu ditempah sendiri oleh peserta. KSL Esplanade Hotel menyediakan kadar khas untuk peserta persidangan. Sila rujuk surat jemputan untuk kod promosi.', answer_en: 'Accommodation must be booked by participants individually. KSL Esplanade Hotel provides special rates for conference participants. Please refer to your invitation letter for the promo code.', section: 'main' },
        { id: 'F04', question_ms: 'Bagaimana untuk menyertai RISE Symposium?', question_en: 'How do I participate in the RISE Symposium?', answer_ms: 'Penyertaan RISE terbuka kepada pegawai BPF. Peserta perlu menghantar abstrak dan poster mengikut garis panduan yang disediakan. Sila muat turun dokumen RISE untuk maklumat lanjut.', answer_en: 'RISE participation is open to BPF officers. Participants must submit an abstract and poster following the provided guidelines. Please download the RISE documents for further information.', section: 'main' },
        { id: 'F05', question_ms: 'Apakah kategori dalam RISE Symposium?', question_en: 'What are the categories in the RISE Symposium?', answer_ms: 'RISE mempunyai tiga kategori: (1) Pembentangan Poster R&D — pertandingan; (2) Kolokium Poster R&D — perkongsian tidak dipertandingkan; (3) Projek Inisiatif Penambahbaikan Kualiti (QIP) — pertandingan pameran booth.', answer_en: 'RISE has three categories: (1) R&D Poster Presentation — competition; (2) R&D Poster Colloquium — non-competitive sharing; (3) Quality Improvement Initiative (QIP) Project — booth exhibition competition.', section: 'rise' },
        { id: 'F06', question_ms: 'Bilakah sistem undi Innovation Choice Award akan dibuka?', question_en: 'When will the Innovation Choice Award voting system open?', answer_ms: 'Sistem undi akan diaktifkan semasa persidangan berlangsung. Peserta yang hadir akan menerima kod akses bagi mengundi poster atau projek pilihan mereka.', answer_en: 'The voting system will be activated during the conference. Attending participants will receive an access code to vote for their preferred poster or project.', section: 'rise' },
      ];
      return section ? all.filter(f => f.section === section) : all;
    }

    case API.SHEETS.SPONSORS:
      return [
        { id: 'S01', name: 'PDRM', full_name_ms: 'Polis Diraja Malaysia', full_name_en: 'Royal Malaysia Police', logo_url: '', website: 'https://www.rmp.gov.my', tier: 'strategic' },
        { id: 'S02', name: 'SKMM', full_name_ms: 'Suruhanjaya Komunikasi & Multimedia Malaysia', full_name_en: 'Malaysian Communications & Multimedia Commission', logo_url: '', website: 'https://www.mcmc.gov.my', tier: 'strategic' },
        { id: 'S03', name: 'NFCC', full_name_ms: 'Pusat Koordinasi Jenayah Kewangan Kebangsaan', full_name_en: 'National Financial Crimes Centre', logo_url: '', website: '#', tier: 'strategic' },
      ];

    case API.SHEETS.CONTACT:
      return [
        { id: 'C01', name_ms: 'Urus Setia Persidangan', name_en: 'Conference Secretariat', role_ms: 'Pertanyaan Am', role_en: 'General Enquiries', email: 'bpf@moh.gov.my', phone: '+603-XXXX XXXX', unit_ms: 'Bahagian Penguatkuasaan Farmasi', unit_en: 'Pharmaceutical Enforcement Division' },
        { id: 'C02', name_ms: 'Penyelaras RISE', name_en: 'RISE Coordinator', role_ms: 'Pertanyaan RISE & Teknikal', role_en: 'RISE & Technical Enquiries', email: 'rise@bpf.moh.gov.my', phone: '+603-XXXX XXXX', unit_ms: 'Bahagian Penguatkuasaan Farmasi', unit_en: 'Pharmaceutical Enforcement Division' },
      ];

    default:
      console.warn(`[CMIP API] No fallback data defined for sheet: "${sheet}"`);
      return [];
  }
}


/* ============================================================
   TYPE DEFINITIONS (JSDoc — for IDE intellisense)
   ============================================================ */

/**
 * @typedef {Object} ProgrammeRow
 * @property {number} day
 * @property {string} time_start
 * @property {string} time_end
 * @property {string} title_ms
 * @property {string} title_en
 * @property {string} speaker_ms
 * @property {string} speaker_en
 * @property {string} venue_ms
 * @property {string} venue_en
 * @property {string} type  — registration|ceremony|talk|break|dinner|award|poster|workshop
 */

/**
 * @typedef {Object} SpeakerRow
 * @property {string} id
 * @property {string} name_ms
 * @property {string} name_en
 * @property {string} title_ms
 * @property {string} title_en
 * @property {string} org_ms
 * @property {string} org_en
 * @property {string} bio_ms
 * @property {string} bio_en
 * @property {string} photo_url  — Google Drive shareable link
 * @property {string} topic_ms
 * @property {string} topic_en
 * @property {number} day
 */

/**
 * @typedef {Object} RiseRow
 * @property {string} category     — "1" | "2" | "3"
 * @property {string} title        — Presentation title
 * @property {string} author       — Presenter name
 * @property {string} branch       — State / Branch
 * @property {string} abstract_url — Google Drive PDF link for abstract
 * @property {string} poster_url   — Google Drive image/PDF link for poster
 * @property {number} order        — Display order (ascending)
 */

/**
 * @typedef {Object} DownloadRow
 * @property {string} id
 * @property {string} title_ms
 * @property {string} title_en
 * @property {string} filename
 * @property {string} file_type  — pdf|docx|xlsx|pptx|zip
 * @property {string} section    — main|rise
 * @property {string} drive_url
 */

/**
 * @typedef {Object} FaqRow
 * @property {string} id
 * @property {string} question_ms
 * @property {string} question_en
 * @property {string} answer_ms
 * @property {string} answer_en
 * @property {string} section  — main|rise
 */

/**
 * @typedef {Object} SponsorRow
 * @property {string} id
 * @property {string} name
 * @property {string} full_name_ms
 * @property {string} full_name_en
 * @property {string} logo_url
 * @property {string} website
 * @property {string} tier  — strategic|supporting
 */

/**
 * @typedef {Object} ContactRow
 * @property {string} id
 * @property {string} name_ms
 * @property {string} name_en
 * @property {string} role_ms
 * @property {string} role_en
 * @property {string} email
 * @property {string} phone
 * @property {string} unit_ms
 * @property {string} unit_en
 */

/**
 * @typedef {Object} GalleryRow
 * @property {string} id
 * @property {string} title_ms
 * @property {string} title_en
 * @property {string} url        — direct image URL or Drive thumbnail URL
 * @property {string} thumb_url
 * @property {string} date
 */
