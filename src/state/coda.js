// ============================================================
// Queue-counts collector -- the "raccolta" half of the third act of
// Spec 14.3 :1115 (Chiusura del giro). CS-5.5 parte 2.
// SENTINEL_QTIRANTE_CODA_MODULE
// ============================================================
//
// TWO SEATS, ONE HELPER (Q-RINTOCCO-3=A). The queue is mutated on two
// paths the state layer can observe: the trigger thunk (actions.js) and
// the write-path (applyHelper.js :165, the ONLY production caller of
// repo.upsertLogsBatch outside the data layer). Offline the write-path is
// the only one that runs a pass at all, so wiring the thunk alone would
// leave the parking lot mute for up to DRAIN_THROTTLE_MS plus one tick.
// One named helper keeps the two paths from diverging -- lezione 6.205.
//
// NOT SEATED INSIDE `_drainOutbox` (Q-RINTOCCO-1=A). A pass is ONE of the
// queue's mutators, not the queue's state. Today `outboxRetry` has zero
// production callers -- measured, four sites and all of them the
// definition or its own suite -- so a collector sitting inside a pass
// would be complete BY ACCIDENT. Spec 14.5.3 prescribes Riprova /
// Elimina: the day those are wired, `parked` changes outside any pass and
// an observer seated in the mutator goes blind in silence. Voce 220.
//
// FAILURE IS NOT ZERO (Q-TIRANTE-1=A). `outboxCounts` is async and its
// `_wrap` re-throws (LocalRepository :57-64), so a rejection is
// REACHABLE -- unlike `contaAvvisi`, which is synchronous and cannot
// throw. Degrading a failed read to {0,0} would paint an EMPTY parking
// lot while elements are parked: M2. On failure this helper dispatches
// NOTHING. The last known value stands -- stale, never false.
//
// NEVER THROWS, in any branch. The thunk is awaited inside the try of
// init(), and the write-path seat is past the line where an annotated
// touch may no longer be rolled back (applyHelper :90-96).

/**
 * Read the queue counts and mirror them into state. Always resolves.
 *
 * @param {{dispatch: (a: {type: string, payload?: any}) => void,
 *          repo: object}} deps
 * @returns {Promise<void>}
 */
export async function raccogliCoda({ dispatch, repo }) {
  let conteggi;
  try {
    conteggi = await repo.outboxCounts();
  } catch {
    return;
  }
  if (!conteggi || typeof conteggi !== 'object') return;
  const { pending, parked } = conteggi;
  // A non-integer is not a queue state. NaN or a string reaching the
  // indicator would render AS a count and lie with the authority of a
  // number, so it is refused at the door instead of being coerced.
  if (!Number.isInteger(pending) || !Number.isInteger(parked)) return;
  if (pending < 0 || parked < 0) return;
  dispatch({ type: 'SET_CODA', payload: { pending, parked } });
}
