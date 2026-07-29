// ============================================================
// SyncRepository -- GUARDIA della Chiusura del giro.
// `chiusura-giro-condizionata`, CS-5.4-ter, par.22.198-tersexagies =
// `la-leva` (Q-LEVA-1=A).
// NATA SONDA DI MISURA a CS-5.4-bis come `specchio-dopo-drop`,
// par.22.198-bisexagies = `il-riflesso`, e passata a GUARDIA qui: lo stesso
// cambio di mestiere che `RecuperoModal.ricostruzione.test.jsx` ha fatto a
// unsexagies, e che questo file aveva dichiarato in anticipo come proprio
// precedente di forma.
// ============================================================
//
// NATURA. Questo file e una MISURA e non un pin. Risponde a UNA domanda
// mai posta a una sonda: dopo un drop per conflitto sul WRITE-PATH, la
// Chiusura del giro di Spec 14.3 :1115 avviene o no?
// Precedente di forma: `RecuperoModal.ricostruzione.test.jsx`, nata MISURA
// a quinquagies-quinquies e passata a GUARDIA a unsexagies quando la
// risposta fu nota. Se lo esito e A, questo file va invertito da chi
// ripara, esattamente come accadde a quello.
//
// I DUE ESITI, DICHIARATI PRIMA DI GIRARE (LC-106). Scritti qui e non
// nella chat, cosi il verdetto non si riscrive dopo averlo letto:
//
//   ESITO A -- G1 verde, G2 verde, G3 verde.
//     Dopo il drop nessuna rilettura segue: `_refreshTouchedWindow` non
//     viene chiamata perche `delivered` vale 0, e lo specchio conserva la
//     riga che il server ha RIFIUTATO. Il rilievo diventa DIFETTO e si
//     apre una riga successore di riparazione. Posta M1+M3.
//
//   ESITO B -- G1 verde, G2 ROSSA sullo assert di `getLogByRange`.
//     Il riallineamento avviene comunque, per una via che non passa dal
//     valore di `delivered`. La riga `specchio-dopo-drop` si chiude e la
//     clausola di 14.3 e gia soddisfatta per altra via.
//
//   NON DISCRIMINANTE -- G1 ROSSA. La sonda non misura nulla: se la
//     Chiusura del giro non avviene NEMMENO sulla consegna riuscita,
//     allora il verde di G2 e compatibile con entrambe le ipotesi ed e la
//     tautologia della voce 112. In quel caso la sonda va ridisegnata e
//     NESSUNA conclusione si trae. G1 esiste solo per questo.
//
// PERIMETRO (LC-105). Misura il solo WRITE-PATH, cioe `upsertLogsBatch`
// :217. NON misura il percorso da trigger, che e gia coperto dalla
// composizione di due pin verdi: `SENTINEL_S6273_PIN_DROP`
// (SyncRepository.test.js :491) fissa che una passata di solo drop
// restituisca 0, e `SENTINEL_QOCT_PIN_NO_REBUILD`
// (actions.drain.test.js :114-122) fissa che con 0 il thunk non riallinei.
// Quella e una COMPOSIZIONE di due misure attraverso un confine di mock,
// non una misura end-to-end, e va letta come tale.
//
// PERCHE UN FILE NUOVO (Q-RIFLESSO-1=A). `SyncRepository.test.js` e
// `actions.drain.test.js` sono suite di PIN: mescolare una misura ai pin
// renderebbe illeggibile quale delle due cose un rosso futuro sta dicendo.
//
// OSSERVABILE (Q-RIFLESSO-3=A). I mock del guardiano, non Dexie:
// `_refreshTouchedWindow` :573 chiama `this.getLogByRange`, che a sua
// volta chiama `_api.getLogByRange` e `_local.mirrorLogWindow`. Sono i due
// osservabili, ed e la stessa testimonianza gia usata da
// actions.drain.test.js :134. Nessuna dipendenza da `fake-indexeddb`.
//
// SENTINEL_QRIFLESSO_SONDA
// SENTINEL_QLEVA_GUARDIA
//
// ESITO MISURATO e RIPARATO. La misura di CS-5.4-bis ha dato ESITO A: la
// Chiusura del giro non avveniva. `Q-LEVA-1=A` la ha spostata DENTRO
// `_drainOutbox`, sede unica dei due chiamanti. Da qui:
//   G1 resta VERDE  -- la consegna riuscita rilegge, come prima. Il
//                      controllo positivo NON perde il suo mestiere.
//   G2 e INVERTITA  -- ora pretende la rilettura, e in piu ne pinna
//                      lORDINE via `letturaAlDrop`.
//   G3 resta VERDE  -- col parcheggio NON si rilegge, e da oggi questa
//                      fase e la guardia che prova che la riparazione e
//                      MIRATA: se qualcuno spingesse anche `parked`,
//                      G3 arrossa. Prima era solo un discriminante.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncRepository } from "./SyncRepository.js";
import { elencaAvvisi } from "./avvisiStore.js";

// Harness TRASCRITTO da SyncRepository.test.js :33-89. Trascrizione e non
// prova (LC-99): la fedelta e sui campi e sulle firme, verificate riga per
// riga contro quel file e contro IRepository.js.
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
    // Esegue il callback DAVVERO: un mock che lo ingoiasse renderebbe
    // VACUA ogni fase qui sotto, perche il tocco non verrebbe mai tentato.
    withTransaction: vi.fn(async (mode, storeNames, fn) => fn()),
    upsertLogsBatch: vi.fn().mockResolvedValue([]),
    outboxEnqueue: vi.fn().mockResolvedValue(undefined),
    outboxNextPending: vi.fn().mockResolvedValue(null),
    outboxNextPendingAfter: vi.fn().mockResolvedValue(null),
    outboxRemove: vi.fn().mockResolvedValue(undefined),
    outboxPark: vi.fn().mockResolvedValue(undefined),
    outboxBumpAttempts: vi.fn().mockResolvedValue(1),
    // FAIL-CLOSED di proposito, come nella suite madre: sotto un default
    // nullo una fase che droppa e dimentica di dichiarare il farmaco
    // PARCHEGGIA e arrossa, invece di droppare in silenzio.
    getFarmaco: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// COMPOSTA QUI e NON trascritta, e lo dichiaro (LC-99): della `LOGS`
// originale ho letto la sola ultima riga. Una sola riga `presa`, che e la
// forma minima capace di far scattare il discriminante di
// `_avvisaSuConflitto` :512-514.
const LOGS = [
  { farmaco_id: 1, data: "2026-07-24", dose_numero: 1, stato: "presa" },
];

const LOGS_SALTA = [
  { farmaco_id: 1, data: "2026-07-24", dose_numero: 1, stato: "saltata" },
];

// Sagoma TRASCRITTA da SyncRepository.test.js :345-367, a sua volta sagoma
// di outboxSplitter.makeElement :192-207 (undici campi piu lo `id` Dexie).
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

function unSoloElemento(el) {
  return vi.fn().mockResolvedValueOnce(el).mockResolvedValue(null);
}

describe("GUARDIA chiusura-giro-condizionata -- la Chiusura del giro dopo il drop", () => {
  beforeEach(() => {
    // avvisiStore vive in localStorage: senza questo G2 leggerebbe gli
    // avvisi di una fase precedente e il conteggio direbbe il falso.
    localStorage.clear();
  });

  it("G1 controllo positivo: con UNA consegna riuscita la finestra si rilegge", async () => {
    // SENTINEL_QRIFLESSO_G1_POSITIVO
    // Se questa fase e ROSSA la sonda NON discrimina e il verde di G2 non
    // significa niente (voce 112). Nessuna conclusione si trae in quel caso.
    const api = makeApi();
    const local = makeLocal({
      outboxNextPending: unSoloElemento(elemento(71)),
    });
    const sync = new SyncRepository(api, local);

    await sync.upsertLogsBatch(LOGS, "presa");

    // Premessa della fase: la consegna e davvero riuscita.
    expect(local.outboxRemove).toHaveBeenCalledWith(71);
    expect(local.outboxPark).not.toHaveBeenCalled();
    // La Chiusura del giro: `_refreshTouchedWindow` :217 -> getLogByRange.
    expect(api.getLogByRange).toHaveBeenCalled();
    expect(local.mirrorLogWindow).toHaveBeenCalled();
  });

  it("G2 il caso della riga: dopo il DROP per conflitto la finestra SI rilegge", async () => {
    // SENTINEL_QRIFLESSO_G2_DROP
    // La fase che risponde alla domanda. Verde = ESITO A. Rossa sullo
    // assert di getLogByRange = ESITO B.
    let letturaAlDrop = -1;
    const api = makeApi({
      upsertLog: vi.fn().mockRejectedValue({ code: "CONFLICT" }),
    });
    const local = makeLocal({
      getFarmaco: vi
        .fn()
        .mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
      outboxNextPending: unSoloElemento(elemento(72)),
      // Cattura dellORDINE, stessa forma di `avvisiAlDrop` in
      // SyncRepository.test.js :481: al momento del drop la rilettura NON
      // deve essere ancora avvenuta.
      outboxRemove: vi.fn(async () => {
        letturaAlDrop = api.getLogByRange.mock.calls.length;
      }),
    });
    const sync = new SyncRepository(api, local);

    await sync.upsertLogsBatch(LOGS, "presa");

    // Premesse della fase, dichiarate e verificate: il drop e AVVENUTO e
    // lo avviso e stato scritto. Senza queste il verde qui sotto sarebbe
    // compatibile con "non e successo niente".
    expect(local.outboxRemove).toHaveBeenCalledWith(72);
    expect(local.outboxPark).not.toHaveBeenCalled();
    expect(elencaAvvisi()).toHaveLength(1);

    // LA GUARDIA, attese INVERTITE da Q-LEVA-1=A. Prima della riparazione
    // queste due righe pretendevano `not.toHaveBeenCalled`, ed erano la
    // MISURA che ha aperto `chiusura-giro-condizionata`.
    expect(api.getLogByRange).toHaveBeenCalled();
    expect(local.mirrorLogWindow).toHaveBeenCalled();

    // LORDINE, e non basta che la rilettura avvenga. Finche lo elemento e
    // in coda le sue righe sono SCHERMATE da 14.4.4: una rilettura posta
    // PRIMA del drop restituirebbe la riga che lo scudo ha rifiutato, e non
    // correggerebbe nulla. Questo assert e la SOLA sede che lo intercetta.
    expect(letturaAlDrop).toBe(0);
  });

  it("G3 discriminante: col PARCHEGGIO la finestra non si rilegge per altra ragione", async () => {
    // SENTINEL_QRIFLESSO_G3_PARCHEGGIO
    // Separa "non riallinea perche droppato" da "non riallinea perche
    // parcheggiato". Senza questa fase i due mondi avrebbero la stessa
    // apparenza e G2 non isolerebbe la causa (LC-108).
    const api = makeApi({
      upsertLog: vi.fn().mockRejectedValue({ code: "CONFLICT" }),
    });
    const local = makeLocal({
      getFarmaco: vi
        .fn()
        .mockResolvedValue({ id: 1, nome: "Cardioaspirina" }),
      outboxNextPending: unSoloElemento(
        elemento(73, { op: "salta", riga: { stato: "saltata" } })
      ),
    });
    const sync = new SyncRepository(api, local);

    await sync.upsertLogsBatch(LOGS_SALTA, "salta");

    expect(local.outboxPark).toHaveBeenCalledWith(73, "CONFLITTO_VERO");
    expect(local.outboxRemove).not.toHaveBeenCalled();
    expect(elencaAvvisi()).toHaveLength(0);
    expect(api.getLogByRange).not.toHaveBeenCalled();
  });
});
