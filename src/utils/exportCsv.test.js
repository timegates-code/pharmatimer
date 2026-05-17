// ============================================================
// exportCsv.test.js — Sessione N+3 par.11.V, s.6.216.
// T-EXP.1 encoding base + T-EXP.2 escape RFC 4180-style (CP1).
// T-EXP.3 triggerCsvDownload DOM glue with mocks (CP2).
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  entriesToCsv,
  DEFAULT_COLUMNS,
  triggerCsvDownload,
} from "./exportCsv.js";

const makeFarmacoNameMap = () =>
  new Map([
    [1, "Pantorc 40mg"],
    [2, 'Olevia "Forte" 1000mg'], // embedded double-quote
    [3, "Sale; pepe 500mg"],      // embedded SEP
  ]);

describe("entriesToCsv (s.6.216 Sub-Q-NEW.A=a, Q-EXP.4=b)", () => {
  it("T-EXP.1 — encoding base: BOM + ; separator + CRLF + 5-column header IT", () => {
    const entries = [
      {
        id: 1,
        farmaco_id: 1,
        data: "2026-04-19",
        dose_numero: 1,
        ora_prevista: "08:00",
        ora_effettiva: "08:05",
        stato: "presa",
      },
    ];
    const csv = entriesToCsv(entries, DEFAULT_COLUMNS, {
      farmacoNameById: makeFarmacoNameMap(),
    });

    // BOM at start (UTF-8 BOM = U+FEFF)
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    // Strip BOM for line-content assertions
    const body = csv.slice(1);
    const lines = body.split("\r\n");

    // Header IT 5 colonne con `;`
    expect(lines[0]).toBe("Data;Farmaco;Ora prevista;Ora effettiva;Stato");

    // First data row: ISO date passthrough + farmaco lookup + HH:MM raw + stato IT label
    expect(lines[1]).toBe("2026-04-19;Pantorc 40mg;08:00;08:05;Presa");

    // CRLF line ends + trailing newline
    expect(csv.includes("\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);

    // Header-only when entries === [] (Sub-Q-NEW.C=a behavior)
    const empty = entriesToCsv([], DEFAULT_COLUMNS, {
      farmacoNameById: new Map(),
    });
    expect(empty).toBe(
      "\uFEFFData;Farmaco;Ora prevista;Ora effettiva;Stato\r\n"
    );
  });

  it("T-EXP.2 — escape RFC 4180: virgolette + ; embedded + null + ISO datetime + unknown farmaco/stato", () => {
    const entries = [
      // Row 1: embedded `"` in farmaco name (id=2), null ora_effettiva
      {
        id: 2,
        farmaco_id: 2,
        data: "2026-04-19",
        dose_numero: 1,
        ora_prevista: "13:30",
        ora_effettiva: null,
        stato: "saltata",
      },
      // Row 2: embedded `;` in farmaco name (id=3), ISO datetime ora fields
      {
        id: 3,
        farmaco_id: 3,
        data: "2026-04-19",
        dose_numero: 2,
        ora_prevista: "2026-04-19T20:30",
        ora_effettiva: "2026-04-19T20:42",
        stato: "ricalcolata",
      },
      // Row 3: unknown farmaco_id (no map entry) + unknown stato (passthrough)
      {
        id: 4,
        farmaco_id: 99,
        data: "2026-04-20",
        dose_numero: 1,
        ora_prevista: "08:00",
        ora_effettiva: "",
        stato: "unknown_state_xyz",
      },
    ];
    const csv = entriesToCsv(entries, DEFAULT_COLUMNS, {
      farmacoNameById: makeFarmacoNameMap(),
    });
    const lines = csv.slice(1).split("\r\n");

    // Header preserved
    expect(lines[0]).toBe("Data;Farmaco;Ora prevista;Ora effettiva;Stato");

    // Row 1: embedded `"` quoted+escaped, null -> empty string
    expect(lines[1]).toBe(
      '2026-04-19;"Olevia ""Forte"" 1000mg";13:30;;Saltata'
    );

    // Row 2: embedded `;` quoted, ISO datetime stripped to HH:MM
    expect(lines[2]).toBe(
      '2026-04-19;"Sale; pepe 500mg";20:30;20:42;Ricalcolata'
    );

    // Row 3: unknown farmaco_id -> `#99`, unknown stato -> passthrough
    expect(lines[3]).toBe("2026-04-20;#99;08:00;;unknown_state_xyz");
  });
});

describe("triggerCsvDownload (s.6.216 CP2 Sub-Q-NEW.B/C, Q-EXP.2=a Blob+download)", () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;
  let origCreateObjectURL;
  let origRevokeObjectURL;

  beforeEach(() => {
    // Save originals (happy-dom defines these as no-ops; we replace with mocks).
    origCreateObjectURL = global.URL.createObjectURL;
    origRevokeObjectURL = global.URL.revokeObjectURL;

    createObjectURLSpy = vi.fn(() => "blob:mock-url");
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    appendChildSpy = vi.spyOn(document.body, "appendChild");
    removeChildSpy = vi.spyOn(document.body, "removeChild");
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore URL methods (vi.restoreAllMocks does NOT touch these globals).
    global.URL.createObjectURL = origCreateObjectURL;
    global.URL.revokeObjectURL = origRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("T-EXP.3 — filename + Blob MIME + URL.createObjectURL/revoke + anchor click + cleanup", () => {
    const filename = "pharmatimer-log-2026-05-17.csv";
    const csv = "\uFEFFData;Stato\r\n2026-04-19;Presa\r\n";

    triggerCsvDownload(filename, csv);

    // createObjectURL called once with a Blob of correct MIME
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv;charset=utf-8");

    // Anchor appended/clicked/removed exactly once each
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    const anchorArg = appendChildSpy.mock.calls[0][0];
    expect(anchorArg.tagName).toBe("A");
    expect(anchorArg.getAttribute("download")).toBe(filename);
    expect(anchorArg.getAttribute("href")).toBe("blob:mock-url");

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);

    // URL revoked with same mock url
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });
});
