// ============================================================
// SyncRepository -- decisione 2: lo avviso "due dosi molto vicine" sul 2xx.
//
// Il server registra la presa SEMPRE e, quando e sotto lo intervallo minimo
// da un altra presa dello stesso farmaco, lo dice nel corpo del 201
// (`avviso`, minuti reali). Qui si pinna cio che il guardiano ne fa:
//   - la nota durevole e scritta PRIMA del drop, con motivo INTERVALLO_MINIMO,
//     i numeri del server e la ORA DELLA PRESA (non del tocco);
//   - senza avviso nessuna nota, drop normale;
//   - sulla coppia atomica lo avviso viaggia sul primo elemento;
//   - se la nota non si scrive lo elemento RESTA in coda, ne drop ne
//     parcheggio: alla riconsegna il server risponde dedup con lo avviso;
//   - un avviso che non e un oggetto viene ignorato.
//
// Harness TRASCRITTO da SyncRepository.specchio.test.js (a sua volta da
// SyncRepository.test.js :33-89): stessi campi, stesse firme.
// SENTINEL_D2_AVVISO_SUITE
// ============================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncRepository } from "./SyncRepository.js";
import { elencaAvvisi, MOTIVI_AVVISO } from "./avvisiStore.js";

function makeApi(overrides = {}) {
  return {
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    getLogByRange: vi.fn().mockResolvedValue([]),
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
    withTransaction: vi.fn(async (mode, storeNames, fn) => fn()),
    upsertLogsBatch: vi.fn().mockResolvedValue([]),
    outboxEnqueue: vi.fn().mockResolvedValue(undefined),
    outboxNextPending: vi.fn().mockResolvedValue(null),
    outboxNextPendingAfter: vi.fn().mockResolvedValue(null),
    outboxRemove: vi.fn().mockResolvedValue(undefined),
    outboxPark: vi.fn().mockResolvedValue(undefined),
    outboxBumpAttempts: vi.fn().mockResolvedValue(1),
    // FAIL-CLOSED come nella suite madre: farmaco ignoto -> la nota non si
    // scrive, e la fase che lo dimentica NON droppa.
    getFarmaco: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const AVVISO = Object.freeze({
  codice: "PRESA_SOTTO_INTERVALLO_MINIMO",
  lato: "precedente",
  minuti_dalla_vicina: 60,
  intervallo_minimo_minuti: 240,
  ora_effettiva_vicina: "2026-07-24T09:00:00",
});

const RIGA_PRESA = Object.freeze({
  farmaco_id: 1,
  data: "2026-07-24",
  dose_numero: 2,
  stato: "presa",
  ora_effettiva: "2026-07-24T10:00:00",
});

const RIGA_RICALCOLATA = Object.freeze({
  farmaco_id: 1,
  data: "2026-07-24",
  dose_numero: 3,
  stato: "ricalcolata",
  ora_ricalcolata: "2026-07-24T18:00",
});

const FARMACO = Object.freeze({ id: 1, nome: "Cardioaspirina" });

function elemento(id, logs, op = "presa") {
  const primary = logs[0];
  return {
    id,
    stato: "pending",
    op,
    client_op_id: "targa-" + id,
    logs,
    farmaco_id: primary.farmaco_id,
    data: primary.data,
    dose_numero: primary.dose_numero,
    created_at: "2026-07-24T13:05:00.000Z",
    attempts: 0,
    parked_reason: null,
    parked_at: null,
  };
}

function unSoloElemento(el) {
  return vi.fn().mockResolvedValueOnce(el).mockResolvedValue(null);
}

const rispostaPresa = (extra = {}) => ({
  id: 5,
  farmaco_id: 1,
  data: "2026-07-24",
  dose_numero: 2,
  stato: "presa",
  dedup: false,
  avviso: null,
  ricalcolo: null,
  ...extra,
});

describe("D2 -- avviso intervallo minimo sul 2xx", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("A1 consegna con avviso: nota scritta PRIMA del drop, motivo INTERVALLO_MINIMO, numeri del server e ora della PRESA", async () => {
    let avvisiAlDrop = -1;
    const api = makeApi({
      upsertLog: vi.fn().mockResolvedValue(rispostaPresa({ avviso: AVVISO })),
    });
    const local = makeLocal({
      getFarmaco: vi.fn().mockResolvedValue(FARMACO),
      outboxNextPending: unSoloElemento(elemento(81, [RIGA_PRESA])),
      outboxRemove: vi.fn(async () => {
        avvisiAlDrop = elencaAvvisi().length;
      }),
    });
    const sync = new SyncRepository(api, local);

    const consegnati = await sync.drainOutbox();

    expect(consegnati).toBe(1);
    expect(local.outboxRemove).toHaveBeenCalledWith(81);
    expect(local.outboxPark).not.toHaveBeenCalled();
    // ORDINE: al momento del drop la nota era gia li.
    expect(avvisiAlDrop).toBe(1);
    const [rec] = elencaAvvisi();
    expect(rec.motivo).toBe(MOTIVI_AVVISO.INTERVALLO_MINIMO);
    expect(rec.client_op_id).toBe("targa-81");
    expect(rec.farmaco_nome).toBe("Cardioaspirina");
    expect(rec.dose_numero).toBe(2);
    expect(rec.data).toBe("2026-07-24");
    expect(rec.ora_tocco).toBe("2026-07-24T13:05:00.000Z");
    expect(rec.dettagli).toEqual({
      lato: "precedente",
      minuti_dalla_vicina: 60,
      intervallo_minimo_minuti: 240,
      ora_effettiva: "2026-07-24T10:00:00",
      ora_effettiva_vicina: "2026-07-24T09:00:00",
    });
    expect(sync.contaAvvisi()).toBe(1);
  });

  it("A2 consegna senza avviso: nessuna nota, drop normale", async () => {
    const api = makeApi({ upsertLog: vi.fn().mockResolvedValue(rispostaPresa()) });
    const local = makeLocal({
      getFarmaco: vi.fn().mockResolvedValue(FARMACO),
      outboxNextPending: unSoloElemento(elemento(82, [RIGA_PRESA])),
    });
    const sync = new SyncRepository(api, local);

    expect(await sync.drainOutbox()).toBe(1);
    expect(local.outboxRemove).toHaveBeenCalledWith(82);
    expect(elencaAvvisi()).toEqual([]);
    expect(local.getFarmaco).not.toHaveBeenCalled();
  });

  it("A3 coppia atomica: lo avviso viaggia sul PRIMO elemento della risposta batch", async () => {
    const api = makeApi({
      upsertLogsBatch: vi
        .fn()
        .mockResolvedValue([rispostaPresa({ avviso: AVVISO, ricalcolo: "applicato" }), { ...RIGA_RICALCOLATA }]),
    });
    const local = makeLocal({
      getFarmaco: vi.fn().mockResolvedValue(FARMACO),
      outboxNextPending: unSoloElemento(elemento(83, [RIGA_PRESA, RIGA_RICALCOLATA])),
    });
    const sync = new SyncRepository(api, local);

    expect(await sync.drainOutbox()).toBe(1);
    expect(api.upsertLogsBatch).toHaveBeenCalledTimes(1);
    expect(api.upsertLog).not.toHaveBeenCalled();
    expect(local.outboxRemove).toHaveBeenCalledWith(83);
    const [rec] = elencaAvvisi();
    expect(rec.motivo).toBe(MOTIVI_AVVISO.INTERVALLO_MINIMO);
    expect(rec.dettagli.ora_effettiva).toBe("2026-07-24T10:00:00");
  });

  it("A4 nota non scrivibile (farmaco ignoto nello specchio): lo elemento RESTA in coda, ne drop ne parcheggio ne tentativo speso", async () => {
    const api = makeApi({
      upsertLog: vi.fn().mockResolvedValue(rispostaPresa({ avviso: AVVISO })),
    });
    const local = makeLocal({
      outboxNextPending: unSoloElemento(elemento(84, [RIGA_PRESA])),
    });
    const sync = new SyncRepository(api, local);

    expect(await sync.drainOutbox()).toBe(0);
    expect(local.outboxRemove).not.toHaveBeenCalled();
    expect(local.outboxPark).not.toHaveBeenCalled();
    expect(local.outboxBumpAttempts).not.toHaveBeenCalled();
    expect(elencaAvvisi()).toEqual([]);
    // La passata avanza OLTRE lo elemento invece di fermarsi dietro di lui.
    expect(local.outboxNextPendingAfter).toHaveBeenCalledWith(84);
  });

  it("A5 avviso che non e un oggetto: ignorato, drop normale", async () => {
    const api = makeApi({
      upsertLog: vi.fn().mockResolvedValue(rispostaPresa({ avviso: "PRESA_SOTTO_INTERVALLO_MINIMO" })),
    });
    const local = makeLocal({
      getFarmaco: vi.fn().mockResolvedValue(FARMACO),
      outboxNextPending: unSoloElemento(elemento(85, [RIGA_PRESA])),
    });
    const sync = new SyncRepository(api, local);

    expect(await sync.drainOutbox()).toBe(1);
    expect(local.outboxRemove).toHaveBeenCalledWith(85);
    expect(elencaAvvisi()).toEqual([]);
  });

  it("A6 un verbo diverso dalla presa con un avviso nel corpo scrive comunque la nota, senza ora della presa", async () => {
    // Il server lo emette solo su /presa; se un giorno lo emettesse altrove
    // il guardiano non deve tacere: nota degradabile, mai perdita.
    const rigaSaltata = { farmaco_id: 1, data: "2026-07-24", dose_numero: 2, stato: "saltata" };
    const api = makeApi({
      upsertLog: vi.fn().mockResolvedValue({ id: 6, stato: "saltata", avviso: AVVISO }),
    });
    const local = makeLocal({
      getFarmaco: vi.fn().mockResolvedValue(FARMACO),
      outboxNextPending: unSoloElemento(elemento(86, [rigaSaltata], "salta")),
    });
    const sync = new SyncRepository(api, local);

    expect(await sync.drainOutbox()).toBe(1);
    const [rec] = elencaAvvisi();
    expect(rec.motivo).toBe(MOTIVI_AVVISO.INTERVALLO_MINIMO);
    expect(rec.dettagli.ora_effettiva).toBeNull();
  });
});
