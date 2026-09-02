/**
 * Time utilities — pure, no Date.now(), no globals.
 * Input contract: callers pass well-formed strings ('HH:MM', 'YYYY-MM-DD').
 * Malformed input is a bug upstream; no defensive validation here (Step 4a rule).
 */

/**
 * Convert 'HH:MM' to total minutes from 00:00.
 * @param {string} t 'HH:MM'
 * @returns {number}
 */
export function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes to 'HH:MM'. Wraps around 1440 (minutes % 1440).
 * Handles negative values.
 * @param {number} total
 * @returns {string}
 */
export function minutesToTime(total) {
  const m = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Add n days to 'YYYY-MM-DD'. Uses noon to avoid UTC shift across timezones.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {number} n integer, may be negative
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Compute delta in minutes between planned and actual DATETIME.
 * Positive = late, negative = early.
 * DATETIME-based: no ±720 wraparound (fixes v5 bug where 13h delay was read as 11h anticipation).
 *
 * @param {object} p
 * @param {string} p.dataPrevista  'YYYY-MM-DD'
 * @param {string} p.oraPrevista   'HH:MM'
 * @param {string} p.dataEffettiva 'YYYY-MM-DD'
 * @param {string} p.oraEffettiva  'HH:MM'
 * @returns {number} minutes (integer)
 */
export function calcolaDelta({ dataPrevista, oraPrevista, dataEffettiva, oraEffettiva }) {
  // REAL minutes: two instants subtracted. Both wall times pass through
  // wallToInstant, so a planned time that falls in the skipped hour is
  // read as the first existing instant (see the DST block below).
  const planned = wallToInstant(dataPrevista, oraPrevista);
  const actual = wallToInstant(dataEffettiva, oraEffettiva);
  return Math.round((actual.getTime() - planned.getTime()) / 60000);
}

/**
 * Format a signed minute delta for display.
 * 0 → "in orario"; else sign + abs value with min/h/h min formatting.
 * @param {number} min
 * @returns {string}
 */
export function formatDelta(min) {
  if (min === 0) return 'in orario';
  const sign = min > 0 ? '+' : '-';
  const abs = Math.abs(min);
  if (abs < 60) return `${sign}${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Format an unsigned duration for display.
 * @param {number} min non-negative minutes
 * @returns {string}
 */
export function formatDuration(min) {
  const abs = Math.abs(min);
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Format a gap value as 'ritardo ...' / 'anticipo ...' / null.
 * @param {number} min
 * @returns {string|null}
 */
export function formatGapLabel(min) {
  if (min === 0) return null;
  if (min > 0) return `ritardo ${formatDuration(min)}`;
  return `anticipo ${formatDuration(min)}`;
}

// `formatDateLabel` duplicate removed (par.198-bis P10 consolidation,
// N2/§6.205): canonical implementation lives in utils/uiState.js. This
// copy had zero consumers and zero test coverage (verified probe W1).

// ---------------------------------------------------------------------------
// Wall clock and instants -- the DST rule, a DECLARED HYBRID (decisione 1).
//
// The plan lives in WALL-CLOCK time: 'YYYY-MM-DD' plus 'HH:MM', no zone, in
// the zone the PWA really runs in (Europe/Rome, pinned by the suite in
// vitest.config.js). The guards on the interval between two doses measure
// REAL minutes. Between the two worlds there is ONE door, wallToInstant,
// which settles the two wall times a civil calendar leaves undefined:
//   - a NONEXISTENT time (spring forward, 02:00 -> 03:00): the dose slides
//     to the FIRST EXISTING instant, 03:00. Per ECMAScript the engine reads
//     a skipped time with the offset in force BEFORE the transition and
//     lands on 03:30 -- measured in Node, and it is not the rule.
//   - a DOUBLE time (fall back, 03:00 -> 02:00): the FIRST occurrence
//     counts. The engine already does this; here it is explicit, not
//     inherited from the engine.
//
// Consequences, declared here and pinned in time.dst.test.js:
//   - addMinutesToIso is WALL arithmetic (setMinutes re-reads the local
//     fields): 23:00 + 8h is 07:00 on both DST nights, that is 7 real hours
//     on the spring night and 9 on the autumn night. A real shortening is
//     caught by the server guard on the minimum interval, not here.
//   - calcolaDelta is REAL minutes: the two instants are subtracted.
//   - a tap recorded inside the double hour is read as its FIRST
//     occurrence; a tap that really happened in the second one reads one
//     hour early. Accepted by the hybrid: the wall label carries no fold.
//
// Every file whose name ends in .dst.test.js MUST go red under a zone with
// no DST: `make controllo-dst` runs them under TZ=Etc/UTC and demands it.
// ---------------------------------------------------------------------------

const MS_PER_MINUTE = 60_000;

/** 'YYYY-MM-DD' of a Date, local components. */
function localDateStr(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Minutes from local midnight of a Date. */
function localWallMinutes(d) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Resolve a wall-clock time on a calendar day to an instant.
 *
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} hhmm    'HH:MM'
 * @returns {Date} the instant; for a skipped time the first existing one,
 *   for a double time the first occurrence
 */
export function wallToInstant(dateStr, hhmm) {
  const wanted = timeToMinutes(hhmm);
  const read = new Date(`${dateStr}T${hhmm}:00`);
  const midnight = new Date(`${dateStr}T00:00:00`);
  const offsetAtMidnight = midnight.getTimezoneOffset();

  if (localDateStr(read) === dateStr && localWallMinutes(read) === wanted) {
    // The wall time exists. If the engine read it with an offset that is not
    // the one in force at midnight, it may be the SECOND occurrence of a
    // double hour: the first one lies exactly the offset difference earlier
    // and shows the same wall clock. Any other time after a transition fails
    // the wall check on `earlier` and is kept as read.
    const offsetRead = read.getTimezoneOffset();
    if (offsetRead !== offsetAtMidnight) {
      const earlier = new Date(
        read.getTime() - (offsetRead - offsetAtMidnight) * MS_PER_MINUTE
      );
      if (
        localDateStr(earlier) === dateStr &&
        localWallMinutes(earlier) === wanted
      ) {
        return earlier;
      }
    }
    return read;
  }

  // The wall time does not exist on this day: the first existing instant is
  // the transition itself, found by bisection on the offset change between
  // midnight (old offset) and the instant the engine produced (new offset).
  // Minute granularity: transitions fall on whole minutes. If no offset
  // change is visible on the day, the engine reading is kept -- declared,
  // and unreachable in Europe/Rome, where every transition is inside the day.
  if (read.getTimezoneOffset() === offsetAtMidnight) return read;
  let lo = Math.floor(midnight.getTime() / MS_PER_MINUTE);
  let hi = Math.floor(read.getTime() / MS_PER_MINUTE);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (new Date(mid * MS_PER_MINUTE).getTimezoneOffset() === offsetAtMidnight) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return new Date(hi * MS_PER_MINUTE);
}

/**
 * The wall-clock label of wallToInstant: 'HH:MM' unchanged when the time
 * exists on that day, the first existing time when it was skipped.
 *
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} hhmm    'HH:MM'
 * @returns {string} 'HH:MM'
 */
export function normalizeWallTime(dateStr, hhmm) {
  return minutesToTime(localWallMinutes(wallToInstant(dateStr, hhmm)));
}

// ---------------------------------------------------------------------------
// ISO datetime helpers -- Sessione 9-A (par.6.115a, AMB-9.A/D, fix par.6.18
// cross-midnight). Used for `ora_ricalcolata`, which holds 'YYYY-MM-DDTHH:MM'
// instead of 'HH:MM'. `ora_prevista` remains HH:MM (never crosses midnight by
// construction, AMB-9.D). Both parse through wallToInstant.
// ---------------------------------------------------------------------------

/**
 * Compose ISO datetime string from date and HH:MM. No timezone info — local datetime.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} hhmm    'HH:MM'
 * @returns {string} 'YYYY-MM-DDTHH:MM'
 */
export function composeIsoDateTime(dateStr, hhmm) {
  return `${dateStr}T${hhmm}`;
}

/**
 * Add minutes to an ISO datetime string with carry-over via Date arithmetic.
 * Handles cross-midnight, month-rollover, year-rollover automatically.
 *
 * WALL arithmetic, by the declared hybrid (block above): setMinutes re-reads
 * the local fields, so across a DST transition the result keeps the wall
 * distance and not the real one. A seconds part on the input is ignored:
 * the string is recomposed field by field.
 *
 * @param {string} iso     'YYYY-MM-DDTHH:MM'
 * @param {number} minutes integer, may be negative
 * @returns {string} 'YYYY-MM-DDTHH:MM'
 */
export function addMinutesToIso(iso, minutes) {
  const d = wallToInstant(iso.slice(0, 10), iso.slice(11, 16));
  d.setMinutes(d.getMinutes() + minutes);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * Parse an ISO datetime string into its parts.
 *
 * @param {string} iso 'YYYY-MM-DDTHH:MM'
 * @returns {{ dateStr: string, hhmm: string, dateObj: Date }}
 */
export function parseIsoDateTime(iso) {
  const dateStr = iso.slice(0, 10);
  const hhmm = iso.slice(11, 16);
  return { dateStr, hhmm, dateObj: wallToInstant(dateStr, hhmm) };
}
