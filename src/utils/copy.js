// Wave B notification copy helpers.
// Drift voluto §6.124 vs DoseCard.getPastoText: body stripped del prefisso
// "Assumere " — copy nuda suona meglio come Notification.body. Il caller
// (services/notifications.js showDoseNotification, CP2) gestisce il fallback
// "Promemoria farmaco" quando il helper ritorna null.

/**
 * Build stripped body copy for a Notification body field.
 *
 * Logica:
 *  - relazione_pasto === 'indifferente' → null (early-return, dettaglio ignorato).
 *    Caller deve usare fallback "Promemoria farmaco".
 *  - dettaglio_pasto truthy (per le 5 enum non-indifferente) → passthrough.
 *  - dettaglio_pasto falsy → fallback mapping stripped (5 enum non-indifferente).
 *  - relazione_pasto sconosciuto o farmaco vuoto → null (defensive).
 *
 * @param {object} farmaco con campi {relazione_pasto, dettaglio_pasto}
 * @returns {string|null}
 */
export function formatRelazionePastoCopy(farmaco) {
  const f = farmaco || {};
  // §6.124 + Q-CP1.1=A: indifferente → null sempre (replica semantica
  // getPastoText early-return: dettaglio ignorato per coerenza UX).
  if (f.relazione_pasto === 'indifferente') return null;
  // Passthrough del dettaglio per le altre 5 enum.
  if (f.dettaglio_pasto) return f.dettaglio_pasto;
  // Fallback mapping stripped del prefisso "Assumere " (drift §6.124).
  const map = {
    prima: 'prima dei pasti',
    durante: 'durante i pasti',
    dopo: 'dopo i pasti',
    stomaco_pieno: 'a stomaco pieno',
    lontano: 'lontano dai pasti',
  };
  // Q-CP1.2=C: enum sconosciuto / farmaco vuoto → null (defensive).
  return map[f.relazione_pasto] || null;
}

// =============================================================
// CP5 v3.0.0 Step 1 — Toast Mit-C copy helper (Q-UX.5, §22.41).
// =============================================================
//
// Format the "prima dose" message shown in Toast Mit-C after a user
// manually adds a farmaco via FarmaciTab. Three branches per Q-UX.5
// override punto 8:
//
//   today    → "oggi, lunedì 4 maggio, alle 13:00"
//   tomorrow → "domani, martedì 5 maggio, alle 07:30"
//   future   → "martedì 12 maggio alle 07:30"
//
// Locale 'it-IT'. Mese e giorno settimana minuscoli. Anno omesso di
// default, aggiunto solo se data.year !== today.year.
//
// Pure helper — caller (FarmaciTab.commitSave) compone il prefisso
// "✅ [Nome] aggiunto. Prima dose: " e passa la coda formattata.

const MESI_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const GIORNI_IT = [
  'domenica', 'lunedì', 'martedì', 'mercoledì',
  'giovedì', 'venerdì', 'sabato',
];

/**
 * Parse 'YYYY-MM-DD' to a Date anchored at noon local TZ. Noon anchor
 * matches addDaysLocal in planBuilder.js: avoids DST edge cases when
 * computing day labels.
 */
function parseIsoDateLocal(dateStr) {
  return new Date(dateStr + 'T12:00:00');
}

/**
 * 'YYYY-MM-DD' string for `now` (local TZ). Helper for callers that
 * want to derive `today` once and pass it in (deterministic in tests).
 */
export function todayDateStr(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format the Toast Mit-C "prima dose" message body.
 *
 * @param {string} dataInizioISO  'YYYY-MM-DD' — farmaco.data_inizio.
 * @param {string} hhmm           'HH:MM' — ora prevista della prima dose.
 * @param {string} todayISO       'YYYY-MM-DD' — riferimento "oggi" (test-injectable).
 * @returns {string} Frase senza prefisso "✅ [Nome] aggiunto. Prima dose: ".
 *                   Caller compone il prefisso.
 */
export function formatPrimaDose(dataInizioISO, hhmm, todayISO) {
  // Defensive: ritorna stringa vuota su input null/invalid (caller
  // sceglie se mostrare il toast o no — ma normalizzazione FarmaciTab
  // garantisce data_inizio sempre presente).
  if (!dataInizioISO || !hhmm || !todayISO) return '';

  const data = parseIsoDateLocal(dataInizioISO);
  const today = parseIsoDateLocal(todayISO);

  // Diff in giorni interi (entrambi anchored a mezzogiorno → diff esatto).
  const diffDays = Math.round((data - today) / 86400000);

  const dayName = GIORNI_IT[data.getDay()];
  const dayNum = data.getDate();
  const monthName = MESI_IT[data.getMonth()];
  const year = data.getFullYear();
  const todayYear = today.getFullYear();
  const yearSuffix = year !== todayYear ? ` ${year}` : '';

  if (diffDays === 0) {
    // today: "oggi, lunedì 4 maggio, alle 13:00"
    return `oggi, ${dayName} ${dayNum} ${monthName}${yearSuffix}, alle ${hhmm}`;
  }
  if (diffDays === 1) {
    // tomorrow: "domani, martedì 5 maggio, alle 07:30"
    return `domani, ${dayName} ${dayNum} ${monthName}${yearSuffix}, alle ${hhmm}`;
  }
  // future (>1) or past (<0): "martedì 12 maggio alle 07:30"
  // Override punto 8 §22.41: niente virgola tra data e "alle" nel ramo
  // future (più scorrevole per date non-adiacenti).
  return `${dayName} ${dayNum} ${monthName}${yearSuffix} alle ${hhmm}`;
}
