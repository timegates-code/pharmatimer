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
