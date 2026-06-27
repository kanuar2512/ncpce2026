/**
 * Code.gs — CMIP Google Apps Script JSON API
 *
 * Serves conference data from Google Sheets as a JSON REST API.
 * Deploy as: Extensions → Apps Script → Deploy → New deployment
 *   Type          : Web app
 *   Execute as    : Me (your Google account)
 *   Who has access: Anyone
 *
 * After deploying, copy the Web app URL into config.js → API.ENDPOINT
 *
 * API Usage:
 *   GET ?sheet=Programme              → all programme rows
 *   GET ?sheet=Programme&day=1        → day 1 only
 *   GET ?sheet=Speakers               → all speakers
 *   GET ?sheet=Rise                   → all RISE entries
 *   GET ?sheet=Rise&category=1        → category 1 only
 *   GET ?sheet=Downloads              → all download rows
 *   GET ?sheet=Downloads&section=rise → RISE section only
 *   GET ?sheet=Gallery                → gallery photos
 *   GET ?sheet=Faq                    → all FAQ rows
 *   GET ?sheet=Faq&section=rise       → RISE FAQ only
 *   GET ?sheet=Sponsors               → sponsors
 *   GET ?sheet=Contact                → committee contacts
 *   GET ?sheet=SiteConfig             → site-wide config
 *
 * Response envelope:
 *   { status: "ok",    data: [...] }
 *   { status: "error", message: "..." }
 *
 * Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026
 * Bahagian Penguatkuasaan Farmasi, KKM
 * CMIP v1.0
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */

/**
 * The ID of the Google Spreadsheet containing all conference data.
 * Find it in the Sheets URL: /spreadsheets/d/<SPREADSHEET_ID>/edit
 *
 * @type {string}
 */
var SPREADSHEET_ID = '1WDOulgi-1JfgQs7z4PV7FcNmJ64A_uNJOjjXOEj2Y9c';

/**
 * Cache duration in seconds.
 * 300 = 5 minutes. Maximum is 21600 (6 hours).
 * Set to 0 to disable caching (useful during content updates).
 *
 * @type {number}
 */
var CACHE_TTL = 300;

/**
 * Sheet names — must match tab names exactly in the Google Spreadsheet.
 * Change only if you rename the tabs.
 */
/** Tab names — must match exact tab names in Google Sheets */
var SHEETS = {
  SITE_CONFIG : 'SiteConfig',
  PROGRAMME   : 'Programme',
  SPEAKERS    : 'Speakers',
  RISE        : 'Rise',
  DOWNLOADS   : 'Downloads',
  GALLERY     : 'Gallery',
  FAQ         : 'Faq',
  SPONSORS    : 'Sponsors',
  CONTACT     : 'Contact',
};


/* ============================================================
   ENTRY POINT
   ============================================================ */

/**
 * HTTP GET handler — the main API entry point.
 * All requests arrive here; route by the `sheet` parameter.
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  try {
    var params   = e && e.parameter ? e.parameter : {};
    // Normalize to lowercase — frontend sends 'rise', 'faq', etc.
    var sheet    = (params.sheet    || '').trim().toLowerCase();
    var callback = (params.callback || '').trim();   // JSONP support

    if (!sheet) {
      return _respond({ status: 'error', message: 'Missing required parameter: sheet' }, callback);
    }

    var data;

    switch (sheet) {

      case 'config':
        data = getSiteConfig();
        break;

      case 'programme':
        data = getProgramme(params.day || null);
        break;

      case 'speakers':
        data = getSpeakers();
        break;

      case 'rise':
        data = getRise(params.category || null);
        break;

      case 'downloads':
        data = getDownloads(params.section || null);
        break;

      case 'gallery':
        data = getGallery();
        break;

      case 'faq':
        data = getFaq(params.section || null);
        break;

      case 'sponsors':
        data = getSponsors();
        break;

      case 'contact':
        data = getContact();
        break;

      default:
        return _respond({ status: 'error', message: 'Unknown sheet: ' + sheet }, callback);
    }

    return _respond({ status: 'ok', data: data }, callback);

  } catch (err) {
    return _respond({ status: 'error', message: err.message || String(err) }, '');
  }
}

/**
 * Return JSON or JSONP depending on whether a callback name is provided.
 * JSONP bypasses CORS — safe for public read-only data.
 * @param {Object} payload
 * @param {string} callback — JSONP callback function name (empty = plain JSON)
 */
function _respond(payload, callback) {
  var body = JSON.stringify(payload);
  if (callback && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)) {
    // JSONP — wrap in callback()
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  // Plain JSON
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================================================
   SHEET READERS
   ============================================================ */

/**
 * Read SiteConfig sheet.
 * Expected columns: key | value_ms | value_en
 *
 * @returns {Object[]}
 */
function getSiteConfig() {
  return _readSheet(SHEETS.SITE_CONFIG);
}

/**
 * Read Programme sheet, optionally filtered by day.
 * Expected columns:
 *   day | date | time_start | time_end | title_ms | title_en |
 *   speaker | venue | type | notes_ms | notes_en
 *
 * @param {string|null} day  - "1", "2", "3" or null for all
 * @returns {Object[]}
 */
function getProgramme(day) {
  var rows = _readSheet(SHEETS.PROGRAMME);
  if (!day) return rows;
  return rows.filter(function(r) {
    return String(r.day) === String(day);
  });
}

/**
 * Read Speakers sheet.
 * Expected columns:
 *   name_ms | name_en | role_ms | role_en | bio_ms | bio_en |
 *   organisation_ms | organisation_en | photo_url | session | order
 *
 * @returns {Object[]}
 */
function getSpeakers() {
  var rows = _readSheet(SHEETS.SPEAKERS);
  return rows.sort(function(a, b) {
    return (Number(a.order) || 99) - (Number(b.order) || 99);
  });
}

/**
 * Read Rise sheet, optionally filtered by category number.
 * Expected columns:
 *   category | title | author | branch | abstract_url | poster_url | order
 *
 *   category     : 1 = Pertandingan Poster R&D
 *                  2 = Kolokium Poster R&D
 *                  3 = Pertandingan QIP
 *   title        : Presentation title
 *   author       : Presenter name
 *   branch       : State / Branch
 *   abstract_url : Google Drive PDF link for abstract
 *   poster_url   : Google Drive image/PDF link for poster
 *   order        : Display order (ascending)
 *
 * @param {string|null} category - "1", "2", "3" or null for all
 * @returns {Object[]}
 */
function getRise(category) {
  var rows = _readSheet(SHEETS.RISE);
  if (category) {
    rows = rows.filter(function(r) {
      return String(r.category) === String(category);
    });
  }
  return rows.sort(function(a, b) {
    return (Number(a.order) || 99) - (Number(b.order) || 99);
  });
}

/**
 * Read Downloads sheet, optionally filtered by section.
 * Expected columns:
 *   section | title_ms | title_en | description_ms | description_en |
 *   file_url | file_type | file_size | order | published
 *
 * section values: general | rise | programme | others
 *
 * @param {string|null} section
 * @returns {Object[]}
 */
function getDownloads(section) {
  var rows = _readSheet(SHEETS.DOWNLOADS)
    .filter(function(r) {
      return _truthy(r.published);
    });
  if (section) {
    rows = rows.filter(function(r) {
      return (r.section || '').toLowerCase() === section.toLowerCase();
    });
  }
  return rows.sort(function(a, b) {
    return (Number(a.order) || 99) - (Number(b.order) || 99);
  });
}

/**
 * Read Gallery sheet.
 * Expected columns:
 *   title_ms | title_en | photo_url | caption_ms | caption_en |
 *   taken_by | date_taken | order | published
 *
 * @returns {Object[]}
 */
function getGallery() {
  return _readSheet(SHEETS.GALLERY)
    .filter(function(r) {
      return _truthy(r.published);
    })
    .sort(function(a, b) {
      return (Number(a.order) || 99) - (Number(b.order) || 99);
    });
}

/**
 * Read Faq sheet, optionally filtered by section.
 * Expected columns:
 *   section | question_ms | question_en | answer_ms | answer_en | order
 *
 * section values: general | rise | programme | others
 *
 * @param {string|null} section
 * @returns {Object[]}
 */
function getFaq(section) {
  var rows = _readSheet(SHEETS.FAQ);
  if (section) {
    rows = rows.filter(function(r) {
      return (r.section || '').toLowerCase() === section.toLowerCase();
    });
  }
  return rows.sort(function(a, b) {
    return (Number(a.order) || 99) - (Number(b.order) || 99);
  });
}

/**
 * Read Sponsors sheet.
 * Expected columns:
 *   name | logo_url | website | tier | order | published
 *
 * tier values: platinum | gold | silver | bronze | supporter
 *
 * @returns {Object[]}
 */
function getSponsors() {
  return _readSheet(SHEETS.SPONSORS)
    .filter(function(r) {
      return _truthy(r.published);
    })
    .sort(function(a, b) {
      var TIER_ORDER = {platinum:1, gold:2, silver:3, bronze:4, supporter:5};
      var ta = TIER_ORDER[(r.tier||'').toLowerCase()] || 9; // eslint-disable-line no-unused-vars
      // closure captures wrong 'r' — use params
      var tierA = TIER_ORDER[(a.tier||'').toLowerCase()] || 9;
      var tierB = TIER_ORDER[(b.tier||'').toLowerCase()] || 9;
      if (tierA !== tierB) return tierA - tierB;
      return (Number(a.order) || 99) - (Number(b.order) || 99);
    });
}

/**
 * Read Contact sheet.
 * Expected columns:
 *   name | role_ms | role_en | unit_ms | unit_en |
 *   email | phone | photo_url | order
 *
 * @returns {Object[]}
 */
function getContact() {
  return _readSheet(SHEETS.CONTACT)
    .sort(function(a, b) {
      return (Number(a.order) || 99) - (Number(b.order) || 99);
    });
}


/* ============================================================
   CORE — SHEET READER WITH CACHE
   ============================================================ */

/**
 * Read a sheet and return an array of objects keyed by the header row.
 * Results are cached in Apps Script's CacheService for CACHE_TTL seconds.
 * Empty rows and rows without a first-column value are skipped.
 *
 * @param {string} sheetName
 * @returns {Object[]}
 */
function _readSheet(sheetName) {
  var cacheKey = 'cmip_sheet_' + sheetName;

  // Try cache first
  if (CACHE_TTL > 0) {
    try {
      var cache  = CacheService.getScriptCache();
      var cached = cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {
      // Cache read failed — fall through to live read
    }
  }

  // Live read from Spreadsheet
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return [];  // Empty sheet
  }

  var values  = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function(h) {
    return String(h).trim().toLowerCase().replace(/\s+/g, '_');
  });

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    // Skip blank rows (first cell empty)
    if (!row[0] && !row[1]) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;  // Skip columns with no header
      var cell = row[j];

      // Normalise types
      if (cell instanceof Date) {
        obj[headers[j]] = Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
      } else {
        obj[headers[j]] = String(cell === null || cell === undefined ? '' : cell).trim();
      }
    }
    rows.push(obj);
  }

  // Write to cache
  if (CACHE_TTL > 0) {
    try {
      var serialised = JSON.stringify(rows);
      if (serialised.length < 100000) {  // CacheService limit ~100KB per entry
        CacheService.getScriptCache().put(cacheKey, serialised, CACHE_TTL);
      }
    } catch (_) {
      // Cache write failed — non-fatal
    }
  }

  return rows;
}


/* ============================================================
   CACHE MANAGEMENT — call these from the script editor
   ============================================================ */

/**
 * Clear the entire script cache.
 * Run this from the Apps Script editor after updating sheet content.
 */
function clearAllCache() {
  var cache = CacheService.getScriptCache();
  var keys  = Object.values(SHEETS).map(function(name) {
    return 'cmip_sheet_' + name;
  });
  cache.removeAll(keys);
  Logger.log('Cache cleared for: ' + keys.join(', '));
}

/**
 * Clear cache for a specific sheet.
 * @param {string} sheetName
 */
function clearSheetCache(sheetName) {
  CacheService.getScriptCache().remove('cmip_sheet_' + sheetName);
  Logger.log('Cache cleared for: cmip_sheet_' + sheetName);
}


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

/**
 * Return a successful JSON response.
 * @param {Object[]} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function _ok(data) {
  return _json({ status: 'ok', data: data });
}

/**
 * Return an error JSON response.
 * @param {string} message
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function _error(message) {
  return _json({ status: 'error', message: message });
}

/**
 * Serialise payload to JSON with CORS headers.
 * @param {Object} payload
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function _json(payload) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Handle CORS preflight OPTIONS request.
 * Some browsers send OPTIONS before GET — Apps Script ignores it,
 * but including doPost as a passthrough avoids silent failures.
 */
function doPost(e) {
  return _json({ status: 'ok', data: [] });
}

/**
 * Coerce a cell value to boolean.
 * Treats "TRUE", "1", "yes", "published" (case-insensitive) as true.
 * @param {string} val
 * @returns {boolean}
 */
function _truthy(val) {
  if (!val) return false;
  var s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'published';
}


/* ============================================================
   SPREADSHEET SETUP HELPER
   ============================================================ */

/**
 * createSheetStructure()
 *
 * Run this ONCE from the Apps Script editor to create all required
 * sheets with the correct header rows.
 *
 * WARNING: this will not overwrite existing sheets — it skips sheets
 * that already exist. Safe to re-run.
 *
 * How to run:
 *   1. Open Apps Script editor (Extensions → Apps Script)
 *   2. Select createSheetStructure from the function dropdown
 *   3. Click ▶ Run
 *   4. Check the Spreadsheet — new tabs should appear
 */
function createSheetStructure() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  var structure = {
    SiteConfig: [
      ['key', 'value_ms', 'value_en'],
      ['conference_title', 'Persidangan Kebangsaan Penguatkuasaan Jenayah Farmaseutikal 2026', 'National Conference on Pharmaceutical Crime Enforcement 2026'],
      ['conference_short', 'PKPJF 2026', 'PKPJF 2026'],
      ['conference_date', '27–29 Julai 2026', '27–29 July 2026'],
      ['conference_venue', 'KSL Esplanade Hotel, Klang, Selangor', 'KSL Esplanade Hotel, Klang, Selangor'],
      ['conference_theme_ms', 'Bersatu Dalam Tindakan, Teguh Dalam Penguatkuasaan', ''],
      ['conference_theme_en', '', 'United in Action, Steadfast in Enforcement'],
      ['organiser_ms', 'Bahagian Penguatkuasaan Farmasi, Kementerian Kesihatan Malaysia', ''],
      ['organiser_en', '', 'Pharmaceutical Enforcement Division, Ministry of Health Malaysia'],
      ['about_ms', 'Persidangan ini merupakan platform utama untuk pegawai BPF berkongsi pengetahuan, pengalaman dan inovasi dalam bidang penguatkuasaan jenayah farmaseutikal.', ''],
      ['about_en', '', 'This conference is the premier platform for BPF officers to share knowledge, experience and innovation in the field of pharmaceutical crime enforcement.'],
    ],

    Programme: [
      ['day', 'date', 'time_start', 'time_end', 'title_ms', 'title_en', 'speaker', 'venue', 'type', 'notes_ms', 'notes_en'],
      ['1', '2026-07-27', '08:00', '09:00', 'Pendaftaran Peserta', 'Participant Registration', '', 'Lobi Utama', 'admin', '', ''],
      ['1', '2026-07-27', '09:00', '10:00', 'Majlis Perasmian', 'Opening Ceremony', '', 'Dewan Pleno', 'ceremony', '', ''],
      ['1', '2026-07-27', '10:00', '10:30', 'Rehat & Minum Pagi', 'Morning Break', '', '', 'break', '', ''],
      ['1', '2026-07-27', '10:30', '12:30', 'Sesi Pleno 1', 'Plenary Session 1', 'TBC', 'Dewan Pleno', 'plenary', '', ''],
      ['1', '2026-07-27', '12:30', '14:00', 'Rehat Tengah Hari & Solat', 'Lunch & Prayer Break', '', '', 'break', '', ''],
      ['1', '2026-07-27', '14:00', '17:00', 'Sesi Selari 1', 'Parallel Session 1', 'TBC', 'Dewan A / B / C', 'parallel', '', ''],
      ['2', '2026-07-28', '08:30', '10:00', 'Sesi Pleno 2', 'Plenary Session 2', 'TBC', 'Dewan Pleno', 'plenary', '', ''],
      ['2', '2026-07-28', '10:00', '10:30', 'Rehat & Pameran RISE', 'Break & RISE Exhibition', '', 'Lobi Dewan', 'break', '', ''],
      ['2', '2026-07-28', '10:30', '12:30', 'Simposium RISE', 'RISE Symposium', 'Panel Juri', 'Lobi Dewan & Dewan B', 'rise', '', ''],
      ['2', '2026-07-28', '12:30', '14:00', 'Rehat Tengah Hari & Solat', 'Lunch & Prayer Break', '', '', 'break', '', ''],
      ['2', '2026-07-28', '14:00', '17:00', 'Sesi Selari 2', 'Parallel Session 2', 'TBC', 'Dewan A / B / C', 'parallel', '', ''],
      ['2', '2026-07-28', '19:30', '23:00', 'Malam Gala & Majlis Anugerah', 'Gala Night & Award Ceremony', '', 'Grand Ballroom', 'award', '', ''],
      ['3', '2026-07-29', '08:30', '10:30', 'Sesi Pleno 3', 'Plenary Session 3', 'TBC', 'Dewan Pleno', 'plenary', '', ''],
      ['3', '2026-07-29', '10:30', '11:00', 'Rehat', 'Break', '', '', 'break', '', ''],
      ['3', '2026-07-29', '11:00', '12:30', 'Forum Penutup', 'Closing Forum', 'TBC', 'Dewan Pleno', 'forum', '', ''],
      ['3', '2026-07-29', '12:30', '14:00', 'Majlis Penutup & Makan Tengah Hari', 'Closing Ceremony & Lunch', '', 'Dewan Pleno', 'ceremony', '', ''],
    ],

    Speakers: [
      ['name_ms', 'name_en', 'role_ms', 'role_en', 'bio_ms', 'bio_en', 'organisation_ms', 'organisation_en', 'photo_url', 'session', 'order'],
      ['TBC', 'TBC', 'Pembentang Jemputan', 'Invited Speaker', '', '', 'TBC', 'TBC', '', 'Pleno 1', '1'],
    ],

    Rise: [
      ['category', 'title', 'author', 'branch', 'abstract_url', 'poster_url', 'order'],
      // category     : 1=Pertandingan Poster R&D, 2=Kolokium Poster R&D, 3=Pertandingan QIP
      // abstract_url : Google Drive PDF link for abstract
      // poster_url   : Google Drive image/PDF link for poster
    ],

    Downloads: [
      ['section', 'title_ms', 'title_en', 'description_ms', 'description_en', 'file_url', 'file_type', 'file_size', 'order', 'published'],
      ['general', 'Buku Program Persidangan', 'Conference Programme Book', 'Buku program lengkap PKPJF 2026', 'Complete PKPJF 2026 programme book', '', 'pdf', '', '1', 'TRUE'],
      ['general', 'Kertas Kerja Pembentang', 'Speaker Papers', 'Koleksi kertas kerja sesi pleno', 'Collection of plenary session papers', '', 'pdf', '', '2', 'FALSE'],
      ['rise', 'Garis Panduan Penyertaan RISE', 'RISE Participation Guidelines', 'Panduan lengkap penyertaan RISE 2026', 'Complete RISE 2026 participation guidelines', '', 'pdf', '', '1', 'TRUE'],
      ['rise', 'Template Poster A0', 'A0 Poster Template', 'Template poster A0 format PKPJF 2026', 'PKPJF 2026 A0 poster format template', '', 'pptx', '', '2', 'TRUE'],
      ['rise', 'Borang Penyertaan RISE', 'RISE Entry Form', 'Borang pendaftaran penyertaan RISE', 'RISE participation registration form', '', 'docx', '', '3', 'TRUE'],
    ],

    Gallery: [
      ['title_ms', 'title_en', 'photo_url', 'caption_ms', 'caption_en', 'taken_by', 'date_taken', 'order', 'published'],
      // Photos will be added after the conference
    ],

    Faq: [
      ['section', 'question_ms', 'question_en', 'answer_ms', 'answer_en', 'order'],
      ['general', 'Siapakah yang boleh menyertai persidangan ini?', 'Who can attend this conference?', 'Persidangan ini terbuka kepada semua pegawai BPF di seluruh Malaysia serta jemputan khas dari agensi berkaitan.', 'This conference is open to all BPF officers throughout Malaysia as well as special invitees from related agencies.', '1'],
      ['general', 'Adakah kemudahan penginapan disediakan?', 'Is accommodation provided?', 'Peserta bertanggungjawab menguruskan penginapan sendiri. KSL Esplanade Hotel menawarkan kadar khas untuk peserta persidangan. Sila hubungi panitia untuk maklumat lanjut.', 'Participants are responsible for arranging their own accommodation. KSL Esplanade Hotel offers special rates for conference participants. Please contact the committee for more information.', '2'],
      ['general', 'Apakah dress code persidangan?', 'What is the conference dress code?', 'Busana rasmi (formal attire) untuk semua sesi persidangan. Busana kurung / batik dialu-alukan.', 'Formal attire for all conference sessions. Baju kurung / batik is welcome.', '3'],
      ['general', 'Apakah bahasa yang digunakan semasa persidangan?', 'What language is used during the conference?', 'Bahasa Malaysia ialah bahasa utama persidangan. Sesetengah sesi mungkin disampaikan dalam Bahasa Inggeris.', 'Bahasa Malaysia is the main conference language. Some sessions may be delivered in English.', '4'],
      ['rise', 'Siapakah yang layak menyertai RISE Symposium?', 'Who is eligible to participate in RISE Symposium?', 'Semua pegawai BPF dari semua peringkat dan cawangan layak menyertai RISE Symposium.', 'All BPF officers from all levels and branches are eligible to participate in the RISE Symposium.', '1'],
      ['rise', 'Berapa banyak penyertaan yang dibenarkan bagi setiap cawangan?', 'How many entries are allowed per branch?', 'Tiada had penyertaan. Setiap cawangan digalakkan menghantar wakil bagi setiap kategori.', 'There is no limit on entries. Each branch is encouraged to send representatives for each category.', '2'],
      ['rise', 'Apakah saiz poster yang ditetapkan?', 'What is the required poster size?', 'Semua poster mestilah dicetak dalam saiz A0 (841mm × 1189mm) orientasi potret. Fail digital perlu dihantar sebelum tarikh yang ditetapkan.', 'All posters must be printed in A0 size (841mm × 1189mm) portrait orientation. Digital files must be submitted before the specified deadline.', '3'],
      ['rise', 'Bagaimana cara mengundi untuk Anugerah Pilihan Inovasi?', 'How do I vote for the Innovation Choice Award?', 'Sistem undi akan dibuka semasa persidangan berlangsung. Pautan khas akan dikongsi kepada semua peserta. Setiap peserta dibenarkan membuat satu undi sahaja.', 'The voting system will be opened during the conference. A dedicated link will be shared with all participants. Each participant is allowed one vote only.', '4'],
    ],

    Sponsors: [
      ['name', 'logo_url', 'website', 'tier', 'order', 'published'],
      // Add sponsors here
    ],

    Contact: [
      ['name', 'role_ms', 'role_en', 'unit_ms', 'unit_en', 'email', 'phone', 'photo_url', 'order'],
      ['TBC', 'Pengerusi Jawatankuasa', 'Committee Chairperson', 'Bahagian Penguatkuasaan Farmasi', 'Pharmaceutical Enforcement Division', 'bpf@moh.gov.my', '', '', '1'],
      ['TBC', 'Setiausaha', 'Secretary', 'Bahagian Penguatkuasaan Farmasi', 'Pharmaceutical Enforcement Division', 'bpf@moh.gov.my', '', '', '2'],
    ],
  };

  for (var sheetName in structure) {
    var existing = ss.getSheetByName(sheetName);
    if (existing) {
      Logger.log('SKIP (already exists): ' + sheetName);
      continue;
    }

    var newSheet = ss.insertSheet(sheetName);
    var data     = structure[sheetName];
    if (data.length > 0) {
      newSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      // Bold the header row
      newSheet.getRange(1, 1, 1, data[0].length).setFontWeight('bold');
      // Freeze header row
      newSheet.setFrozenRows(1);
    }

    Logger.log('CREATED: ' + sheetName);
  }

  Logger.log('createSheetStructure() complete.');
}


/* ============================================================
   HEALTH CHECK — call this to verify the API is working
   ============================================================ */

/**
 * testApi()
 *
 * Run from the Apps Script editor to test all sheet reads.
 * Output appears in View → Logs.
 */
function testApi() {
  var sheets = Object.values(SHEETS);
  for (var i = 0; i < sheets.length; i++) {
    try {
      var rows = _readSheet(sheets[i]);
      Logger.log('✅ ' + sheets[i] + ': ' + rows.length + ' rows');
    } catch (err) {
      Logger.log('❌ ' + sheets[i] + ': ' + err.message);
    }
  }
}
