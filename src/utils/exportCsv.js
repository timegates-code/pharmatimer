// ============================================================
// exportCsv — pure helper: log entries -> CSV string + DOM-side download trigger.
//
// Sessione N+3 par.11.V, s.6.216 vista Export CSV minima.
//
// Scope §22.69 ratificato:
//   - Q-EXP.1=a: CSV only (no JSON, no PDF).
//   - Q-EXP.2=a: Blob + download attribute universal.
//   - Q-EXP.4=b: encoding `;` IT Excel-friendly + UTF-8 BOM (\uFEFF).
//   - Q-EXP.5=a: solo log_assunzioni (no farmaci snapshot, no import).
//
// Sub-Q-NEW.A=a (ratificata apertura par.11.V): 5 colonne mirror Q-LOG.2
//   (data, farmaco, ora_prevista, ora_effettiva, stato).
//
// In-CP1 sub-decisions (sotto scope s.6.216, no nuovo s.6.NN):
//   - Date format CSV = ISO YYYY-MM-DD raw (Excel IT auto-recognizes as date,
//     sortable, parse-friendly). UI display DD/MM/YY remains UI-only.
//   - Time format CSV = HH:MM raw (strip ISO datetime prefix if present,
//     mirror defensive formatOraDisplay CronologiaView, drift-doc-N16).
//   - null/undefined -> empty string in CSV (cleaner Excel import).
//   - Line ending = \r\n CRLF (RFC 4180 standard).
//   - Escape RFC 4180-style: field with `;` | `\r` | `\n` | `"` is quoted;
//     embedded `"` becomes `""`.
//   - STATO_LABELS inline duplicato CronologiaView (s.6.215.B carry-forward
//     drift-doc-N18, batch s.6.217 N+4 cleanup).
//
// CP2 split: pure helpers (entriesToCsv) + DOM-side trigger (triggerCsvDownload).
// Separation testable: T-EXP.1/2 covers pure encoding, T-EXP.3 covers DOM glue
// with mocked URL/anchor — no AppContext setup needed.
// ============================================================

const SEP = ";";
const EOL = "\r\n";
const BOM = "\uFEFF";

// Stato -> label IT (mirror CronologiaView, s.6.215.B drift-doc-N18).
const STATO_LABELS = {
  prevista: "Prevista",
  presa: "Presa",
  saltata: "Saltata",
  sospesa: "Sospesa",
  ricalcolata: "Ricalcolata",
};

// Strip ISO datetime prefix if present (HH:MM raw; defensive vs drift-doc-N16
// mix-format known limitation v3.1.0).
function extractHHMM(s) {
  if (s == null || s === "") return "";
  if (typeof s !== "string") return String(s);
  if (s.length > 5 && s.includes("T")) return s.slice(11, 16);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

// RFC 4180-style escape: quote field if contains SEP, CR, LF, or `"`.
function escapeField(value) {
  if (value == null) return "";
  const str = String(value);
  if (str === "") return "";
  const needsQuote =
    str.includes(SEP) ||
    str.includes("\r") ||
    str.includes("\n") ||
    str.includes('"');
  if (!needsQuote) return str;
  return '"' + str.replace(/"/g, '""') + '"';
}

/**
 * Default 5-column spec mirroring Q-LOG.2 (Sub-Q-NEW.A=a).
 * Each column: { key, label, format: (entry, ctx) => string }.
 * ctx = { farmacoNameById: Map<number, string> }
 */
export const DEFAULT_COLUMNS = [
  {
    key: "data",
    label: "Data",
    format: (entry) => entry.data ?? "",
  },
  {
    key: "farmaco",
    label: "Farmaco",
    format: (entry, ctx) =>
      ctx.farmacoNameById?.get(entry.farmaco_id) ?? `#${entry.farmaco_id}`,
  },
  {
    key: "ora_prevista",
    label: "Ora prevista",
    format: (entry) => extractHHMM(entry.ora_prevista),
  },
  {
    key: "ora_effettiva",
    label: "Ora effettiva",
    format: (entry) => extractHHMM(entry.ora_effettiva),
  },
  {
    key: "stato",
    label: "Stato",
    format: (entry) => STATO_LABELS[entry.stato] ?? entry.stato ?? "",
  },
];

/**
 * Pure helper: build CSV string from log entries.
 *
 * @param {Array} entries - log entries (filtered, sorted) from selectLogEntriesFiltered
 * @param {Array} [columns=DEFAULT_COLUMNS] - column spec
 * @param {Object} [ctx={}] - context for formatters; e.g. { farmacoNameById: Map }
 * @returns {string} CSV content with UTF-8 BOM, `;` separator, CRLF line ends.
 *                   Always includes header row (even when entries is empty,
 *                   Sub-Q-NEW.C=a behavior).
 */
export function entriesToCsv(entries, columns = DEFAULT_COLUMNS, ctx = {}) {
  const cols =
    Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS;
  const rows = Array.isArray(entries) ? entries : [];

  const headerLine = cols.map((c) => escapeField(c.label)).join(SEP);
  const dataLines = rows.map((entry) =>
    cols.map((c) => escapeField(c.format(entry, ctx))).join(SEP)
  );

  return BOM + [headerLine, ...dataLines].join(EOL) + EOL;
}

/**
 * Trigger a browser CSV download via Blob + temporary anchor click.
 *
 * Impure: requires DOM globals (document, URL.createObjectURL/revokeObjectURL).
 * Q-EXP.2=a universal Blob+download attribute mechanism.
 *
 * @param {string} filename - download filename (e.g. "pharmatimer-log-2026-05-17.csv")
 * @param {string} csv - CSV content (including BOM if needed)
 * @param {Object} [opts] - { type } MIME override (default "text/csv;charset=utf-8")
 */
export function triggerCsvDownload(filename, csv, opts = {}) {
  const type = opts.type ?? "text/csv;charset=utf-8";
  const blob = new Blob([csv], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
