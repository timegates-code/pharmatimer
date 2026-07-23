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
});
