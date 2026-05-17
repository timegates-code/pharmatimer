// ============================================================
// CronologiaView — unit tests T-LOG.4 + T-LOG.5 (Sessione N+2 par.11.U, s.6.215).
//
// Pattern: vi.mock Proxy boundary on '../../data/repository/index.js'
// (replicato da OggiView.test.jsx, §22.55 Proxy hoist boundary).
//
// T-LOG.4: render — 5 header cols + N rows from fixture.
// T-LOG.5: change farmaco filter via fireEvent.change on select →
//          rows re-rendered with only matching farmaco_id.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProvider } from "../../test/renderHelpers.jsx";

const hoist = vi.hoisted(() => ({ repo: null }));

vi.mock("../../data/repository/index.js", () => {
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === "then" || typeof prop === "symbol") return undefined;
      const r = hoist.repo;
      if (!r) {
        return () => Promise.resolve([]);
      }
      return r[prop];
    },
  });
  return { repo: proxy, getRepository: () => proxy };
});

// vi.mock + vi.hoisted are auto-hoisted to the top by Vitest (same behavior
// as Jest), so a static import here resolves AFTER the mock is in place.
import CronologiaView from "./CronologiaView.jsx";

const FARMACI_FIXTURE = [
  { id: 1, nome: "Antibiotico", attivo: 1 },
  { id: 2, nome: "Cardio", attivo: 1 },
];

const LOG_FIXTURE = [
  // Antibiotico 2026-05-15 dose1 presa
  { id: 1, farmaco_id: 1, data: "2026-05-15", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:05", stato: "presa" },
  // Cardio 2026-05-15 dose1 presa
  { id: 2, farmaco_id: 2, data: "2026-05-15", dose_numero: 1, ora_prevista: "20:00", ora_effettiva: "20:03", stato: "presa" },
  // Antibiotico 2026-05-15 dose2 saltata (ora_effettiva null → display "—")
  { id: 3, farmaco_id: 1, data: "2026-05-15", dose_numero: 2, ora_prevista: "20:00", ora_effettiva: null, stato: "saltata" },
  // Antibiotico 2026-05-14 dose1 presa
  { id: 4, farmaco_id: 1, data: "2026-05-14", dose_numero: 1, ora_prevista: "08:00", ora_effettiva: "08:00", stato: "presa" },
];

beforeEach(() => {
  hoist.repo = {
    getLogByRange: vi.fn(async () => LOG_FIXTURE),
  };
});

describe("CronologiaView (s.6.215 vista Log)", () => {
  it("T-LOG.4: renders 5-column table with all fixture entries (DESC sorted)", async () => {
    renderWithProvider(<CronologiaView />, {
      stateOverrides: { farmaci: FARMACI_FIXTURE },
    });

    // Wait for repo fetch + state update + render.
    await waitFor(() => {
      expect(screen.queryByTestId("log-loading")).toBeNull();
    });

    const table = screen.getByTestId("log-table");
    expect(table).toBeTruthy();

    const headers = within(table)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).toEqual(["Data", "Farmaco", "Prev", "Eff", "Stato"]);

    const rows = within(table).getAllByTestId("log-row");
    expect(rows).toHaveLength(LOG_FIXTURE.length);

    // First row should be most recent (DESC): id:3 (2026-05-15 dose 2 ora_prev 20:00, ora_eff null)
    // Sort key: data DESC primary → 2026-05-15 > 2026-05-14.
    // Within 2026-05-15: id:2 ora_eff 20:03, id:3 ora_prev 20:00 (null ora_eff fallback), id:1 ora_eff 08:05.
    // 20:03 > 20:00 > 08:05 → ids [2, 3, 1, 4].
    const firstRowCells = within(rows[0]).getAllByRole("cell");
    expect(firstRowCells[0].textContent).toBe("15/05/26");
  });

  it("T-LOG.5: filtering by farmaco dropdown re-renders rows", async () => {
    renderWithProvider(<CronologiaView />, {
      stateOverrides: { farmaci: FARMACI_FIXTURE },
    });

    await waitFor(() => {
      expect(screen.queryByTestId("log-loading")).toBeNull();
    });

    // Baseline: 4 rows (all farmaci).
    expect(screen.getAllByTestId("log-row")).toHaveLength(4);

    // Change select to farmaco_id=1 (Antibiotico).
    const select = screen.getByTestId("log-filter-farmaco");
    fireEvent.change(select, { target: { value: "1" } });

    // After filter: only farmaco_id=1 → ids [1, 3, 4] = 3 rows.
    await waitFor(() => {
      expect(screen.getAllByTestId("log-row")).toHaveLength(3);
    });

    // Verify all visible rows are Antibiotico.
    const rows = screen.getAllByTestId("log-row");
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      expect(cells[1].textContent).toBe("Antibiotico");
    }
  });
});
