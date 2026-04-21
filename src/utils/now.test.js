// src/utils/now.test.js
// AMB-6.H: +1 test, target 120/120. 1 it() covering the 3 scenarios from §11:
//   (A) simulatedNow=null → hhmm from referenceDate
//   (B) simulatedNow='14:30' → hhmm overrides, date hours/minutes coherent
//   (C) simulatedNow active with referenceDate in a different hour → dateStr
//       stays anchored to referenceDate (calendar day not shifted).

import { describe, it, expect } from 'vitest';
import { resolveNow } from './now.js';

describe('resolveNow', () => {
  it('handles null, active simulatedNow, and keeps dateStr anchored to referenceDate', () => {
    // (A) real clock: simulatedNow null
    const real = resolveNow({ simulatedNow: null }, new Date(2026, 3, 18, 10, 5, 0));
    expect(real).toMatchObject({ isSimulated: false, hhmm: '10:05', dateStr: '2026-04-18' });

    // (B) simulated: hhmm overrides and date is shifted to 14:30 on same day
    const ref = new Date(2026, 3, 18, 10, 0, 0);
    const sim = resolveNow({ simulatedNow: '14:30' }, ref);
    expect(sim.isSimulated).toBe(true);
    expect(sim.hhmm).toBe('14:30');
    expect(sim.date.getHours() * 60 + sim.date.getMinutes()).toBe(14 * 60 + 30);

    // (C) dateStr stays anchored to referenceDate — simulator does not shift the calendar
    expect(sim.dateStr).toBe('2026-04-18');
  });
});
