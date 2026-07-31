// @vitest-environment node
// ============================================================
// Rete anti-drift -- statuto NON-ESPOSTO delle superfici grezze.
// par.22.198-tretriginties / S2c-1 punto (l), Q-AUD-4=A.
// SENTINEL_S2C1_ANTIDRIFT_NONEXPOSED
// ------------------------------------------------------------
// AUDIT-PROTEZIONE-CROSS-PATH (duotriginties) ha MISURATO che tre
// letture grezze di registro -- getLogByData, getLogByFarmacoData,
// getLogByDataStato (percorsi P5/P6/P7) -- e i due forwarder di
// scrittura -- updateLog, deleteLog -- non sono esposti ad alcun
// consumatore di produzione: vivono dentro il data layer, in devCheck
// (inerte fuori DEV) e nei test.
//
// Su quella misura poggia una decisione: NON schermarli adesso
// (Q-AUD-4=A; via scartata = schermarli subito, lavoro su percorsi
// morti). La decisione resta valida SOLO finche la misura resta vera,
// e una misura non rimisurata invecchia in silenzio.
//
// Questo pin la rende gate-abile: se domani qualcuno cabla una di
// quelle superfici in un thunk o in un componente, il test rompe e
// obbliga a decidere la schermatura in QUEL momento, invece di
// scoprirlo per fortuna. Stesso principio del pin di non-rimozione di
// OUTBOX_OPS.
//
// Perimetro ESCLUSO e perche:
//   data/repository/**  il data layer DEFINISCE e inoltra: e la sede.
//   data/devCheck.js    strumento DEV, inerte fuori DEV per costruzione.
//   *.test.js|jsx       i test le esercitano di proposito.
// ============================================================

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Da src/data/repository/ risale a src/.
const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));

const SURFACES = [
  "getLogByData",
  "getLogByFarmacoData",
  "getLogByDataStato",
  "updateLog",
  "deleteLog",
];

function isExcluded(rel) {
  if (rel.includes("node_modules")) return true;
  if (rel.includes(".bak")) return true;
  if (/\.test\.jsx?$/.test(rel)) return true;
  if (rel.startsWith("data/repository/")) return true;
  if (rel === "data/devCheck.js") return true;
  return false;
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.jsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = walk(SRC_DIR).filter((f) => !isExcluded(relative(SRC_DIR, f)));

describe("rete anti-drift -- superfici grezze non esposte (Q-AUD-4)", () => {
  it("il perimetro scandito non e vuoto (guardia contro un verde vacuo)", () => {
    // Senza questa guardia, un walk che fallisse silenziosamente
    // renderebbe verdi tutte le asserzioni sotto senza aver letto nulla.
    expect(FILES.length).toBeGreaterThan(20);
  });

  for (const surface of SURFACES) {
    it("nessun consumatore di produzione chiama ." + surface + "()", () => {
      const re = new RegExp("\\." + surface + "\\s*\\(");
      const hits = [];
      for (const f of FILES) {
        if (re.test(readFileSync(f, "utf8"))) {
          hits.push(relative(SRC_DIR, f));
        }
      }
      expect(hits).toEqual([]);
    });
  }
});

// ============================================================
// Q-TIRANTE-7=A -- la PREMESSA di F-3, resa gate-abile.
// SENTINEL_QTIRANTE_PIN_OUTBOXRETRY
// ------------------------------------------------------------
// La benignita di F-3 -- il drain pubblico che offline ritorna 0 prima
// di `_drainOutbox`, mentre il write-path lo chiama a valle -- e stata
// MISURATA a par.22.198-septsexagies, e poggia INTERAMENTE su una
// premessa sola: `outboxRetry` non ha alcun chiamante di produzione,
// quindi oggi `parked` cambia SOLO dentro una passata.
//
// Spec 14.5.3 prescrive Riprova / Elimina. Il giorno in cui quei due
// gesti saranno cablati, `parked` cambiera FUORI da ogni passata e il
// raccoglitore di src/state/coda.js dovra essere chiamato anche da li,
// altrimenti il parcheggio resta muto in silenzio -- M2 -- e nessun
// test di oggi lo vedrebbe. Voce 220.
//
// NON si pinna un CONTEGGIO, che e il difetto dei 27 forwarder rimasti
// a 28 per due sessioni: si pinna la PREMESSA. Il pin nasce verde e
// morde esattamente nel momento in cui la premessa cade.
// ============================================================

describe("premessa di F-3 -- outboxRetry senza chiamanti di produzione", () => {
  it("il perimetro scandito non e vuoto (guardia contro un verde vacuo)", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it("controllo positivo: il meccanismo TROVA una chiamata che esiste", () => {
    // Senza questo, un walk o una regex rotti renderebbero verde
    // l'asserzione sotto senza aver letto nulla. `.upsertLogsBatch(` ha
    // un chiamante di produzione MISURATO, applyHelper.js :165, che e
    // esattamente la porta del write-path.
    const re = /\.upsertLogsBatch\s*\(/;
    const hits = FILES.filter((f) => re.test(readFileSync(f, "utf8")));
    expect(hits.length).toBeGreaterThan(0);
  });

  it("nessun consumatore di produzione chiama .outboxRetry()", () => {
    const re = /\.outboxRetry\s*\(/;
    const hits = FILES
      .filter((f) => re.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC_DIR, f));
    expect(hits).toEqual([]);
  });
});
