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
