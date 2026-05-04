// ============================================================
// selectProssimoGiornoConDosi unit tests — par.6.171 (CP3 v3.0.0 Step 1).
// ============================================================

import { describe, it, expect } from "vitest";
import { selectProssimoGiornoConDosi } from "./selectors.js";

describe("selectProssimoGiornoConDosi (par.6.171)", () => {
  it("returns null when no farmaci attivi (Q-UX.3 takes precedence)", () => {
    const state = {
      farmaci: [],
      plan: [
        {
          key: "k1",
          dateStr: "2026-05-10",
          ora_prevista: "08:00",
          farmaco_id: 1,
          momento: "COLAZIONE",
          descrizione_momento: "colazione",
        },
      ],
    };
    expect(selectProssimoGiornoConDosi(state, "2026-05-04")).toBeNull();
  });

  it("returns first future day grouped by momento", () => {
    const state = {
      farmaci: [{ id: 1, nome: "TestFarmaco", attivo: 1 }],
      plan: [
        // Day 2026-05-10 — should be selected (earliest future)
        {
          key: "k1",
          dateStr: "2026-05-10",
          ora_prevista: "08:00",
          farmaco_id: 1,
          momento: "COLAZIONE",
          descrizione_momento: "colazione",
        },
        // Day 2026-05-15 — later, ignored by selector
        {
          key: "k2",
          dateStr: "2026-05-15",
          ora_prevista: "08:00",
          farmaco_id: 1,
          momento: "COLAZIONE",
          descrizione_momento: "colazione",
        },
      ],
    };

    const result = selectProssimoGiornoConDosi(state, "2026-05-04");

    expect(result).not.toBeNull();
    expect(result.dateStr).toBe("2026-05-10");
    expect(result.dateLabel).toEqual(expect.any(String));
    expect(result.groups).toBeInstanceOf(Array);
    expect(result.groups.length).toBeGreaterThan(0);
  });
});
