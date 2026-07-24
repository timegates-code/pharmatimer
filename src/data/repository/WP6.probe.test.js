// @vitest-environment node
// ============================================================
// PIN WP6 -- collisione di CHIAVE PRIMARIA fra registro locale e
// payload server dentro mirrorLogWindow.
// SENTINEL_WP6_PROBE_PKCOLLISION
// ------------------------------------------------------------
// TEST PERMANENTE, promosso a par.198-sextriginties (Q-FIX-2=A)
// dalla sonda omonima conservata in ~/PharmaTimer_sonde/ (prova
// storica della misura, coi log di stdout originali). Le misure
// a, c, d erano ROSSE prima del fix e pinnano la schermatura
// nello spazio degli id (SENTINEL_WP6_FIX_ID_SHIELD in
// LocalRepository.js, ratifica Q-FIX-1=A).
//
// --- La domanda ---
// La regola di protezione (Spec 14.4.4, Q-AUD-2=A) e realizzata in
// `mirrorLogWindow` su CHIAVE DOSE: `farmaco_id|data|dose_numero`.
// Entrambi i rami la applicano:
//   toDelete  = in-finestra, farmaco attivo, chiave NON protetta
//   toPut     = righe server la cui chiave NON e protetta
// Ma la scrittura upsert opera su CHIAVE PRIMARIA `id`, che e un
// altro spazio.
//
// Due misure statiche acquisite a quinquies:
//   M-1  `log_assunzioni: "++id, ..."` in tutte e cinque le versioni
//        dello schema -> chiave primaria autoincrement.
//   M-2  `LocalRepository.upsertLogsBatch` SCARTA lo id in ingresso
//        (`const { id: _dropIncomingId, ...row } = log`) e ne fa
//        assegnare uno dal generatore locale.
// Quindi lo id di una riga scritta offline non ha alcuna relazione con
// lo id che il server dara alla stessa dose: due sequenze indipendenti
// sullo stesso intero.
//
// --- La posta clinica ---
// Una riga server NON protetta che porti lo id di un SUPERSTITE della
// riconciliazione (riga risparmiata da toDelete, o riga fuori dalla
// finestra) lo sovrascriverebbe dallo spazio degli id:
//   - il registro riporta, su quello id, i dati di un altra dose (M3);
//   - la card di una dose assunta puo tornare "da prendere" (M1);
//   - una presa parcheggiata puo sparire dal registro (M2).
// La schermatura pinnata qui ri-chiava le righe server collidenti in
// un intervallo libero calcolato (base = max degli id superstiti e in
// arrivo, piu uno): superstiti intatti, fotografia fedele (14.4.3).
//
// --- Cosa pinna questo file ---
// WP6-a  collisione di id su una dose DIVERSA e non protetta, contro
//        la riga congelata PROTETTA in finestra (misura di quinquies).
// WP6-b  CONTROLLO, stessa scena senza collisione di id. Discrimina
//        un difetto reale da un harness sbagliato: se WP6-b fallisse,
//        il difetto sarebbe nel harness, non nel codice.
// WP6-c  superstite in-finestra di farmaco INATTIVO (assente dal
//        payload server, quindi risparmiato da toDelete), id
//        collidente. Nessun outbox: la ragione del risparmio e la
//        inattivita, non la protezione.
// WP6-d  superstite FUORI finestra, congelato e PROTETTO da elemento
//        PARCHEGGIATO. protectedKeys lo copre per chiave ma non per
//        id, e inWindow non lo legge.
// ============================================================

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";
import { LocalRepository } from "./LocalRepository.js";

const repo = new LocalRepository();

const DA = "2026-07-05";
const AL = "2026-07-15";
const GIORNO = "2026-07-10";

function makeElement(client_op_id, logs) {
  const primary = logs[0];
  return {
    stato: "pending",
    op: "presa",
    client_op_id,
    logs,
    farmaco_id: primary.farmaco_id,
    data: primary.data,
    dose_numero: primary.dose_numero,
    created_at: new Date().toISOString(),
    attempts: 0,
    parked_reason: null,
    parked_at: null,
  };
}

// Scena comune: una PRESA congelata offline sulla dose 1, protetta da un
// elemento vivo in coda. Ritorna la riga locale come e stata scritta.
async function scenaCongelata() {
  const chiaveA = { farmaco_id: 1, data: GIORNO, dose_numero: 1 };
  const [rigaA] = await repo.upsertLogsBatch([
    { ...chiaveA, stato: "presa", ora_effettiva: GIORNO + "T09:00:00" },
  ]);
  await repo.outboxEnqueue([
    makeElement("uuid-wp6", [{ ...chiaveA, stato: "presa" }]),
  ]);
  const protette = await repo.outboxProtectedKeys();
  // Guardia contro un verde vacuo: senza protezione attiva il pin non
  // misurerebbe nulla.
  expect(protette.has("1|" + GIORNO + "|1")).toBe(true);
  return rigaA;
}

async function righeDellaDose(farmacoId, data, doseNumero) {
  const tutte = await db.log_assunzioni.toArray();
  return tutte.filter(
    (r) =>
      r.farmaco_id === farmacoId &&
      r.data === data &&
      r.dose_numero === doseNumero
  );
}

beforeEach(async () => {
  if (!db.isOpen()) {
    await db.open();
  }
  await db.transaction(
    "rw",
    db.farmaci,
    db.orari_base,
    db.log_assunzioni,
    db.impostazioni_app,
    db.profilo_utente,
    db.outbox,
    async () => {
      await db.farmaci.clear();
      await db.orari_base.clear();
      await db.log_assunzioni.clear();
      await db.impostazioni_app.clear();
      await db.profilo_utente.clear();
      await db.outbox.clear();
    }
  );
});

describe("PIN WP6 -- chiave dose contro chiave primaria", () => {
  it("WP6-a: riga server non protetta con id COLLIDENTE su dose diversa", async () => {
    const rigaA = await scenaCongelata();

    // Riga server di un ALTRA dose (dose_numero 2), chiave dose NON
    // protetta, ma stesso `id` della riga congelata.
    const server = [
      {
        id: rigaA.id,
        farmaco_id: 1,
        data: GIORNO,
        dose_numero: 2,
        stato: "prevista",
      },
    ];
    await repo.mirrorLogWindow(server, DA, AL);

    const dellaDoseA = await righeDellaDose(1, GIORNO, 1);

    // Invariante clinico: la riga congelata sopravvive, in cardinalita
    // uno, e conserva il valore congelato al tocco.
    expect(dellaDoseA).toHaveLength(1);
    expect(dellaDoseA[0].stato).toBe("presa");
  });

  it("WP6-b: CONTROLLO -- stessa scena, id NON collidente", async () => {
    const rigaA = await scenaCongelata();

    const server = [
      {
        id: rigaA.id + 1000,
        farmaco_id: 1,
        data: GIORNO,
        dose_numero: 2,
        stato: "prevista",
      },
    ];
    await repo.mirrorLogWindow(server, DA, AL);

    const dellaDoseA = await righeDellaDose(1, GIORNO, 1);
    const dellaDoseB = await righeDellaDose(1, GIORNO, 2);

    // La riga congelata sopravvive.
    expect(dellaDoseA).toHaveLength(1);
    expect(dellaDoseA[0].stato).toBe("presa");
    // E il mirror ha davvero operato: senza questa asserzione un verde
    // potrebbe venire da un mirror che non ha scritto nulla.
    expect(dellaDoseB).toHaveLength(1);
  });

  it("WP6-c: superstite in-finestra di farmaco INATTIVO, id collidente", async () => {
    // Riga storica di un farmaco NON presente nel payload server (in
    // produzione: farmaco disattivato). toDelete la risparmia perche
    // 99 non sta in serverFarmIds. Nessun elemento in outbox: qui la
    // ragione del risparmio e la inattivita, non la protezione.
    const idStorico = await db.log_assunzioni.add({
      farmaco_id: 99,
      data: GIORNO,
      dose_numero: 1,
      stato: "presa",
      ora_effettiva: GIORNO + "T08:00:00",
    });

    // Riga server del farmaco ATTIVO 1, chiave dose libera, stesso id.
    const server = [
      {
        id: idStorico,
        farmaco_id: 1,
        data: GIORNO,
        dose_numero: 1,
        stato: "prevista",
      },
    ];
    await repo.mirrorLogWindow(server, DA, AL);

    // Invariante: la riga storica del farmaco inattivo sopravvive
    // intatta, in cardinalita uno...
    const storica = await righeDellaDose(99, GIORNO, 1);
    expect(storica).toHaveLength(1);
    expect(storica[0].stato).toBe("presa");
    // ...e la fotografia resta fedele: la riga server del farmaco
    // attivo e presente (Spec 14.4.3).
    const attiva = await righeDellaDose(1, GIORNO, 1);
    expect(attiva).toHaveLength(1);
  });

  it("WP6-d: superstite FUORI finestra, congelato e PARCHEGGIATO, id collidente", async () => {
    const FUORI = "2026-07-01";
    const chiave = { farmaco_id: 1, data: FUORI, dose_numero: 1 };
    const [rigaFuori] = await repo.upsertLogsBatch([
      { ...chiave, stato: "presa", ora_effettiva: FUORI + "T09:00:00" },
    ]);
    const ids = await repo.outboxEnqueue([
      makeElement("uuid-wp6-d", [{ ...chiave, stato: "presa" }]),
    ]);
    // Parcheggio con letterale del vocabolario PARK_REASONS: e il caso
    // clinico a esposizione indefinita (s.6.266).
    await repo.outboxPark(ids[0], "CONFLITTO_O_RICHIESTA_ROTTA");
    const protette = await repo.outboxProtectedKeys();
    // Guardia contro un verde vacuo: la protezione via parcheggio deve
    // essere attiva sulla chiave fuori finestra.
    expect(protette.has("1|" + FUORI + "|1")).toBe(true);

    // Riga server IN finestra di un altra dose, chiave dose libera,
    // stesso id della congelata fuori finestra. inWindow non legge la
    // congelata (data fuori intervallo), quindi toDelete non la tocca;
    // solo lo spazio degli id potrebbe raggiungerla.
    const server = [
      {
        id: rigaFuori.id,
        farmaco_id: 1,
        data: GIORNO,
        dose_numero: 2,
        stato: "prevista",
      },
    ];
    await repo.mirrorLogWindow(server, DA, AL);

    // Invariante clinico: la presa parcheggiata sopravvive col valore
    // congelato al tocco (M2, M3)...
    const congelata = await righeDellaDose(1, FUORI, 1);
    expect(congelata).toHaveLength(1);
    expect(congelata[0].stato).toBe("presa");
    expect(congelata[0].ora_effettiva).toBe(FUORI + "T09:00:00");
    // ...e la fotografia in finestra resta fedele (Spec 14.4.3).
    const inFinestra = await righeDellaDose(1, GIORNO, 2);
    expect(inFinestra).toHaveLength(1);
  });
});
