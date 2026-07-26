// Domain constants (from mockup v5 + spec).
export const TOLLERANZA_MIN = 15;
export const SOGLIA_PROMPT_RECUPERO = 30;

// Plan window — ieri + oggi + domani. AMB-5b2.D.
// Yesterday is kept in the plan so cross-midnight UNDO can still
// target a dose taken just before midnight. Tomorrow is kept as
// a single-day lookahead for next-dose preview.
export const PLAN_DAYS_BEFORE = 1;
export const PLAN_DAYS_AFTER = 1;
export const PLAN_TOTAL_DAYS = PLAN_DAYS_BEFORE + 1 + PLAN_DAYS_AFTER;

// Init fetches all farmaci (active + inactive) so the Config view
// can display inactive ones. Plan builder itself filters internally.
export const GET_FARMACI_SOLO_ATTIVI = true;

// Provider tick + rollover detect (AMB-6.G, Sessione 6)
export const TICK_INTERVAL_MS = 60_000;

// SENTINEL_QOCT_CONSTANTS
// CS-4.26 (Spec 14.2). Q-QSEPT-2=A / Q-QOCT-1=A: TWO distinct constants
// with the SAME value on purpose. They gate different things, and one
// constant serving two purposes hides where it bites.
//
// DRAIN_THROTTLE_MS -- minimum spacing between two TRIGGER-driven drain
// passes (Spec 14.2.4). It NEVER gates the write-path pass: Spec 14.2.5
// prescribes an immediate drain on a new write, and the two lines are
// compatible only this way.
//
// OUTBOX_ATTEMPT_GATE_MS -- minimum spacing between two attempts charged
// to the SAME queue element (Spec 14.3, internal-exception class). Without
// it, three rapid taps run three write-path passes in seconds, each
// charging one attempt to the same head element, which parks a real dose.
//
// Both values are CONVENTIONAL: the defensibility comes from the
// structure, not from the number.
export const DRAIN_THROTTLE_MS = 60_000;
export const OUTBOX_ATTEMPT_GATE_MS = 60_000;
