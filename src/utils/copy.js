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
