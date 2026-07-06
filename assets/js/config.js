/**
 * config.js — CMIP Site Configuration
 * Single source of truth for all constants, labels, and settings.
 *
 * HOW TO UPDATE FOR A NEW CONFERENCE YEAR:
 *  1. Update CONFERENCE object (dates, venue, theme)
 *  2. Update API.ENDPOINT with the new Apps Script deployment URL
 *  3. Update NAV if new sections are added
 *  4. Update LANG strings if wording changes
 *  Everything else adapts automatically.
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 * Bahagian Penguatkuasaan Farmasi, Kementerian Kesihatan Malaysia
 */

'use strict';

/* ============================================================
   API CONFIGURATION
   Replace ENDPOINT with your deployed Apps Script Web App URL.
   Format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ============================================================ */
export const API = Object.freeze({
  /** @type {string} Deployed Apps Script Web App URL */
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwHbUK5expjvgbqcQ3aNGpwkr06fZvp_6gppQFicbxVLk1KUeK1ATCDllhm4XysBnR7EA/exec',

  /** Cache duration in milliseconds (5 minutes) */
  CACHE_TTL: 5 * 60 * 1000,

  /** Sheets to fetch — must match tab names in Google Sheets */
  SHEETS: Object.freeze({
    CONFIG:     'config',
    PROGRAMME:  'programme',
    SPEAKERS:   'speakers',
    RISE:       'rise',
    DOWNLOADS:  'downloads',
    GALLERY:    'gallery',
    FAQ:        'faq',
    SPONSORS:   'sponsors',
    CONTACT:    'contact',
  }),
});


/* ============================================================
   CONFERENCE METADATA
   ============================================================ */
export const CONFERENCE = Object.freeze({
  /** Full official name — Bahasa Malaysia */
  name_ms: 'Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026',

  /** Full official name — English */
  name_en: 'National Conference on Pharmaceutical Crime Enforcement 2026',

  /** Short abbreviation */
  abbr: 'PKPJF 2026',

  /** Conference theme — BM */
  theme_ms: '50 Tahun Penguatkuasaan Farmasi: Dari Legasi ke Transformasi Digital, Mendepani Jenayah Farmaseutikal Tanpa Sempadan',

  /** Conference theme — EN */
  theme_en: '50 Years of Pharmaceutical Enforcement: From Legacy to Digital Transformation, Confronting Borderless Pharmaceutical Crime',

  /** Conference dates */
  dates: Object.freeze({
    /** Main conference start — ISO 8601 */
    start: '2026-07-27T08:30:00',
    /** Main conference end */
    end:   '2026-07-29T13:00:00',
    /** Display string — BM */
    display_ms: '27 – 29 Julai 2026',
    /** Display string — EN */
    display_en: '27 – 29 July 2026',
    /** Day labels for programme tabs */
    days_ms: ['Hari 1 — 27 Julai', 'Hari 2 — 28 Julai', 'Hari 3 — 29 Julai'],
    days_en: ['Day 1 — 27 July',   'Day 2 — 28 July',   'Day 3 — 29 July'],
  }),

  /** Venue information */
  venue: Object.freeze({
    name_ms:   'Hotel KSL Esplanade, Klang',
    name_en:   'KSL Esplanade Hotel, Klang',
    address:   'No. 1, Persiaran Bestari 2/KS09, Bandar Bestari, 41200 Klang, Selangor, Malaysia',
    city_ms:   'Klang, Selangor',
    city_en:   'Klang, Selangor',
    /** Google Maps embed src URL */
    maps_embed: 'https://maps.google.com/maps?q=KSL+Esplanade+Hotel+Klang&output=embed',
    /** Google Maps link for "Get Directions" button */
    maps_link:  'https://maps.google.com/?q=KSL+Esplanade+Hotel+Klang',
    /** Distance from KL Sentral */
    distance_ms: 'Lebih kurang 45 minit dari KL Sentral',
    distance_en: 'Approximately 45 minutes from KL Sentral',
    parking_ms:  'Kemudahan tempat letak kereta percuma disediakan',
    parking_en:  'Free parking available on-site',
  }),

  /** Organiser information */
  organiser: Object.freeze({
    name_ms: 'Bahagian Penguatkuasaan Farmasi',
    name_en: 'Pharmacy Enforcement Division',
    parent_ms: 'Kementerian Kesihatan Malaysia',
    parent_en: 'Ministry of Health Malaysia',
    abbr:    'BPF, KKM',
    email:   'bpf@moh.gov.my',
    website: 'https://www.pharmacy.gov.my',
  }),

  /** Conference year — used for copyright footer */
  year: 2026,

  /** Milestone being celebrated */
  milestone_ms: '50 Tahun Penguatkuasaan Farmasi',
  milestone_en: '50 Years of Pharmaceutical Enforcement',
});


/* ============================================================
   NAVIGATION STRUCTURE
   Order here controls render order in nav and mobile drawer.
   ============================================================ */
export const NAV = Object.freeze([
  { id: 'home',      href: '#home',      label_ms: 'Utama',       label_en: 'Home',       page: 'index' },
  { id: 'about',     href: '#about',     label_ms: 'Tentang',     label_en: 'About',      page: 'index' },
  { id: 'why',       href: '#why',       label_ms: 'Sorotan',     label_en: 'Highlights', page: 'index' },
  { id: 'programme', href: '#programme', label_ms: 'Atur Cara',   label_en: 'Programme',  page: 'index' },
  { id: 'venue',     href: '#venue',     label_ms: 'Tempat',      label_en: 'Venue',      page: 'index' },
  { id: 'speakers',  href: '#speakers',  label_ms: 'Pembentang',  label_en: 'Speakers',   page: 'index' },
  { id: 'awards',    href: '#awards',    label_ms: 'Anugerah',    label_en: 'Awards',     page: 'index' },
  { id: 'gallery',   href: '#gallery',   label_ms: 'Galeri',      label_en: 'Gallery',    page: 'index' },
  { id: 'faq',       href: '#faq',       label_ms: 'Soal Jawab',  label_en: 'FAQ',        page: 'index' },
  { id: 'contact',   href: '#contact',   label_ms: 'Hubungi',     label_en: 'Contact',    page: 'index' },
  { id: 'rise',      href: 'rise.html',  label_ms: 'RISE',        label_en: 'RISE',       page: 'both',  isRise: true },
]);

/** RISE sub-navigation (used in rise.html) */
export const NAV_RISE = Object.freeze([
  { id: 'rise-intro',     href: '#rise-intro',     label_ms: 'Pengenalan',   label_en: 'Overview'      },
  { id: 'rise-categories',href: '#rise-categories',label_ms: 'Kategori',     label_en: 'Categories'    },
  { id: 'rise-gallery',   href: '#rise-gallery',   label_ms: 'Pembentangan', label_en: 'Presentations'  },
  { id: 'rise-downloads', href: '#rise-downloads', label_ms: 'Muat Turun',   label_en: 'Downloads'     },
  { id: 'rise-voting',    href: '#rise-voting',    label_ms: 'Pengundian',   label_en: 'Voting',       isVoting: true },
]);


/* ============================================================
   GALLERY DIRECTORY
   Per-day gallery folder links (Google Drive / Google Photos).
   HOW TO UPDATE: paste each day's shared folder URL into `url`.
   Leave url as '' until the folder is ready — the button is then
   disabled and shows the "available after the event" message.
   No HTML/CSS changes are needed.
   ============================================================ */
export const GALLERY = Object.freeze({
  days: Object.freeze([
    { day: 1, date_ms: '27 Julai 2026', date_en: '27 July 2026', url: 'https://drive.google.com/drive/folders/1GAmZuWq5gg7BhCWZhk6p7LITU1ZuBhxg?usp=drive_link' },
    { day: 2, date_ms: '28 Julai 2026', date_en: '28 July 2026', url: 'https://drive.google.com/drive/folders/1MPpDjPeOWAc8AgCZglsdeOnSmB1VCzSu?usp=drive_link' },
    { day: 3, date_ms: '29 Julai 2026', date_en: '29 July 2026', url: 'https://drive.google.com/drive/folders/1LcabyrZ0m0NVFjaW46mjafopIL9gM1bz?usp=drive_link' },
  ]),
});


/* ============================================================
   THEME SONG — Lagu Tema Rasmi
   ------------------------------------------------------------
   To activate the ▶ Main Lagu button, paste the playback URL
   into `url` below. Nothing else needs to change — the button
   enables itself automatically. While `url` is empty, only the
   play button is disabled; "Lihat Lirik" always works.
   ============================================================ */
export const THEME_SONG = Object.freeze({
  title:     'Lima Dekad Penguatkuasaan Farmasi',
  url:       'https://storage3.me-qr.com/mp3/65071f9b-2670-42d4-8c31-4a8657c3c78b.mp3',   // ← direct MP3; play button activates automatically
  lyricsUrl: 'https://drive.google.com/file/d/1Mhz5cM6iKQWpaEzQa-XiqMehbcB-KmRF/view',
});


/* ============================================================
   RISE MODULE CONFIGURATION
   ============================================================ */
export const RISE = Object.freeze({
  name_ms: 'RISE Symposium',
  name_en: 'RISE Symposium',

  /** Full name */
  fullname_ms: 'Simposium Penyelidikan dan Pembangunan (R&D) dan Inisiatif Penambahbaikan Kualiti Penguatkuasaan Farmasi',
  fullname_en: 'R&D and Quality Improvement Initiatives Symposium for Pharmacy Enforcement',

  abbr: 'RISE',

  /** Category definitions — order controls render */
  categories: Object.freeze([
    {
      id:         'cat1',
      num:        '1',
      label_ms:   'Kategori 1',
      label_en:   'Category 1',
      title_ms:   'Pertandingan Poster Penyelidikan dan Pembangunan (R&D) Penguatkuasaan Farmasi',
      title_en:   'Research & Development (R&D) Poster Competition for Pharmacy Enforcement',
      type_ms:    'Pertandingan',
      type_en:    'Competition',
      method_ms:  'Poster Fizikal',
      method_en:  'Physical Poster',
      desc_ms:    'Poster bersaiz A0 dipamerkan menggunakan A0 board sepanjang persidangan. Peserta akan dinilai oleh panel juri yang dilantik.',
      desc_en:    'A0-size posters displayed on A0 boards throughout the conference. Participants are assessed by an appointed panel of judges.',
      icon:       'trophy',
    },
    {
      id:         'cat2',
      num:        '2',
      label_ms:   'Kategori 2',
      label_en:   'Category 2',
      title_ms:   'Kolokium Poster Penyelidikan dan Pembangunan (R&D) Penguatkuasaan Farmasi',
      title_en:   'Research & Development (R&D) Poster Colloquium for Pharmacy Enforcement',
      type_ms:    'Perkongsian (Tidak Dipertandingkan)',
      type_en:    'Sharing (Non-competitive)',
      method_ms:  'Poster Fizikal',
      method_en:  'Physical Poster',
      desc_ms:    'Platform perkongsian pengetahuan melalui poster R&D. Tidak dipertandingkan — bertujuan memupuk budaya penyelidikan dalam kalangan pegawai.',
      desc_en:    'A knowledge-sharing platform via R&D posters. Non-competitive — aimed at cultivating a research culture among officers.',
      icon:       'beaker',
    },
    {
      id:         'cat3',
      num:        '3',
      label_ms:   'Kategori 3',
      label_en:   'Category 3',
      title_ms:   'Pertandingan Projek Inisiatif Penambahbaikan Kualiti Penguatkuasaan Farmasi',
      title_en:   'Pharmaceutical Enforcement Quality Improvement Initiative Project Competition',
      type_ms:    'Pertandingan',
      type_en:    'Competition',
      method_ms:  'Pameran Projek',
      method_en:  'Project Exhibition',
      desc_ms:    'Pameran projek inisiatif penambahbaikan kualiti menggunakan shell scheme booth.',
      desc_en:    'Exhibition of quality improvement initiative projects using shell scheme booths.',
      icon:       'cog',
    },
  ]),

  /**
   * Voting module.
   * Voting configuration — ONLY update these two values:
   *
   *   status  'before'  → button disabled, shows "UNDIAN BELUM DIBUKA"
   *           'open'    → button enabled, opens voting webapp in new tab
   *           'closed'  → button disabled, shows "UNDIAN TELAH DITUTUP"
   *
   *   url     Paste the deployed voting webapp URL when status is 'open'.
   *
   * No HTML or CSS changes are needed — everything updates automatically.
   */
  voting: Object.freeze({
    status: 'open',   // 'before' | 'open' | 'closed'
    url:    'https://go.gov.my/UNDI-RISE2026',
  }),
});


/* ============================================================
   LANGUAGE STRINGS
   All static UI text that does not come from Google Sheets.
   ============================================================ */
export const LANG = Object.freeze({
  ms: Object.freeze({
    /* Navigation */
    nav_home:        'Utama',
    nav_about:       'Tentang',
    nav_venue:       'Tempat',
    nav_programme:   'Aturcara',
    nav_speakers:    'Pembentang',
    nav_downloads:   'Muat Turun',
    nav_gallery:     'Galeri',
    nav_sponsors:    'Rakan Kongsi',
    nav_faq:         'Soal Jawab',
    nav_contact:     'Hubungi Kami',
    nav_rise:        'RISE',

    /* Hero */
    hero_date:       '27 – 29 Julai 2026',
    hero_venue:      'Hotel KSL Esplanade, Klang',
    hero_scroll:     'Tatal ke bawah',

    /* Countdown */
    countdown_title: 'Menuju Persidangan',
    countdown_days:  'Hari',
    countdown_hours: 'Jam',
    countdown_mins:  'Min',
    countdown_secs:  'Saat',
    countdown_ended: 'Persidangan sedang berlangsung!',

    /* Sections */
    section_about:     'Tentang Persidangan',
    section_venue:     'Tempat & Penginapan',
    section_programme: 'Atur Cara Persidangan',
    section_speakers:  'Pembentang Pakar',
    section_downloads: 'Muat Turun',
    section_gallery:   'Galeri',
    section_sponsors:  'Rakan Strategik & Sokongan',
    section_faq:       'Soalan Lazim',
    section_contact:   'Hubungi Kami',

    /* States */
    loading:           'Memuatkan data…',
    error_load:        'Ralat memuatkan data. Sila muat semula halaman.',
    no_data:           'Tiada data tersedia.',
    coming_soon:       'Akan datang',

    /* Gallery */
    gallery_placeholder_title: 'Galeri Akan Dikemaskini',
    gallery_placeholder_desc:  'Foto persidangan akan dimuat naik semasa dan selepas majlis berlangsung.',

    /* Venue */
    venue_directions:  'Dapatkan Arah',
    venue_distance:    'Jarak dari KL Sentral',
    venue_parking:     'Tempat Letak Kereta',
    venue_address:     'Alamat',

    /* Footer */
    footer_rights:     'Hak cipta terpelihara.',
    footer_org:        'Bahagian Penguatkuasaan Farmasi, Kementerian Kesihatan Malaysia',
    footer_links:      'Pautan Pantas',
    footer_contact:    'Hubungi Kami',
    footer_dev:        'Laman web ini dibangunkan untuk kegunaan rasmi persidangan.',

    /* RISE */
    rise_intro_title:  'Pengenalan RISE',
    rise_cat_title:    'Kategori Penyertaan',
    rise_gallery_title:'Senarai Penyertaan',
    rise_dl_title:     'Muat Turun RISE',
    rise_vote_title:   'Undi Anugerah Pilihan Inovasi',
    rise_vote_stub:    'Sistem undi akan diaktifkan semasa persidangan. Sila kembali semula pada tarikh berkenaan.',
    rise_back:         '← Kembali ke Laman Utama',

    /* Awards */
    awards_title:      'Anugerah & Pengiktirafan',

    /* Contact */
    contact_email:     'E-mel',
    contact_phone:     'Telefon',
    contact_role:      'Jawatan',

    /* Misc */
    read_more:         'Baca Lanjut',
    download:          'Muat Turun',
    view:              'Lihat',
    close:             'Tutup',
    back_to_top:       'Kembali ke atas',
    get_directions:    'Dapatkan Arah',
    lang_switch:       'EN',
  }),

  en: Object.freeze({
    /* Navigation */
    nav_home:        'Home',
    nav_about:       'About',
    nav_venue:       'Venue',
    nav_programme:   'Programme',
    nav_speakers:    'Speakers',
    nav_downloads:   'Downloads',
    nav_gallery:     'Gallery',
    nav_sponsors:    'Partners',
    nav_faq:         'FAQ',
    nav_contact:     'Contact Us',
    nav_rise:        'RISE',

    /* Hero */
    hero_date:       '27 – 29 July 2026',
    hero_venue:      'KSL Esplanade Hotel, Klang',
    hero_scroll:     'Scroll down',

    /* Countdown */
    countdown_title: 'Countdown to Conference',
    countdown_days:  'Days',
    countdown_hours: 'Hours',
    countdown_mins:  'Mins',
    countdown_secs:  'Secs',
    countdown_ended: 'The conference is now live!',

    /* Sections */
    section_about:     'About the Conference',
    section_venue:     'Venue & Accommodation',
    section_programme: 'Conference Programme',
    section_speakers:  'Expert Speakers',
    section_downloads: 'Downloads',
    section_gallery:   'Gallery',
    section_sponsors:  'Strategic Partners & Supporters',
    section_faq:       'Frequently Asked Questions',
    section_contact:   'Contact Us',

    /* States */
    loading:           'Loading data…',
    error_load:        'Error loading data. Please refresh the page.',
    no_data:           'No data available.',
    coming_soon:       'Coming soon',

    /* Gallery */
    gallery_placeholder_title: 'Gallery Coming Soon',
    gallery_placeholder_desc:  'Conference photos will be uploaded during and after the event.',

    /* Venue */
    venue_directions:  'Get Directions',
    venue_distance:    'Distance from KL Sentral',
    venue_parking:     'Parking',
    venue_address:     'Address',

    /* Footer */
    footer_rights:     'All rights reserved.',
    footer_org:        'Pharmacy Enforcement Division, Ministry of Health Malaysia',
    footer_links:      'Quick Links',
    footer_contact:    'Contact',
    footer_dev:        'This website was developed for official conference use.',

    /* RISE */
    rise_intro_title:  'RISE Overview',
    rise_cat_title:    'Participation Categories',
    rise_gallery_title:'Accepted Entries',
    rise_dl_title:     'RISE Downloads',
    rise_vote_title:   'Innovation Choice Award Voting',
    rise_vote_stub:    'The voting system will be activated during the conference. Please return on the relevant date.',
    rise_back:         '← Back to Main Site',

    /* Awards */
    awards_title:      'Awards & Recognition',

    /* Contact */
    contact_email:     'Email',
    contact_phone:     'Phone',
    contact_role:      'Position',

    /* Misc */
    read_more:         'Read More',
    download:          'Download',
    view:              'View',
    close:             'Close',
    back_to_top:       'Back to top',
    get_directions:    'Get Directions',
    lang_switch:       'BM',
  }),
});


/* ============================================================
   PROGRAMME TYPE → BADGE CONFIG
   Maps programme row `type` values to display labels + CSS classes.
   ============================================================ */
export const PROGRAMME_TYPES = Object.freeze({
  registration: { label_ms: 'Pendaftaran',   label_en: 'Registration',  css: '' },
  ceremony:     { label_ms: 'Majlis',         label_en: 'Ceremony',      css: 'type-badge--ceremony' },
  talk:         { label_ms: 'Ceramah',        label_en: 'Talk',          css: 'type-badge--talk' },
  break:        { label_ms: 'Rehat',          label_en: 'Break',         css: 'type-badge--break' },
  dinner:       { label_ms: 'Jamuan',         label_en: 'Dinner',        css: 'type-badge--dinner' },
  award:        { label_ms: 'Anugerah',       label_en: 'Award',         css: 'type-badge--award' },
  poster:       { label_ms: 'Lawatan Poster', label_en: 'Poster Visit',  css: 'type-badge--talk' },
  workshop:     { label_ms: 'Bengkel',        label_en: 'Workshop',      css: 'type-badge--talk' },
});


/* ============================================================
   DOWNLOAD FILE TYPES → ICON MAP
   Maps file extension strings to Heroicon (Outline) names.
   Names are resolved to inline SVG by hicon() in ui.js.
   ============================================================ */
export const FILE_ICONS = Object.freeze({
  pdf:  'document-text',
  doc:  'document-text',
  docx: 'document-text',
  xls:  'document-text',
  xlsx: 'document-text',
  ppt:  'document-text',
  pptx: 'document-text',
  zip:  'document-text',
  img:  'photo',
  default: 'document-text',
});


/* ============================================================
   UTILITY — get current language
   ============================================================ */

/**
 * Returns the currently active language code ('ms' or 'en').
 * Reads from <html data-active-lang> attribute (set by lang.js).
 * Falls back to 'ms' (Bahasa Malaysia default).
 * @returns {'ms'|'en'}
 */
export function getLang() {
  return document.documentElement.dataset.activeLang === 'en' ? 'en' : 'ms';
}

/**
 * Returns the localised string for a given key in the current language.
 * @param {string} key — key from LANG object
 * @returns {string}
 */
export function t(key) {
  const lang = getLang();
  return LANG[lang][key] ?? LANG.ms[key] ?? key;
}

/**
 * Returns the localised value from an object that has _ms and _en keys.
 * Example: localise(speaker, 'name') → speaker.name_ms or speaker.name_en
 * @param {Object} obj
 * @param {string} field — field name without _ms/_en suffix
 * @returns {string}
 */
export function localise(obj, field) {
  const lang = getLang();
  return obj[`${field}_${lang}`] ?? obj[`${field}_ms`] ?? '';
}
