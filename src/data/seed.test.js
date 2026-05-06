// =============================================================
// seed.js demo data structure tests — par.6.172-175 (CP4 v3.0.0).
// =============================================================
//
// Verifies the structural correctness of the neutral demo seed
// (3 farmaci, naming convention "Esempio ...", flags coherent).
// runSeedIfNeeded itself is not unit-tested here (Dexie roundtrip
// validated at CP browser); we only check the data builder.
//
// par.6.195 (CP12 v3.0.0 Step 2, sub-AMB 11.b): added per-record
// invariant test — guarantees naming + flag conventions hold for
// every record in the dataset, including any future addition (the
// existing tests assert against a hardcoded 3-element array, which
// would fail for a different reason if a 4th farmaco were added
// without respecting the convention).
// =============================================================

import { describe, it, expect } from "vitest";
import { buildFarmaciDemo } from "./seed.js";

describe("seed buildFarmaciDemo (par.6.172-175)", () => {
  it("builds 3 neutral demo farmaci with given data_inizio", () => {
    const farmaci = buildFarmaciDemo("2026-05-05");

    expect(farmaci).toHaveLength(3);
    expect(farmaci.map((f) => f.nome)).toEqual([
      "Esempio Gastro 40mg",
      "Esempio Cardio 5mg",
      "Esempio Antibiotico 500mg",
    ]);
    // All marked demo + active + same data_inizio (par.6.174 dynamic)
    expect(farmaci.every((f) => f.demo === 1)).toBe(true);
    expect(farmaci.every((f) => f.attivo === 1)).toBe(true);
    expect(farmaci.every((f) => f.data_inizio === "2026-05-05")).toBe(true);
    // No data_fine on demo (chronic-like)
    expect(farmaci.every((f) => f.data_fine === null)).toBe(true);
  });

  it("3rd farmaco is intervallo 8h with 3 daily doses (Q-UX.6 letterale)", () => {
    const farmaci = buildFarmaciDemo("2026-05-05");
    const antibiotico = farmaci[2];

    expect(antibiotico.nome).toBe("Esempio Antibiotico 500mg");
    expect(antibiotico.tipo_frequenza).toBe("intervallo");
    expect(antibiotico.intervallo_ore).toBe(8.0);
    expect(antibiotico.intervallo_minimo_ore).toBe(4.0);
    expect(antibiotico.dosi_giornaliere).toBe(3);
    expect(antibiotico.relazione_pasto).toBe("indifferente");

    // First two farmaci are tipo fisso, 1 dose each
    expect(farmaci[0].tipo_frequenza).toBe("fisso");
    expect(farmaci[0].dosi_giornaliere).toBe(1);
    expect(farmaci[1].tipo_frequenza).toBe("fisso");
    expect(farmaci[1].dosi_giornaliere).toBe(1);
  });

  it("ogni farmaco demo rispetta convenzione naming + flag (invariante v3.0.0 sub-AMB 11.b)", () => {
    const farmaci = buildFarmaciDemo("2026-05-05");

    expect(farmaci.length).toBeGreaterThanOrEqual(1);

    for (const f of farmaci) {
      // par.22.43 / Q-UX.6: every demo record uses the "Esempio ..."
      // naming prefix to make the user-facing distinction obvious in
      // FarmaciTab. Trailing space prevents bare "Esempio" from passing.
      expect(f.nome.startsWith("Esempio ")).toBe(true);
      // par.6.172: demo flag enables clearDemoData wipe without
      // touching user-created records.
      expect(f.demo).toBe(1);
      // Demo records start active so they appear in OggiView
      // immediately after onboarding mode='demo'.
      expect(f.attivo).toBe(1);
      // par.6.174: demo records are chronic-like (no end date).
      expect(f.data_fine).toBe(null);
      // principio_attivo placeholder convention (Q-UX.6: not real
      // molecules). Single source distinguishing demo data from
      // user-created records that carry real principio_attivo.
      expect(f.principio_attivo).toBe("esempio");
    }
  });
});
