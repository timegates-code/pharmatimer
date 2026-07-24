// ============================================================
// SyncRepository — unit tests (CS-3, par.22.198-sexvicies).
// ============================================================
//
// Scope: the read-path guard in isolation. `_api` and `_local` are
// mocked with spies; Dexie is NOT touched here (the mirror reconciliation
// is covered against real Dexie in LocalRepository.mirror.test.js).
//
// Covers:
//   - completeness (anti-drift net): every PUBLIC method of
//     ApiRepository.prototype is present on SyncRepository.prototype.
//   - guarded reads success: mirror-write called with server data +
//     server data returned + freshness bumped AFTER the mirror.
//   - fallback on DB_UNAVAILABLE: local mirror returned, no bump.
//   - propagation: UNAUTHORIZED / generic errors re-thrown, no fallback.
//
// jsdom environment (default): real localStorage for freshness; globals
// off (explicit imports), matching vitest.config.js.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncRepository } from "./SyncRepository.js";
import { ApiRepository } from "./ApiRepository.js";

const FRESH_KEY = "pharmatimer.mirrorFreshness";

function makeApi(overrides = {}) {
  return {
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    getLogByRange: vi.fn().mockResolvedValue([]),
    // CS-4 S2c-2b write-path. Signatures transcribed from the real
    // contract in IRepository.js :110-111 -- upsertLog(farmacoId, data,
    // doseNumero, patch) and upsertLogsBatch(logs, op).
    upsertLog: vi.fn().mockResolvedValue({}),
    upsertLogsBatch: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeLocal(overrides = {}) {
  return {
    mirrorFarmaci: vi.fn().mockResolvedValue(undefined),
    mirrorOrari: vi.fn().mockResolvedValue(undefined),
    mirrorLogWindow: vi.fn().mockResolvedValue(undefined),
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    getLogByRange: vi.fn().mockResolvedValue([]),
    // CS-4 S2c-2b write-path. Signatures transcribed from the real
    // LocalRepository.js: :372 upsertLogsBatch(logs), :439
    // withTransaction(mode, storeNames, fn), :594 outboxEnqueue(elements),
    // :602 outboxNextPending(), :613 outboxRemove(id), :618
    // outboxPark(id, reason).
    //
    // `withTransaction` RUNS its callback on purpose: a mock that
    // swallowed it would make every write-path pin below VACUOUS -- the
    // touch would never be attempted, and the silence of the network
    // would prove nothing at all.
    withTransaction: vi.fn(async (mode, storeNames, fn) => fn()),
    upsertLogsBatch: vi.fn().mockResolvedValue([]),
    outboxEnqueue: vi.fn().mockResolvedValue(undefined),
    outboxNextPending: vi.fn().mockResolvedValue(null),
    outboxRemove: vi.fn().mockResolvedValue(undefined),
    outboxPark: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("SyncRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("completeness (anti-drift net)", () => {
    it("expone ogni metodo pubblico di ApiRepository.prototype", () => {
      const publicApi = Object.getOwnPropertyNames(
        ApiRepository.prototype
      ).filter((n) => n !== "constructor" && !n.startsWith("_"));
      expect(publicApi.length).toBeGreaterThan(0);
      for (const name of publicApi) {
        expect(
          typeof SyncRepository.prototype[name],
          `manca il metodo ${name}`
        ).toBe("function");
      }
    });
  });

  describe("getFarmaci (guarded read)", () => {
    it("successo: mirrorFarmaci(server) + ritorna il dato server", async () => {
      const server = [{ id: 1, attivo: 1 }];
      const api = makeApi({ getFarmaci: vi.fn().mockResolvedValue(server) });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);
      const res = await sync.getFarmaci({ soloAttivi: true });
      expect(res).toBe(server);
      expect(api.getFarmaci).toHaveBeenCalledWith({ soloAttivi: true });
      expect(local.mirrorFarmaci).toHaveBeenCalledWith(server);
    });

    it("freschezza: bump DOPO il mirror-write, mai prima", async () => {
      localStorage.setItem(FRESH_KEY, "OLD");
      let duringMirror = null;
      const server = [{ id: 1, attivo: 1 }];
      const api = makeApi({ getFarmaci: vi.fn().mockResolvedValue(server) });
      const local = makeLocal({
        mirrorFarmaci: vi.fn().mockImplementation(async () => {
          duringMirror = localStorage.getItem(FRESH_KEY);
        }),
      });
      const sync = new SyncRepository(api, local);
      await sync.getFarmaci();
      expect(duringMirror).toBe("OLD"); // not bumped yet during mirror
      expect(localStorage.getItem(FRESH_KEY)).not.toBe("OLD"); // bumped after
    });

    it("fallback DB_UNAVAILABLE: specchio soloAttivi, nessun bump", async () => {
      const mirrored = [{ id: 7, attivo: 1 }];
      const api = makeApi({
        getFarmaci: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
      });
      const local = makeLocal({
        getFarmaci: vi.fn().mockResolvedValue(mirrored),
      });
      const sync = new SyncRepository(api, local);
      const res = await sync.getFarmaci();
      expect(res).toBe(mirrored);
      expect(local.getFarmaci).toHaveBeenCalledWith({ soloAttivi: true });
      expect(local.mirrorFarmaci).not.toHaveBeenCalled();
      expect(sync.getMirrorFreshness()).toBeNull();
    });

    it("UNAUTHORIZED propaga (nessun fallback)", async () => {
      const err = { code: "UNAUTHORIZED" };
      const api = makeApi({ getFarmaci: vi.fn().mockRejectedValue(err) });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);
      await expect(sync.getFarmaci()).rejects.toBe(err);
      expect(local.getFarmaci).not.toHaveBeenCalled();
    });
  });

  describe("getAllOrari (guarded read)", () => {
    it("successo: mirrorOrari(server) + ritorna il dato server", async () => {
      const server = [{ id: 1, farmaco_id: 2 }];
      const api = makeApi({ getAllOrari: vi.fn().mockResolvedValue(server) });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);
      const res = await sync.getAllOrari();
      expect(res).toBe(server);
      expect(local.mirrorOrari).toHaveBeenCalledWith(server);
    });

    it("fallback DB_UNAVAILABLE: specchio getAllOrari(), nessun mirror", async () => {
      const mirrored = [{ id: 3 }];
      const api = makeApi({
        getAllOrari: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
      });
      const local = makeLocal({
        getAllOrari: vi.fn().mockResolvedValue(mirrored),
      });
      const sync = new SyncRepository(api, local);
      const res = await sync.getAllOrari();
      expect(res).toBe(mirrored);
      expect(local.getAllOrari).toHaveBeenCalled();
      expect(local.mirrorOrari).not.toHaveBeenCalled();
    });

    it("errore generico propaga (nessun fallback)", async () => {
      const err = { code: "GENERIC" };
      const api = makeApi({ getAllOrari: vi.fn().mockRejectedValue(err) });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);
      await expect(sync.getAllOrari()).rejects.toBe(err);
      expect(local.getAllOrari).not.toHaveBeenCalled();
    });
  });

  describe("getLogByRange (guarded read)", () => {
    it("successo: mirrorLogWindow(server, da, a) + ritorna lo specchio RILETTO", async () => {
      // CS-4 S2c-2b (c4) + voce 38. The guard no longer returns the raw
      // server payload: it returns the mirror RE-READ after the write, so
      // the rows held by a live outbox promise survive the snapshot
      // (14.4.4, M1/M2). Referential identity with `server` is broken BY
      // CONSTRUCTION -- dovuto realignment, not a regression.
      // SENTINEL_S2C2B_REREAD_TEST
      const server = [{ id: 1, farmaco_id: 10, data: "2026-07-10" }];
      const riletto = [
        { id: 1, farmaco_id: 10, data: "2026-07-10", stato: "presa" },
      ];
      const api = makeApi({ getLogByRange: vi.fn().mockResolvedValue(server) });
      const local = makeLocal({
        getLogByRange: vi.fn().mockResolvedValue(riletto),
      });
      const sync = new SyncRepository(api, local);
      const res = await sync.getLogByRange("2026-07-05", "2026-07-15");
      expect(res).toBe(riletto);
      expect(res).not.toBe(server);
      expect(local.mirrorLogWindow).toHaveBeenCalledWith(
        server,
        "2026-07-05",
        "2026-07-15"
      );
      expect(local.getLogByRange).toHaveBeenCalledWith(
        "2026-07-05",
        "2026-07-15"
      );
    });

    it("fallback DB_UNAVAILABLE: specchio getLogByRange(da, a)", async () => {
      const mirrored = [{ id: 9 }];
      const api = makeApi({
        getLogByRange: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
      });
      const local = makeLocal({
        getLogByRange: vi.fn().mockResolvedValue(mirrored),
      });
      const sync = new SyncRepository(api, local);
      const res = await sync.getLogByRange("2026-07-05", "2026-07-15");
      expect(res).toBe(mirrored);
      expect(local.getLogByRange).toHaveBeenCalledWith(
        "2026-07-05",
        "2026-07-15"
      );
      expect(local.mirrorLogWindow).not.toHaveBeenCalled();
    });

    it("clinico: il server dice prevista, lo specchio dice presa -- affiora presa", async () => {
      // SENTINEL_S2C2B_PIN_REREAD
      // Distinct from the pin above, which fixes referential identity
      // ONLY. Here the CONTENT is the point: a live outbox promise holds
      // the dose as `presa` in the mirror while the server snapshot still
      // says `prevista`. Returning the snapshot would send the card back
      // to "da prendere" (M1) and make the queued gesture look lost (M2),
      // so the re-read must win and the server value must NOT surface.
      const server = [
        {
          id: 1,
          farmaco_id: 10,
          data: "2026-07-10",
          dose_numero: 1,
          stato: "prevista",
        },
      ];
      const riletto = [
        {
          id: 1,
          farmaco_id: 10,
          data: "2026-07-10",
          dose_numero: 1,
          stato: "presa",
        },
      ];
      const api = makeApi({ getLogByRange: vi.fn().mockResolvedValue(server) });
      const local = makeLocal({
        getLogByRange: vi.fn().mockResolvedValue(riletto),
      });
      const sync = new SyncRepository(api, local);
      const res = await sync.getLogByRange("2026-07-05", "2026-07-15");
      expect(res.map((r) => r.stato)).toEqual(["presa"]);
      expect(res.some((r) => r.stato === "prevista")).toBe(false);
    });
  });

  describe("forwarders", () => {
    it("delegano a _api (campione: getProfili, upsertLog, withTransaction)", async () => {
      const api = makeApi({
        getProfili: vi.fn().mockResolvedValue(["p"]),
        upsertLog: vi.fn().mockResolvedValue({ id: 1 }),
        withTransaction: vi.fn().mockResolvedValue("tx"),
      });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);

      expect(await sync.getProfili()).toEqual(["p"]);
      await sync.upsertLog(1, "2026-07-10", 1, { stato: "presa" });
      expect(api.upsertLog).toHaveBeenCalledWith(1, "2026-07-10", 1, {
        stato: "presa",
      });
      const fn = async () => {};
      expect(await sync.withTransaction("rw", ["farmaci"], fn)).toBe("tx");
      expect(api.withTransaction).toHaveBeenCalledWith("rw", ["farmaci"], fn);
    });

    it("getLogByData forwarda raw a _api (nessun mirror)", async () => {
      const api = makeApi({
        getLogByData: vi.fn().mockResolvedValue(["row"]),
      });
      const local = makeLocal();
      const sync = new SyncRepository(api, local);
      expect(await sync.getLogByData("2026-07-10")).toEqual(["row"]);
      expect(api.getLogByData).toHaveBeenCalledWith("2026-07-10");
      expect(local.mirrorLogWindow).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // Write-path pins (CS-4 S2c-2b, par.22.198-septtriginties)
  // ==========================================================
  // The gesture is annotated FIRST in ledger + outbox, in ONE
  // transaction (taccuino-prima, Spec 14.6.2), and only then delivered.
  // Park reasons are asserted as RAW LITERALS on purpose (Q-SEPT-1=A):
  // that string is what the Centro invii shows the person, so a silent
  // rename must BREAK these pins instead of quietly following them.

  describe("write-path (CS-4 S2c-2b)", () => {
    const LOGS = [
      { farmaco_id: 1, data: "2026-07-24", dose_numero: 1, stato: "presa" },
    ];

    function elemento(id) {
      return {
        id,
        op: "presa",
        client_op_id: "targa-" + id,
        logs: [
          { farmaco_id: 1, data: "2026-07-24", dose_numero: 1, stato: "presa" },
        ],
      };
    }

    it("GENERIC: parcheggia ROTTA_NON_DERIVABILE, mai rimuove, promise RESOLVE", async () => {
      // SENTINEL_S2C2B_PIN_GENERIC
      // A broken request is not healed by retrying (Spec 14.3), but it
      // must never be dropped either: the dose was really taken (M2).
      const scritte = [{ id: 501, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue({ code: "GENERIC" }),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(11))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(api.upsertLog).toHaveBeenCalledTimes(1);
      expect(local.outboxPark).toHaveBeenCalledWith(11, "ROTTA_NON_DERIVABILE");
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("CONSTRAINT_VIOLATION: parcheggia CONFLITTO_O_RICHIESTA_ROTTA, mai drop", async () => {
      // SENTINEL_S6266_PIN_PARK
      // s.6.266: a true 409 and a broken 4xx arrive indistinguishable and
      // Spec 14.3 asks for opposite actions. Both PARK: the parking lot
      // never discards, while a drop would lose a dose really taken (M2)
      // and send the card back to "da prendere" (M1).
      const scritte = [{ id: 502, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue({ code: "CONSTRAINT_VIOLATION" }),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(21))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxPark).toHaveBeenCalledWith(
        21,
        "CONFLITTO_O_RICHIESTA_ROTTA"
      );
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("il parcheggio NON blocca la fila: il secondo elemento viene consegnato", async () => {
      // SENTINEL_S6266_PIN_PARK
      // Spec 14.3: parking does not stop the queue -- only unreachable,
      // 5xx and UNAUTHORIZED do. A parked head that froze the file would
      // strand every later dose behind it (M2).
      const api = makeApi({
        upsertLog: vi
          .fn()
          .mockRejectedValueOnce({ code: "CONSTRAINT_VIOLATION" })
          .mockResolvedValue({ id: 1 }),
      });
      const local = makeLocal({
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(31))
          .mockResolvedValueOnce(elemento(32))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await sync.upsertLogsBatch(LOGS, "presa");
      expect(local.outboxPark).toHaveBeenCalledWith(
        31,
        "CONFLITTO_O_RICHIESTA_ROTTA"
      );
      expect(local.outboxRemove).toHaveBeenCalledTimes(1);
      expect(local.outboxRemove).toHaveBeenCalledWith(32);
    });

    it("transazione-tocco fallita: la promise RIGETTA e nessuna rete parte", async () => {
      // SENTINEL_S2C2B_PIN_REJECT
      // Voce 52 / Q-QUATER-5=A: `reject` is legal ONLY here, on a touch
      // that failed to be annotated. The mock RUNS the callback and only
      // then aborts, so the pin proves the network stayed silent because
      // delivery never started -- not because the callback was skipped.
      // The earlier form of this pin was VACUOUS for exactly that reason.
      const boom = { code: "TRANSACTION_ABORT" };
      const api = makeApi();
      const local = makeLocal({
        withTransaction: vi.fn(async (mode, storeNames, fn) => {
          await fn();
          throw boom;
        }),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).rejects.toBe(boom);
      expect(local.upsertLogsBatch).toHaveBeenCalled();
      expect(local.outboxEnqueue).toHaveBeenCalled();
      expect(api.upsertLog).not.toHaveBeenCalled();
      expect(api.upsertLogsBatch).not.toHaveBeenCalled();
      expect(local.outboxNextPending).not.toHaveBeenCalled();
    });
  });
});
