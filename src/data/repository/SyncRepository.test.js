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

// SENTINEL_QOCT_IMPORT_AFTEREACH
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncRepository } from "./SyncRepository.js";
import { ApiRepository } from "./ApiRepository.js";
// SENTINEL_S6273_IMPORT_SUITE
// Q-NODO-5=A. Il giro intero preteso da Q-ORDITO-4=A si chiude QUI: la
// sede durevole e la giunzione si importano nella suite del guardiano,
// perche e il guardiano a scrivere e nessun altro.
import { elencaAvvisi } from "./avvisiStore.js";
import { componiScheda, ESITI_SCHEDA } from "../../utils/avvisoScheda.js";

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
    // SENTINEL_SEX_PIN_HARNESS
    // Q-SEX-4=A / Q-SEX-3=A. Firme trascritte dal reale: outboxNextPendingAfter
    // (afterId) e outboxBumpAttempts(id, next). Il default di NextPendingAfter
    // e `null` di proposito: nei pin che NON saltano mai un elemento il cursore
    // non si accende, quindi un default diverso mascherebbe una accensione
    // indebita invece di lasciarla vedere.
    outboxNextPendingAfter: vi.fn().mockResolvedValue(null),
    outboxBumpAttempts: vi.fn().mockResolvedValue(1),
    // SENTINEL_S6273_HARNESS
    // Q-NODO-5=A. Firma trascritta dal reale: LocalRepository.js :192
    // getFarmaco(id). Default `null` FAIL-CLOSED di proposito, stessa
    // ragione scritta sopra per outboxNextPendingAfter: sotto un default
    // nullo un pin che droppa e dimentica di configurare il farmaco
    // PARCHEGGIA e arrossa, invece di droppare in silenzio. Ogni pin che
    // droppa deve dichiarare il farmaco che gli serve.
    getFarmaco: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// SENTINEL_QZANCA_HOIST_SAGOMA
// Q-ZANCA-9=A -- la sagoma SALE a livello di modulo e resta in SEDE
// UNICA. Il describe del terzo stato e un FRATELLO di write-path e non
// vedrebbe una fabbrica annidata: scartata a verbale la seconda
// fabbrica, che aprirebbe una trascrizione parallela di
// outboxSplitter.makeElement capace di divergere dalla prima (voce 186,
// voce 93), su un file che porta gia un precedente censito di sagoma
// infedele. Il corpo e VERBATIM; cambia il solo rientro.
// SENTINEL_S6273_SAGOMA
// Q-NODO-9=A. Sagoma TRASCRITTA da outboxSplitter.makeElement :192-207,
// undici campi. La forma a quattro campi era INERTE finche nessun pin
// leggeva i campi primari; s.6.273 li legge tutti, e una sagoma infedele
// avrebbe fissato *parcheggia* mentre credevo di fissare *droppa* --
// LC-93 e voce 130, famiglia gia censita su QUESTO file (outboxPark
// mockato a undefined mentre il reale ritorna un conteggio).
// I tre campi primari derivano da logs[0], come fa la produzione.
// RESIDUO DICHIARATO: e una trascrizione e non una prova (LC-99). Che
// la produzione generi `data` in forma YYYY-MM-DD lo sostengono
// avvisoScheda.js :50-51 e il letterale di LOGS qui sopra, e si misura
// sullo stack vero a CS-6.
function elemento(id, patch = {}) {
  const riga = {
    farmaco_id: 1,
    data: "2026-07-24",
    dose_numero: 1,
    stato: "presa",
    ...(patch.riga || {}),
  };
  return {
    id,
    stato: "pending",
    op: patch.op || "presa",
    client_op_id: "targa-" + id,
    logs: [riga],
    farmaco_id: riga.farmaco_id,
    data: riga.data,
    dose_numero: riga.dose_numero,
    created_at: "2026-07-24T13:05:00.000Z",
    attempts: 0,
    parked_reason: null,
    parked_at: null,
  };
}

function elementoTentato(id, attempts) {
  return { ...elemento(id), attempts };
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
  // Coda offline -- lettura disponibile (CS-5.5 parte 2)
  // ==========================================================
  // SENTINEL_QTIRANTE_PIN_FORWARD_LOCAL
  // Q-RINTOCCO-2=A. `outboxCounts` NON e un forwarder del blocco dei 27:
  // quelli vanno a `_api`, questo va a `_local`. E la ragione per cui la
  // rete di completezza qui sopra -- che cammina ApiRepository.prototype
  // -- non lo incontra, e il conteggio di 27 resta vero.
  //
  // Il mock di `makeLocal` NON porta `outboxCounts` e si passa per
  // override invece di allargare la sagoma condivisa: allargarla
  // renderebbe meno fedele ogni altro pin di questo file, che e il
  // difetto gia censito su `outboxPark` mockato a `undefined`.
  describe("outboxCounts (lettura della coda, CS-5.5)", () => {
    it("inoltra a _local e restituisce il suo valore", async () => {
      const api = makeApi();
      const local = makeLocal({
        outboxCounts: vi.fn().mockResolvedValue({ pending: 2, parked: 1 }),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.outboxCounts()).resolves.toEqual({
        pending: 2,
        parked: 1,
      });
      expect(local.outboxCounts).toHaveBeenCalledTimes(1);
    });

    it("un rifiuto di _local ARRIVA al chiamante e non diventa uno zero", async () => {
      // SENTINEL_QTIRANTE_PIN_FORWARD_REJECT
      // Q-TIRANTE-1=A si regge su questo. `_wrap` rilancia un
      // RepositoryError classificato, quindi il rifiuto DEVE attraversare
      // il guardiano intatto. Se qualcuno lo assorbisse qui restituendo
      // {0,0}, il parcheggio si dipingerebbe vuoto mentre elementi sono
      // parcheggiati, e nessuna guardia del livello stato potrebbe piu
      // accorgersene: M2.
      const api = makeApi();
      const local = makeLocal({
        outboxCounts: vi.fn().mockRejectedValue(new Error("DB_UNAVAILABLE")),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.outboxCounts()).rejects.toThrow("DB_UNAVAILABLE");
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


    it("GENERIC: parcheggia ERRORE_NON_CLASSIFICATO, mai rimuove, promise RESOLVE", async () => {
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
      expect(local.outboxPark).toHaveBeenCalledWith(
        11,
        "ERRORE_NON_CLASSIFICATO"
      );
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("CONSTRAINT_VIOLATION: parcheggia RICHIESTA_ROTTA, mai drop", async () => {
      // SENTINEL_S6266_PIN_PARK_ETICHETTA
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
      expect(local.outboxPark).toHaveBeenCalledWith(21, "RICHIESTA_ROTTA");
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("il parcheggio NON blocca la fila: il secondo elemento viene consegnato", async () => {
      // SENTINEL_S6266_PIN_PARK_FILA
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
      expect(local.outboxPark).toHaveBeenCalledWith(31, "RICHIESTA_ROTTA");
      expect(local.outboxRemove).toHaveBeenCalledTimes(1);
      expect(local.outboxRemove).toHaveBeenCalledWith(32);
    });

    // ========================================================
    // s.6.273 -- il ramo 409 a TRE esiti (CS-5.3-bis parte 4)
    // ========================================================
    // Il pin di s.6.267 che stava qui pinnava *parcheggia, mai drop*, ed
    // e stato RISCRITTO e non cancellato: s.6.267 e ESTINTA, la sua
    // premessa -- la superficie 14.5 non esiste -- e caduta per misura.
    // Il testo di emissione resta nel Changelog, che e append-only.

    function apiInConflitto() {
      return makeApi({
        upsertLog: vi.fn().mockRejectedValue({ code: "CONFLICT" }),
      });
    }

    function unSoloElemento(el) {
      return vi.fn().mockResolvedValueOnce(el).mockResolvedValue(null);
    }

    it("CONFLICT con una presa: DROPPA e la scheda si compone (s.6.273)", async () => {
      // SENTINEL_S6273_PIN_DROP
      // Primo dei tre esiti. Il pin percorre il GIRO INTERO preteso da
      // Q-ORDITO-4=A -- elemento, salvaAvviso, elencaAvvisi, componiScheda
      // -- e pretende esito COMPLETA: e cosi che la FORMA di `data` e
      // `ora_tocco` si misura, invece di irrigidire la validazione di
      // salvaAvviso, che resterebbe una decisione diversa.
      let avvisiAlDrop = -1;
      const api = apiInConflitto();
      const local = makeLocal({
        getFarmaco: vi.fn().mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
        outboxNextPending: unSoloElemento(elemento(61)),
        // ORDINE M2, e questo lo pinna davvero: al momento del drop lo
        // avviso DEVE gia essere leggibile. Invertire lordine fa rosso qui
        // e in nessun altro punto.
        outboxRemove: vi.fn(async () => {
          avvisiAlDrop = elencaAvvisi().length;
        }),
      });
      const sync = new SyncRepository(api, local);

      // Q-NODO-4=A: il verbo "refused" NON incrementa il conteggio di
      // consegna. Se qualcuno domani riusasse "delivered", questa riga
      // arrossa -- ed e la guardia che il verbo nuovo altrimenti non ha.
      await expect(sync.drainOutbox()).resolves.toBe(0);
      expect(local.outboxRemove).toHaveBeenCalledWith(61);
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(avvisiAlDrop).toBe(1);

      const avvisi = elencaAvvisi();
      expect(avvisi).toHaveLength(1);
      expect(avvisi[0].motivo).toBe("CONFLITTO");
      expect(avvisi[0].op).toBe("presa");
      const scheda = componiScheda(avvisi[0]);
      expect(scheda.esito).toBe(ESITI_SCHEDA.COMPLETA);
      expect(scheda.testi.fatti).toContain("Cardioaspirina");
      expect(scheda.testi.fatti).toContain("dose 1");
      expect(scheda.testi.fatti).toContain("24 luglio 2026");
      // Lora e ora LOCALE del tocco: si pinna la FORMA e non il valore,
      // che dipende dal fuso della macchina di collaudo.
      expect(scheda.testi.fatti).toMatch(/Avevi registrato alle \d{2}:\d{2}\./);

      // SENTINEL_QTARGA_PIN_CONTA_REALE
      // Q-TARGA-2=B. La cucitura da cui il thunk da trigger osserva un
      // avviso NUOVO. Pinnata QUI e non in una suite propria perche qui lo
      // avviso e stato scritto DAVVERO dal guardiano: il metodo si misura
      // contro un avviso reale invece che contro un mock di se stesso.
      expect(sync.contaAvvisi()).toBe(1);
      expect(sync.contaAvvisi()).toBe(elencaAvvisi().length);
    });

    it("CONFLICT senza una presa: RESTA PARCHEGGIATO, nessun avviso", async () => {
      // SENTINEL_S6273_PIN_NOPRESA
      // Secondo dei tre esiti. Q-LETTO-2=A: il discriminante e la RIGA e
      // non il gesto. Senza una presa fra le righe CONSEGNATE non ce nulla
      // da compensare, e il parcheggio non scarta mai (M2).
      const api = apiInConflitto();
      const local = makeLocal({
        getFarmaco: vi.fn().mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
        outboxNextPending: unSoloElemento(
          elemento(62, { op: "salta", riga: { stato: "saltata" } })
        ),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      expect(local.outboxPark).toHaveBeenCalledWith(62, "CONFLITTO_VERO");
      expect(local.outboxRemove).not.toHaveBeenCalled();
      expect(elencaAvvisi()).toHaveLength(0);
      // Il discriminante sta PRIMA della lettura: il farmaco non si legge
      // nemmeno quando il drop non e sul tavolo.
      expect(local.getFarmaco).not.toHaveBeenCalled();
    });

    it("CONFLICT ma la lettura del farmaco LANCIA: parcheggia, non droppa", async () => {
      // SENTINEL_S6273_PIN_LETTURA
      // Terzo esito, prima meta. Q-LETTO-7=A: una lettura fallita NON
      // autorizza il drop. La riga su outboxBumpAttempts e la parte
      // discriminante: prova che il throw NON e uscito dallo helper. Se
      // uscisse finirebbe in _onInternalException e spenderebbe un
      // tentativo su un errore di business, che avvisiStore.js :22-27
      // dichiara lo esito sbagliato.
      const api = apiInConflitto();
      const local = makeLocal({
        getFarmaco: vi.fn().mockRejectedValue(new Error("dexie giu")),
        outboxNextPending: unSoloElemento(elemento(63)),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      expect(local.outboxPark).toHaveBeenCalledWith(63, "CONFLITTO_VERO");
      expect(local.outboxRemove).not.toHaveBeenCalled();
      expect(local.outboxBumpAttempts).not.toHaveBeenCalled();
      expect(elencaAvvisi()).toHaveLength(0);
    });

    it("CONFLICT ma il farmaco e assente: parcheggia (default fail-closed)", async () => {
      // SENTINEL_S6273_PIN_FARMACONULL
      // Terzo esito, seconda meta. Q-LETTO-7=A tratta il farmaco null come
      // lettura FALLITA e non come lettura vuota. Questo pin usa il default
      // di makeLocal apposta: e la dimostrazione che il fail-closed morde.
      const api = apiInConflitto();
      const local = makeLocal({
        outboxNextPending: unSoloElemento(elemento(64)),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      expect(local.getFarmaco).toHaveBeenCalledWith(1);
      expect(local.outboxPark).toHaveBeenCalledWith(64, "CONFLITTO_VERO");
      expect(local.outboxRemove).not.toHaveBeenCalled();
      expect(elencaAvvisi()).toHaveLength(0);
    });

    it("CONFLICT ma la scrittura dello avviso FALLISCE: parcheggia", async () => {
      // SENTINEL_S6273_PIN_SCRITTURA
      // Terzo esito, terza meta, ed e il caso portante: salvaAvviso
      // verifica per RILETTURA e non per assenza di throw, quindi un
      // setItem che ingoia il valore in silenzio ritorna false. Senza
      // questo pin il drop sarebbe autorizzato da un avviso che non ce.
      const spia = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {});
      const api = apiInConflitto();
      const local = makeLocal({
        getFarmaco: vi.fn().mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
        outboxNextPending: unSoloElemento(elemento(65)),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      spia.mockRestore();
      expect(local.outboxPark).toHaveBeenCalledWith(65, "CONFLITTO_VERO");
      expect(local.outboxRemove).not.toHaveBeenCalled();
      expect(elencaAvvisi()).toHaveLength(0);
    });

    it("il discriminante e la RIGA e non il verbo di rotta (Q-NODO-3=A)", async () => {
      // SENTINEL_S6273_PIN_DISCRIMINANTE
      // Elemento SINTETICO, e lo dichiaro: `annullaAssunzione` con una riga
      // `presa`. deriveDelivery :277 consegna la SOLA prima riga col verbo
      // UNDO, quindi rows.some(presa) e VERO mentre verb === PRESA e FALSO:
      // i due predicati DIVERGONO qui e in nessun altro caso di questa
      // suite. Senza questo pin i cinque sopra restano verdi anche sotto la
      // scorciatoia che Q-NODO-3=A ha scartato -- esito compatibile con
      // entrambe le ipotesi, cioe la rassicurazione vietata da LC-106.
      // La sua raggiungibilita in PRODUZIONE non e misurata e non serve:
      // il pin fissa la FORMA del predicato, non uno scenario clinico.
      const api = apiInConflitto();
      const local = makeLocal({
        getFarmaco: vi.fn().mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
        outboxNextPending: unSoloElemento(
          elemento(66, { op: "annullaAssunzione" })
        ),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      // Criterio di arresto DICHIARATO: se questa riga arrossa, il verbo
      // undo non ha un ramo in _patchForVerb e lo elemento e stato
      // parcheggiato PRIMA di raggiungere la rete. Sarebbe una scoperta
      // sulla regione :464-499, non un difetto di s.6.273.
      expect(api.upsertLog).toHaveBeenCalledTimes(1);
      expect(local.outboxRemove).toHaveBeenCalledWith(66);
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(componiScheda(elencaAvvisi()[0]).esito).toBe(
        ESITI_SCHEDA.COMPLETA
      );
    });

    it("NOT_FOUND: parcheggia FARMACO_O_DOSE_ASSENTE, mai drop", async () => {
      // SENTINEL_S2C2B_PIN_NOTFOUND
      // Il 404 sulla rotta della coda nasce anche da
      // _verify_farmaco_ownership (log_assunzioni.py :41-53), che collassa
      // assente / di un altro utente / disattivato su un solo codice per
      // security-by-obscurity: il motivo nomina farmaco E dose perche
      // entrambe le cose accadono, e la prima e la piu grave. Parcheggia
      // come ogni 4xx: un drop perderebbe una presa avvenuta (M2).
      const scritte = [{ id: 512, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue({ code: "NOT_FOUND" }),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(61))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxPark).toHaveBeenCalledWith(
        61,
        "FARMACO_O_DOSE_ASSENTE"
      );
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("eccezione interna senza code: CONTA e non parcheggia (primo colpo)", async () => {
      // SENTINEL_S2C2B_PIN_NOCODE
      // Un throw grezzo sollevato DENTRO il try -- rows.map, _patchForVerb --
      // non porta `.code`. Q-SEX-2=A lo classifica per POSIZIONE come classe
      // INTERNA e il ramo catch lo RILANCIA al drenaggio invece di
      // parcheggiarlo. Il pin FISSAVA la etichetta di un parcheggio immediato
      // e dichiarava aperta la divergenza da Spec 14.3; -sexies la chiude, e
      // il pin ora fissa lo INSTRADAMENTO nuovo: si conta, non si parcheggia.
      const scritte = [{ id: 513, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(71))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxBumpAttempts).toHaveBeenCalledWith(71, 1);
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("interna al TERZO colpo: parcheggia ERRORE_INTERNO_RIPETUTO", async () => {
      // SENTINEL_SEX_PIN_TERZO_COLPO
      // Q-SEX-3=A: soglia 3, cioe tre consegne fallite e poi il parcheggio.
      // Lo elemento arriva con attempts=2, quindi questo e il terzo. Il motivo
      // e asserito come LETTERALE GREZZO (Q-SEPT-1=A): quella stringa e cio
      // che la persona legge nel Centro invii, quindi una rinomina silenziosa
      // deve ROMPERE il pin invece di seguirlo.
      const scritte = [{ id: 514, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elementoTentato(81, 2))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxBumpAttempts).toHaveBeenCalledWith(81, 3);
      expect(local.outboxPark).toHaveBeenCalledWith(
        81,
        "ERRORE_INTERNO_RIPETUTO"
      );
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("la fila PROSEGUE oltre lo elemento che ha sollevato", async () => {
      // SENTINEL_SEX_PIN_AVANZA
      // Q-SEX-4=A, ed e il pin portante della sessione. Prima di -sexies una
      // eccezione interna fermava la passata e OGNI dose successiva restava
      // dietro di essa: fermare la fila per sempre dietro un elemento e il
      // modo di fallire che Q-QQUIN-2=A ha gia qualificato M2. Qui il primo
      // elemento solleva e resta in coda col suo contatore, e il SECONDO
      // viene consegnato lo stesso. Le dipendenze sulla stessa dose le
      // risolvono server-vince piu rilettura finale, per Spec 14.3.
      const scritte = [{ id: 515, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi
          .fn()
          .mockRejectedValueOnce(new TypeError("boom"))
          .mockResolvedValue({}),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(101))
          .mockResolvedValue(null),
        outboxNextPendingAfter: vi
          .fn()
          .mockResolvedValueOnce(elemento(102))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxNextPendingAfter).toHaveBeenCalledWith(101);
      expect(local.outboxRemove).toHaveBeenCalledWith(102);
      expect(local.outboxPark).not.toHaveBeenCalled();
    });

    it("contatore non scrivibile: lo elemento resta in coda, nulla si perde", async () => {
      // SENTINEL_SEX_PIN_CONTATORE_MUTO
      // Q-SEX-3=A, costo dichiarato in ratifica: lo incremento e una scrittura
      // Dexie, quindi quando Dexie STESSO e la risorsa guasta il contatore non
      // avanza. Direzione sicura e non silenziosa: lo elemento resta `pending`
      // e nulla si perde (M2). Il parcheggio userebbe lo stesso store rotto,
      // quindi nessuna altra sede lo renderebbe raggiungibile.
      const scritte = [{ id: 516, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(111))
          .mockResolvedValue(null),
        outboxBumpAttempts: vi
          .fn()
          .mockRejectedValue({ code: "TRANSACTION_ABORT" }),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(local.outboxRemove).not.toHaveBeenCalled();
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

    it("s.6.259: N elementi accodati in UNA transazione a due store", async () => {
      // SENTINEL_S6259_PIN_TX_SCOPE
      // INVARIANTE TOCCO INDIVISIBILE (Spec 14.3). PIN_REJECT above proves
      // both writes happen INSIDE the callback; it says nothing about the
      // scope. If "outbox" ever fell out of storeNames the ledger would
      // commit alone: the touch would be annotated with no promise behind
      // it, and a dose really taken would never be delivered (M2).
      // The 3-row shape is the #17 one, so the split is exercised for real:
      // one lone `saltata` plus the atomic couple.
      const TRE = [
        { farmaco_id: 1, data: "2026-07-22", dose_numero: 1, stato: "saltata" },
        { farmaco_id: 1, data: "2026-07-23", dose_numero: 1, stato: "presa" },
        {
          farmaco_id: 1,
          data: "2026-07-24",
          dose_numero: 1,
          stato: "ricalcolata",
        },
      ];
      const api = makeApi();
      const local = makeLocal();
      const sync = new SyncRepository(api, local);

      await sync.upsertLogsBatch(TRE, "presa");

      expect(local.withTransaction).toHaveBeenCalledTimes(1);
      const [mode, storeNames] = local.withTransaction.mock.calls[0];
      expect(mode).toBe("rw");
      expect(storeNames).toEqual(["log_assunzioni", "outbox"]);

      // TUTTI gli elementi in UNA sola chiamata: due accodamenti separati
      // non sarebbero piu un tocco indivisibile.
      expect(local.outboxEnqueue).toHaveBeenCalledTimes(1);
      const [elementi] = local.outboxEnqueue.mock.calls[0];
      expect(elementi).toHaveLength(2);
      expect(elementi.map((e) => e.logs.length)).toEqual([1, 2]);
      // UNA targa per elemento, distinte (M3: congelate al tocco).
      expect(new Set(elementi.map((e) => e.client_op_id)).size).toBe(2);
    });

    it("s.6.259: la coppia atomica viaggia come UNA sola richiesta", async () => {
      // SENTINEL_S6259_PIN_UNA_RICHIESTA
      // "un elemento = UNA richiesta API". Due upsertLog sequenziali
      // manderebbero la riga `ricalcolata` sul ramo /log/undo e la dose N+1
      // perderebbe il proprio ricalcolo (M1): e il finding #17 alla lettera.
      const COPPIA = [
        { farmaco_id: 1, data: "2026-07-23", dose_numero: 1, stato: "presa" },
        {
          farmaco_id: 1,
          data: "2026-07-24",
          dose_numero: 1,
          stato: "ricalcolata",
        },
      ];
      const api = makeApi();
      const local = makeLocal({
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce({
            id: 41,
            op: "presa",
            client_op_id: "targa-41",
            logs: COPPIA,
          })
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);

      await sync.upsertLogsBatch(COPPIA, "presa");

      expect(api.upsertLogsBatch).toHaveBeenCalledTimes(1);
      expect(api.upsertLog).not.toHaveBeenCalled();
      const [righe] = api.upsertLogsBatch.mock.calls[0];
      expect(righe).toHaveLength(2);
      // La targa e UNA per elemento e viaggia su entrambe le righe.
      expect(righe.every((r) => r.client_op_id === "targa-41")).toBe(true);
      expect(local.outboxRemove).toHaveBeenCalledWith(41);
    });

    // ========================================================
    // SENTINEL_QOCT_PIN_BLOCCO
    // Cancello temporale e drenaggio pubblico (CS-4.26, Spec 14.2).
    // ========================================================
    // The `onLine` stub is an OWN property shadowing the jsdom prototype
    // getter; `delete` in afterEach reveals the original again. A global
    // left dirty would break later suites by execution order, which is
    // the worst kind of failure to attribute.
    afterEach(() => {
      delete navigator.onLine;
      vi.restoreAllMocks();
    });

    function elementoRecente(id, attempts, quandoMs) {
      return {
        ...elementoTentato(id, attempts),
        last_attempt_at: new Date(quandoMs).toISOString(),
      };
    }

    it("cancello: un elemento tentato da poco NON consuma il budget", async () => {
      // SENTINEL_QOCT_PIN_CANCELLO_SOPPRIME
      // Q-QSEPT-1=A. Il budget si spende per ELEMENTO, non per passata.
      // Senza cancello tre tocchi ravvicinati bruciano i tre tentativi in
      // pochi secondi e parcheggiano una presa VERA come
      // ERRORE_INTERNO_RIPETUTO, senza ritenta e senza superficie fino a
      // CS-5. La fila deve comunque PROSEGUIRE oltre lo elemento.
      const scritte = [{ id: 601, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValue(elementoRecente(91, 1, Date.now())),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxBumpAttempts).not.toHaveBeenCalled();
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(local.outboxRemove).not.toHaveBeenCalled();
      expect(local.outboxNextPendingAfter).toHaveBeenCalledWith(91);
    });

    it("cancello: un elemento tentato da tempo consuma il budget", async () => {
      // SENTINEL_QOCT_PIN_CANCELLO_APRE
      // Il verso opposto dello stesso cancello. Senza questo il pin
      // precedente sarebbe soddisfatto anche da un cancello sempre chiuso,
      // che non parcheggerebbe mai nulla e sarebbe M2 a sua volta.
      const scritte = [{ id: 602, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValue(elementoRecente(92, 1, Date.now() - 3600000)),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxBumpAttempts).toHaveBeenCalledWith(92, 2);
    });

    it("fail-safe: timestamp NULL procede, non sopprime", async () => {
      // SENTINEL_QOCT_PIN_FAILSAFE_TIMESTAMP
      // Sopprimere per assenza di informazione sarebbe M2: lo elemento
      // resterebbe pending per sempre, senza consumare budget e senza mai
      // parcheggiare, quindi invisibile alla persona fino a CS-5. Gli
      // elementi accodati prima di questa release non portano il campo.
      const scritte = [{ id: 603, ...LOGS[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue(new TypeError("boom")),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValue({ ...elementoTentato(93, 1), last_attempt_at: null }),
      });
      const sync = new SyncRepository(api, local);

      await expect(sync.upsertLogsBatch(LOGS, "presa")).resolves.toBe(scritte);
      expect(local.outboxBumpAttempts).toHaveBeenCalledWith(93, 2);
    });

    it("drainOutbox: offline sopprime LA PASSATA senza toccare la coda", async () => {
      // SENTINEL_QOCT_PIN_ONLINE_FALSE
      // Q-QSEPT-4=A / s.6.271. La soppressione vale per questa passata e
      // basta: nessun fermo persistente, nessun listener offline. La coda
      // resta intatta e il trigger successivo riprova.
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
      const local = makeLocal({
        outboxNextPending: vi.fn().mockResolvedValue(elemento(94)),
      });
      const sync = new SyncRepository(makeApi(), local);

      await expect(sync.drainOutbox()).resolves.toBe(0);
      expect(local.outboxNextPending).not.toHaveBeenCalled();
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("drainOutbox: la guardia impedisce due passate sovrapposte", async () => {
      // SENTINEL_QOCT_PIN_NON_SOVRAPPOSIZIONE
      // Q-QSEPT-3=A. Sei trigger possono cadere insieme; due passate
      // concorrenti leggerebbero la stessa testa e la consegnerebbero due
      // volte. La targa la fa deduplicare lato server, ma contarci sarebbe
      // affidarsi alla rete per un difetto locale.
      let sblocca;
      const attesa = new Promise((res) => {
        sblocca = res;
      });
      const local = makeLocal({
        outboxNextPending: vi.fn().mockImplementation(async () => {
          await attesa;
          return null;
        }),
      });
      const sync = new SyncRepository(makeApi(), local);

      const prima = sync.drainOutbox();
      const seconda = await sync.drainOutbox();

      expect(seconda).toBe(0);
      expect(local.outboxNextPending).toHaveBeenCalledTimes(1);
      sblocca();
      await expect(prima).resolves.toBe(0);
    });
  });

  // ========================================================
  // SENTINEL_QZANCA_PIN_BLOCCO
  // Il terzo stato: il fatto SENZA COLLEGAMENTO (CS-5.6-bis PARTE 2).
  // ========================================================
  // Q-ZANCA-8=A. Describe PROPRIO e non pin sparsi nei describe
  // esistenti: sette titoli direbbero meno di cio che il corpo misura,
  // e un titolo verde che dice il falso e M3 sulla suite. Precedente
  // stretto: Q-TIRANTE-7=A.
  describe("senza collegamento (latch ortogonale, Q-ZAGARA-1=A)", () => {
    // Lo stub di `onLine` e una proprieta PROPRIA che ombreggia il
    // getter del prototype di jsdom; il `delete` lo rivela di nuovo. Un
    // globale lasciato sporco romperebbe le suite successive per ORDINE
    // DI ESECUZIONE, che e il guasto peggiore da attribuire.
    afterEach(() => {
      delete navigator.onLine;
    });

    // INERTE di proposito: il valore di ritorno di upsertLogsBatch e
    // mockato, quindi queste righe non sono una sagoma e duplicarle non
    // e il rischio che Q-ZANCA-9=A evita per `elemento`.
    const RIGHE = [
      { farmaco_id: 1, data: "2026-07-24", dose_numero: 1, stato: "presa" },
    ];

    it("Z1 lo stato iniziale e null, che NON e false", () => {
      const sync = new SyncRepository(makeApi(), makeLocal());
      // `null` dice NON ANCORA MISURATO; `false` asserirebbe un
      // collegamento mai osservato (Q-OGIVA-6=A).
      expect(sync.isUnreachable()).toBeNull();
      expect(sync.isUnreachable()).not.toBe(false);
    });

    it("Z2 una lettura riuscita SPEGNE, e i tre siti ereditano la sede unica", async () => {
      const casi = [
        ["getFarmaci", () => []],
        ["getAllOrari", () => []],
        ["getLogByRange", () => []],
      ];
      for (const [nome] of casi) {
        const api = makeApi({
          [nome]: vi
            .fn()
            .mockRejectedValueOnce({ code: "DB_UNAVAILABLE" })
            .mockResolvedValue([]),
        });
        const local = makeLocal();
        const sync = new SyncRepository(api, local);
        await sync[nome]("2026-07-24", "2026-07-24");
        expect(sync.isUnreachable()).toBe(true);
        await sync[nome]("2026-07-24", "2026-07-24");
        expect(sync.isUnreachable()).toBe(false);
      }
    });

    it("Z3 il fallback DB_UNAVAILABLE ACCENDE, su tutti e tre i siti", async () => {
      for (const nome of ["getFarmaci", "getAllOrari", "getLogByRange"]) {
        const api = makeApi({
          [nome]: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
        });
        const local = makeLocal();
        const sync = new SyncRepository(api, local);
        await sync[nome]("2026-07-24", "2026-07-24");
        expect(sync.isUnreachable()).toBe(true);
      }
    });

    it("Z4 un codice DIVERSO spegne anche sulla lettura: il server ha risposto", async () => {
      const api = makeApi({
        getFarmaci: vi
          .fn()
          .mockRejectedValueOnce({ code: "DB_UNAVAILABLE" })
          .mockRejectedValue({ code: "UNAUTHORIZED" }),
      });
      const sync = new SyncRepository(api, makeLocal());
      await sync.getFarmaci();
      expect(sync.isUnreachable()).toBe(true);
      await expect(sync.getFarmaci()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      // Q-ZANCA-3=A: senza questo, un latch acceso resterebbe acceso
      // col telefono online, che e il rilievo R-2 sul percorso di
      // lettura invece che su quello di consegna.
      expect(sync.isUnreachable()).toBe(false);
    });

    it("Z5 un guasto Dexie NON tocca nulla: un throw senza code non e connettivita", async () => {
      const api = makeApi({
        getFarmaci: vi
          .fn()
          .mockRejectedValueOnce({ code: "DB_UNAVAILABLE" })
          .mockRejectedValue(new TypeError("dexie giu")),
      });
      const sync = new SyncRepository(api, makeLocal());
      await sync.getFarmaci();
      expect(sync.isUnreachable()).toBe(true);
      await expect(sync.getFarmaci()).rejects.toBeInstanceOf(TypeError);
      expect(sync.isUnreachable()).toBe(true);
    });

    it("Z6 una consegna che si FERMA accende, e la coda resta intatta", async () => {
      const scritte = [{ id: 601, ...RIGHE[0] }];
      const api = makeApi({
        upsertLog: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(61))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);
      await expect(sync.upsertLogsBatch(RIGHE, "presa")).resolves.toBe(scritte);
      expect(sync.isUnreachable()).toBe(true);
      expect(local.outboxPark).not.toHaveBeenCalled();
      expect(local.outboxRemove).not.toHaveBeenCalled();
    });

    it("Z7 un parcheggio per errore di business SPEGNE: il server ha risposto", async () => {
      const scritte = [{ id: 602, ...RIGHE[0] }];
      const api = makeApi({
        upsertLog: vi
          .fn()
          .mockRejectedValueOnce({ code: "DB_UNAVAILABLE" })
          .mockRejectedValue({ code: "GENERIC" }),
      });
      const local = makeLocal({
        upsertLogsBatch: vi.fn().mockResolvedValue(scritte),
        outboxNextPending: vi
          .fn()
          .mockResolvedValueOnce(elemento(62))
          .mockResolvedValueOnce(elemento(63))
          .mockResolvedValue(null),
      });
      const sync = new SyncRepository(api, local);
      await sync.upsertLogsBatch(RIGHE, "presa");
      expect(sync.isUnreachable()).toBe(true);
      await sync.drainOutbox();
      expect(sync.isUnreachable()).toBe(false);
      expect(local.outboxPark).toHaveBeenCalledWith(
        63,
        "ERRORE_NON_CLASSIFICATO"
      );
    });

    it("Z8 la soppressione per onLine false ACCENDE senza toccare la coda", async () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      const local = makeLocal({
        outboxNextPending: vi.fn().mockResolvedValue(elemento(64)),
      });
      const sync = new SyncRepository(makeApi(), local);
      expect(await sync.drainOutbox()).toBe(0);
      expect(sync.isUnreachable()).toBe(true);
      expect(local.outboxNextPending).not.toHaveBeenCalled();
    });

    it("Z9 CONTROLLO NEGATIVO: onLine true da solo NON spegne", async () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      const api = makeApi({
        getFarmaci: vi.fn().mockRejectedValue({ code: "DB_UNAVAILABLE" }),
      });
      const sync = new SyncRepository(api, makeLocal());
      await sync.getFarmaci();
      expect(sync.isUnreachable()).toBe(true);
      // Ruolo ASIMMETRICO (Q-ZAGARA-5=A): accendere si, spegnere mai.
      // La prova e la CONSEGNA, non lo indizio (AppContext.jsx :194).
      expect(await sync.drainOutbox()).toBe(0);
      expect(sync.isUnreachable()).toBe(true);
    });
  });
});
