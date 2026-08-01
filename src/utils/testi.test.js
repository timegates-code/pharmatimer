// CS-5.3-bis -- suite of the shared copy module (s.6.272).
//
// The suite is written to DISCRIMINATE, not to be green: every phrase constant
// is pinned against the clinical clauses that produced it, so a future edit
// that quietly breaks one of them turns this file red instead of shipping.
//
// SENTINEL_S6272_TESTI_SUITE

import { describe, it, expect } from 'vitest';
import {
  testoAvvisoConflitto,
  AVVISO_CONFLITTO_TITOLO,
  AVVISO_CONFLITTO_SPIEGAZIONE,
  AVVISO_CONFLITTO_CHIUSURA,
  AVVISO_CONFLITTO_AZIONE,
  testoIndicatoreCoda,
  STATI_CODA,
} from './testi.js';

const FATTI = Object.freeze({
  farmacoNome: 'Cardioaspirina',
  doseNumero: 2,
  dataLabel: 'venerdì 24 luglio',
  oraLabel: '13:05',
});

describe('testi -- avviso presa in conflitto (Q-PONTE-7=A, Q-LETTO-8=A)', () => {
  it('T1 compone le quattro righe piu il bottone, coi fatti interpolati', () => {
    const t = testoAvvisoConflitto(FATTI);
    expect(t).not.toBeNull();
    expect(t.titolo).toBe(AVVISO_CONFLITTO_TITOLO);
    expect(t.spiegazione).toBe(AVVISO_CONFLITTO_SPIEGAZIONE);
    expect(t.chiusura).toBe(AVVISO_CONFLITTO_CHIUSURA);
    expect(t.azione).toBe(AVVISO_CONFLITTO_AZIONE);
    expect(t.fatti).toBe(
      'Cardioaspirina, dose 2 del venerdì 24 luglio. Avevi registrato alle 13:05.',
    );
  });

  it('T2 il bottone e esattamente "Ho letto": nessuna azione dentro la scheda', () => {
    expect(AVVISO_CONFLITTO_AZIONE).toBe('Ho letto');
  });

  it('T3 M3 -- afferma il GESTO della persona, mai lo esito della dose', () => {
    const t = testoAvvisoConflitto(FATTI);
    // La forma che tiene M3 in piedi: "Avevi registrato" e un fatto della
    // persona. "Hai preso" o "non presa" sarebbero asserzioni sullo esito.
    expect(t.fatti).toContain('Avevi registrato alle');
    const tutto = [t.titolo, t.fatti, t.spiegazione, t.chiusura].join(' ');
    expect(tutto).not.toMatch(/non\s+(hai\s+)?pres[ao]/i);
    expect(tutto).not.toMatch(/dose\s+non\s+/i);
    // Cio che non e passato e la REGISTRAZIONE, e il testo lo dice.
    expect(tutto).toMatch(/registrazione/i);
  });

  it('T4 lessico 14.5 p.1 -- niente gergo tecnico in nessuna riga', () => {
    const t = testoAvvisoConflitto(FATTI);
    const tutto = [t.titolo, t.fatti, t.spiegazione, t.chiusura, t.azione].join(' ');
    for (const gergo of ['sync', 'queue', 'retry', 'coda', 'server', 'conflitt', 'errore', '409']) {
      expect(tutto.toLowerCase()).not.toContain(gergo);
    }
  });

  it('T5 14.5 p.7 -- dichiara che alla persona non tocca niente', () => {
    const t = testoAvvisoConflitto(FATTI);
    expect(t.chiusura.toLowerCase()).toContain('non devi fare niente');
  });

  it.each([
    ['farmacoNome assente', { farmacoNome: undefined }],
    ['farmacoNome vuoto', { farmacoNome: '   ' }],
    ['dataLabel assente', { dataLabel: undefined }],
    ['dataLabel vuota', { dataLabel: '' }],
    ['oraLabel assente', { oraLabel: undefined }],
    ['oraLabel vuota', { oraLabel: '  ' }],
    ['doseNumero assente', { doseNumero: undefined }],
    ['doseNumero non intero', { doseNumero: 1.5 }],
    ['doseNumero zero', { doseNumero: 0 }],
    ['doseNumero stringa', { doseNumero: '2' }],
  ])('T6 ritorna null quando %s: mai una frase col buco', (_nome, patch) => {
    expect(testoAvvisoConflitto({ ...FATTI, ...patch })).toBeNull();
  });

  it('T7 argomento assente o non oggetto: null, non eccezione', () => {
    expect(testoAvvisoConflitto()).toBeNull();
    expect(testoAvvisoConflitto(null)).toBeNull();
    expect(testoAvvisoConflitto(undefined)).toBeNull();
  });

  it('T8 CONTROLLO POSITIVO -- coi fatti completi NON ritorna null', () => {
    // Senza questo, T6 sarebbe verde anche se la funzione ritornasse sempre
    // null: intercetterebbe senza isolare.
    expect(testoAvvisoConflitto(FATTI)).not.toBeNull();
  });
});

// ============================================================
// Indicatore di coda -- CS-5.5-ter, Spec 14.5.1 e s.6.274.
// SENTINEL_QOBLO_INDICATORE_SUITE
// ------------------------------------------------------------
// GUARDIA PROPRIA E NON EREDITATA. T4 qui sopra itera la lista del gergo
// su UNA sola frase, quella dello avviso di conflitto: le frasi dello
// indicatore NON sarebbero coperte da quel test, e crederle protette
// sarebbe un verde che non misura nulla. Misurato prima di scrivere
// questo blocco, e non dedotto dalla presenza di T4.
// ============================================================

const CASI_INDICATORE = [
  [STATI_CODA.QUIETE, undefined],
  [STATI_CODA.DA_INVIARE, 1],
  [STATI_CODA.DA_INVIARE, 4],
  [STATI_CODA.DA_CONTROLLARE, 1],
  [STATI_CODA.DA_CONTROLLARE, 3],
];

function tutteLeFrasi() {
  return CASI_INDICATORE.map(([stato, n]) => {
    const t = testoIndicatoreCoda({ stato, n });
    return [t.etichetta, t.rassicurazione ?? ''].join(' ');
  });
}

describe('testi -- indicatore di coda (Q-OBLO-1=A, Q-OBLO-4=A, Q-OBLO-5=A)', () => {
  it('I1 quiete: segno discreto, etichetta sola e nessuna seconda riga', () => {
    const t = testoIndicatoreCoda({ stato: STATI_CODA.QUIETE });
    expect(t).toEqual({ etichetta: 'Tutto inviato', rassicurazione: null });
  });

  it('I2 da inviare: etichetta esatta piu la rassicurazione di 14.5 p.7', () => {
    const t = testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 4 });
    expect(t.etichetta).toBe('Da inviare: 4 registrazioni');
    expect(t.rassicurazione).toBe(
      'Sono al sicuro sul telefono e si inviano da sole. Non devi fare niente.',
    );
  });

  it('I3 accordo di numero: uno solo non dice "1 registrazioni"', () => {
    const uno = testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 1 });
    expect(uno.etichetta).toBe('Da inviare: 1 registrazione');
    const tre = testoIndicatoreCoda({ stato: STATI_CODA.DA_CONTROLLARE, n: 3 });
    expect(tre.etichetta).toBe('Da controllare: 3 registrazioni');
  });

  it('I4 da controllare: dice che NON partono da sole, la sola differenza clinica', () => {
    const t = testoIndicatoreCoda({ stato: STATI_CODA.DA_CONTROLLARE, n: 1 });
    expect(t.etichetta).toBe('Da controllare: 1 registrazione');
    expect(t.rassicurazione).toBe(
      'Sono al sicuro sul telefono, ma non partono da sole. Non devi fare niente adesso.',
    );
  });

  it('I5 REFERENTE del conteggio (Q-OBLO-1=A): gli stati numerati nominano le registrazioni', () => {
    for (const stato of [STATI_CODA.DA_INVIARE, STATI_CODA.DA_CONTROLLARE]) {
      const t = testoIndicatoreCoda({ stato, n: 2 });
      expect(t.etichetta).toMatch(/\bregistrazioni\b/);
    }
    // Il numero NUDO e cio che questo pin esiste per impedire: senza il
    // referente, `N` si legge come dosi accanto ai sei badge di OggiView.
    const uno = testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 1 });
    expect(uno.etichetta).not.toBe('Da inviare: 1');
  });

  it('I6 lessico 14.5 p.1: niente gergo in NESSUNA frase dello indicatore', () => {
    for (const frase of tutteLeFrasi()) {
      for (const gergo of ['sync', 'queue', 'retry', 'coda', 'server', 'conflitt', 'errore', '409']) {
        expect(frase.toLowerCase()).not.toContain(gergo);
      }
    }
  });

  it('I7 CONTROLLO POSITIVO del meccanismo di I6: il raccoglitore non e vuoto', () => {
    // Senza questo, un raccoglitore rotto renderebbe I6 verde senza aver
    // letto una sola frase: intercetterebbe senza misurare.
    expect(tutteLeFrasi()).toHaveLength(5);
    expect('la coda di invio'.toLowerCase()).toContain('coda');
  });

  it('I8 nessun IMPERATIVO finche la porta non esiste (Q-LUCERNA-5=A)', () => {
    const imperativi = /\b(controlla|verifica|apri|tocca|premi|riprova|invia)\b/i;
    for (const frase of tutteLeFrasi()) {
      expect(frase).not.toMatch(imperativi);
    }
    // CONTROLLO POSITIVO NEI DUE VERSI: la regex TROVA un imperativo vero e
    // NON scatta su `Da controllare`, che e un sostantivo prescritto
    // verbatim da 14.5 p.1. Senza il secondo verso il pin sarebbe la voce
    // 84: contare il token invece di misurare il ruolo.
    expect('controlla la dose').toMatch(imperativi);
    expect('Da controllare: 2 registrazioni').not.toMatch(imperativi);
  });

  it('I9 M3: nessuna frase afferma che la dose non e stata presa', () => {
    for (const frase of tutteLeFrasi()) {
      expect(frase).not.toMatch(/non\s+(hai\s+)?pres[ao]/i);
      expect(frase).not.toMatch(/dose\s+non\s+/i);
    }
  });

  it('I10 null e mai una frase col buco: stato ignoto o conteggio impossibile', () => {
    expect(testoIndicatoreCoda({ stato: 'senza_collegamento', n: 1 })).toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 0 })).toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: -1 })).toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 1.5 })).toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: '2' })).toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE })).toBeNull();
    expect(testoIndicatoreCoda()).toBeNull();
    expect(testoIndicatoreCoda(null)).toBeNull();
  });

  it('I11 CONTROLLO POSITIVO -- coi valori buoni NON ritorna null', () => {
    // Senza questo, I10 sarebbe verde anche se la funzione ritornasse
    // sempre null: intercetterebbe senza isolare.
    expect(testoIndicatoreCoda({ stato: STATI_CODA.QUIETE })).not.toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_INVIARE, n: 1 })).not.toBeNull();
    expect(testoIndicatoreCoda({ stato: STATI_CODA.DA_CONTROLLARE, n: 1 })).not.toBeNull();
  });
});
