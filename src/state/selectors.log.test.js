import { describe, it, expect } from "vitest";
import { selectLogEntriesFiltered } from "./selectors.js";

// T-LOG.1: empty input + missing filters → []
// T-LOG.2: farmaco filter on multi-farmaco fixture → only matching, DESC sorted
// T-LOG.3: multi-day range filter + sort verification (data DESC primary,
//          ora_effettiva ?? ora_prevista DESC secondary, dose_numero DESC tertiary)
//
// Fixtures use HH:MM strings for ora_effettiva/ora_prevista (current
// production format per IRepository jsdoc + LocalRepository.test.js).
// Mix-format edge case (HH:MM vs ISO datetime) is known-limitation v3.1.0
// (registry drift-doc-N16), not exercised here.

describe("selectLogEntriesFiltered (s.6.215 / s.6.215.A)", () => {
  it("T-LOG.1: returns [] for empty array and for undefined filters", () => {
    expect(selectLogEntriesFiltered([], { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
    expect(selectLogEntriesFiltered([])).toEqual([]);
    expect(selectLogEntriesFiltered(null)).toEqual([]);
    expect(selectLogEntriesFiltered(undefined)).toEqual([]);
  });

  it("T-LOG.2: farmacoId filter returns only matching rows, DESC sorted", () => {
    const logs = [
      { id: 1, farmaco_id: 1, data: "2026-05-15", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:05", stato: "presa" },
      { id: 2, farmaco_id: 2, data: "2026-05-15", dose_numero: 1, ora_prevista: "09:00", ora_effettiva: "09:02", stato: "presa" },
      { id: 3, farmaco_id: 1, data: "2026-05-15", dose_numero: 2, ora_prevista: "20:00", ora_effettiva: "20:10", stato: "presa" },
      { id: 4, farmaco_id: 1, data: "2026-05-14", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:00", stato: "presa" },
    ];
    const out = selectLogEntriesFiltered(logs, { farmacoId: 1 });
    expect(out.map((r) => r.id)).toEqual([3, 1, 4]);
    expect(out.every((r) => r.farmaco_id === 1)).toBe(true);
  });

  it("T-LOG.3: range filter + multi-key DESC sort + NULL ora_effettiva fallback to ora_prevista", () => {
    const logs = [
      { id: 10, farmaco_id: 1, data: "2026-04-20", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:00", stato: "presa" },
      { id: 11, farmaco_id: 1, data: "2026-04-21", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:02", stato: "presa" },
      { id: 12, farmaco_id: 2, data: "2026-04-21", dose_numero: 1, ora_prevista: "12:00", ora_effettiva: null, stato: "saltata" },
      { id: 13, farmaco_id: 1, data: "2026-04-21", dose_numero: 2, ora_prevista: "20:00", ora_effettiva: "20:00", stato: "presa" },
      { id: 14, farmaco_id: 1, data: "2026-04-22", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: null, stato: "prevista" },
      { id: 15, farmaco_id: 1, data: "2026-04-22", dose_numero: 2, ora_prevista: "08:00", ora_effettiva: null, stato: "prevista" },
    ];
    const out = selectLogEntriesFiltered(logs, { from: "2026-04-21", to: "2026-04-22" });
    // Excludes id:10 (data < from).
    // Expected order:
    //   2026-04-22 dose_numero=2  (id:15) — fallback ora_prevista 08:00, tie-break dose 2 > 1
    //   2026-04-22 dose_numero=1  (id:14) — fallback ora_prevista 08:00
    //   2026-04-21 ora_eff 20:00  (id:13)
    //   2026-04-21 ora_prev 12:00 (id:12) — fallback (null ora_effettiva)
    //   2026-04-21 ora_eff 08:02  (id:11)
    expect(out.map((r) => r.id)).toEqual([15, 14, 13, 12, 11]);
  });
});
