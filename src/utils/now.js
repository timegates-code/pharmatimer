// src/utils/now.js
// Pure time-resolution helper. Shared between the UI hook (useNow), thunks
// (state/actions.js) and selectors (state/selectors.js).
//
// Domain modules (domain/recalc.js, domain/planBuilder.js) MUST NOT import
// this file: the domain stays ignorant of "now".
//
// Shape contract (AMB-6.F, PharmaTimer_Changelog_Fase2.md v2.5.3 §11):
//   {
//     date: Date,            // native Date, hours/minutes overridden when simulated
//     dateStr: 'YYYY-MM-DD', // always derived from referenceDate (local TZ)
//     hhmm: 'HH:MM',
//     minutes: 0..1439,
//     isSimulated: boolean
//   }

/**
 * Resolve the effective "now" respecting state.simulatedNow.
 *
 * Rules:
 * - When state.simulatedNow is a 'HH:MM' string, hhmm/minutes/date.getHours()/
 *   date.getMinutes() come from it. dateStr stays anchored to referenceDate:
 *   the simulator shifts HH:MM within the day, never the calendar day.
 * - When state.simulatedNow is null/undefined, every field comes from
 *   referenceDate (the real clock when called without args).
 *
 * The function is pure: it does not mutate referenceDate and does not read
 * any global clock apart from the default value of referenceDate.
 *
 * @param {{ simulatedNow: string|null } | null | undefined} state
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   date: Date,
 *   dateStr: string,
 *   hhmm: string,
 *   minutes: number,
 *   isSimulated: boolean,
 * }}
 */
export function resolveNow(state, referenceDate = new Date()) {
  const dateStr = toLocalDateStr(referenceDate);
  const simulated =
    state && typeof state.simulatedNow === 'string' && state.simulatedNow.length > 0
      ? state.simulatedNow
      : null;

  if (simulated) {
    const [h, m] = simulated.split(':').map(Number);
    const d = new Date(referenceDate);
    d.setHours(h, m, 0, 0);
    return {
      date: d,
      dateStr,
      hhmm: simulated,
      minutes: h * 60 + m,
      isSimulated: true,
    };
  }

  const h = referenceDate.getHours();
  const m = referenceDate.getMinutes();
  return {
    date: referenceDate,
    dateStr,
    hhmm: `${pad2(h)}:${pad2(m)}`,
    minutes: h * 60 + m,
    isSimulated: false,
  };
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

// Local-timezone YYYY-MM-DD (NOT ISO/UTC). Must align with plan.entry.dateStr,
// which is produced locally elsewhere in the codebase.
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
