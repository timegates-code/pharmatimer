// @vitest-environment node
//
// CS-5.3-bis parte 2 -- suite of the junction and its two formatters (P-2).
//
// The suite is written to DISCRIMINATE. Every clause that Q-TRAMA-2..5=A
// ratified has a test that turns red when the clause is broken, and the two
// branches of the junction have a positive control each, so a function that
// always degraded -- or never did -- could not pass.
//
// TIMEZONE INDEPENDENCE IS DELIBERATE. `ora_tocco` is written as
// `new Date().toISOString()`, that is UTC, and read back as local time,
// which is the correct round-trip for a tap. Asserting '13:05' against a
// hard-coded 'Z' string would only hold in UTC and would go red on the
// pilot's machine. Every clock assertion therefore either builds the instant
// from a LOCAL Date and reads it back locally, or uses an ISO string with no
// zone, which JS parses as local. Both are stable under any TZ.
//
// SENTINEL_QTRAMA_SCHEDA_SUITE

import { describe, it, expect } from 'vitest';
import {
  formatDataAvviso,
  formatOraAvviso,
  componiScheda,
  ESITI_SCHEDA,
} from './avvisoScheda.js';
import {
  AVVISO_CONFLITTO_TITOLO,
  AVVISO_CONFLITTO_SPIEGAZIONE,
  AVVISO_CONFLITTO_CHIUSURA,
  AVVISO_CONFLITTO_AZIONE,
  AVVISO_CONFLITTO_FATTI_ASSENTI,
  AVVISO_CONFLITTO_CHIUSURA_ASSENTI,
} from './testi.js';
import { MOTIVO_INTERVALLO_MINIMO, formatDurataAvviso } from './avvisoScheda.js';
import { MOTIVI_AVVISO } from '../data/repository/avvisiStore.js';
import {
  AVVISO_INTERVALLO_TITOLO,
  AVVISO_INTERVALLO_CHIUSURA,
  AVVISO_INTERVALLO_SPIEGAZIONE_ASSENTE,
} from './testi.js';

/** A record in the shape `avvisiStore.salvaAvviso` persists. */
const RECORD = Object.freeze({
  client_op_id: '11111111-2222-4333-8444-555555555555',
  farmaco_nome: 'Cardioaspirina',
  dose_numero: 2,
  data: '2026-07-24',
  ora_tocco: '2026-07-24T13:05:00',
  op: 'assunzione',
  motivo: 'CONFLITTO',
});

describe('formatDataAvviso -- etichetta assoluta (Q-TRAMA-2=A, emendata)', () => {
  it('D1 rende giorno, mese e anno in italiano', () => {
    expect(formatDataAvviso('2026-07-24')).toBe('24 luglio 2026');
  });

  it('D2 lo anno ci deve essere: lo avviso non scade mai', () => {
    // 14.5 p.4 e Q-LETTO-4=A: nessuna scadenza, quindi la scheda puo essere
    // letta dopo un capodanno e una data senza anno sarebbe ambigua (M3).
    expect(formatDataAvviso('2026-07-24')).toContain('2026');
  });

  it('D3 NIENTE giorno della settimana: dopo "del" direbbe una abitudine', () => {
    // Il 24 luglio 2026 e un venerdi: se il giorno tornasse, questo arrossa.
    expect(formatDataAvviso('2026-07-24')).not.toMatch(
      /luned|marted|mercoled|gioved|venerd|sabato|domenica/i,
    );
  });

  it('D4 NIENTE separatore del formato relativo', () => {
    const s = formatDataAvviso('2026-07-24');
    expect(s).not.toContain('\u00b7');
    expect(s.toLowerCase()).not.toContain('oggi');
    expect(s.toLowerCase()).not.toContain('domani');
  });

  it('D5 data inesistente: null, non una data rotolata al mese dopo', () => {
    // JS porta 2026-02-30 al 2 marzo. Nominare un giorno che la persona non
    // ha toccato sarebbe M3 sulla superficie.
    expect(formatDataAvviso('2026-02-30')).toBeNull();
    expect(formatDataAvviso('2026-13-01')).toBeNull();
    expect(formatDataAvviso('2026-00-10')).toBeNull();
  });

  it.each([
    ['formato con barre', '24/07/2026'],
    ['mese e giorno non imbottiti', '2026-7-4'],
    ['istante invece di giorno', '2026-07-24T13:05:00'],
    ['stringa vuota', ''],
    ['soli spazi', '   '],
    ['null', null],
    ['undefined', undefined],
    ['numero', 20260724],
    ['oggetto', {}],
  ])('D6 ritorna null quando lo ingresso e %s', (_n, v) => {
    expect(formatDataAvviso(v)).toBeNull();
  });

  it('D7 CONTROLLO POSITIVO -- su ingresso buono NON ritorna null', () => {
    expect(formatDataAvviso('2026-07-24')).not.toBeNull();
  });
});

describe('formatOraAvviso -- orario del TOCCO (M3)', () => {
  it('O1 rende HH:MM leggendo lo istante in locale', () => {
    const locale = new Date(2026, 6, 24, 13, 5, 0);
    expect(formatOraAvviso(locale.toISOString())).toBe('13:05');
  });

  it('O2 imbottisce ore e minuti a due cifre', () => {
    const locale = new Date(2026, 0, 5, 9, 5, 0);
    expect(formatOraAvviso(locale.toISOString())).toBe('09:05');
  });

  it('O3 accetta lo ISO senza fuso e lo legge come locale', () => {
    expect(formatOraAvviso('2026-07-24T13:05:00')).toBe('13:05');
    expect(formatOraAvviso('2026-12-31T23:59:59')).toBe('23:59');
  });

  it('O4 giorno senza orario: null, MAI mezzanotte', () => {
    // Rendere 00:00 per un tocco che nessuno ha fatto a mezzanotte sarebbe
    // un orario falso sulla scheda, cioe M3.
    expect(formatOraAvviso('2026-07-24')).toBeNull();
  });

  it.each([
    ['stringa vuota', ''],
    ['soli spazi', '  '],
    ['testo', 'stamattina'],
    ['ora sola', '13:05'],
    ['null', null],
    ['undefined', undefined],
    ['numero', 1753362300000],
    ['oggetto', {}],
  ])('O5 ritorna null quando lo ingresso e %s', (_n, v) => {
    expect(formatOraAvviso(v)).toBeNull();
  });

  it('O6 su ingresso illeggibile NON ripiega sullo istante corrente', () => {
    // Il discriminante contro la mutazione "in caso di dubbio usa adesso":
    // un orario inventato sulla scheda e M3.
    for (const rotto of ['', 'stamattina', '2026-07-24', null]) {
      expect(formatOraAvviso(rotto)).toBeNull();
    }
  });

  it('O7 CONTROLLO POSITIVO -- su ingresso buono NON ritorna null', () => {
    expect(formatOraAvviso('2026-07-24T13:05:00')).not.toBeNull();
  });
});

describe('componiScheda -- la giunzione (Q-TRAMA-3=A, Q-TRAMA-4=A)', () => {
  it('G1 record completo: esito COMPLETA e le quattro righe piu il bottone', () => {
    const s = componiScheda(RECORD);
    expect(s.esito).toBe(ESITI_SCHEDA.COMPLETA);
    expect(s.testi.titolo).toBe(AVVISO_CONFLITTO_TITOLO);
    expect(s.testi.spiegazione).toBe(AVVISO_CONFLITTO_SPIEGAZIONE);
    expect(s.testi.chiusura).toBe(AVVISO_CONFLITTO_CHIUSURA);
    expect(s.testi.azione).toBe(AVVISO_CONFLITTO_AZIONE);
  });

  it('G2 la frase composta si legge in italiano dopo "del"', () => {
    // E la ragione per cui Q-TRAMA-2=A e stata emendata in sessione: con il
    // giorno della settimana la riga direbbe "dose 2 del venerdi 24 luglio",
    // che vale abitualmente e non in quel giorno.
    expect(componiScheda(RECORD).testi.fatti).toBe(
      'Cardioaspirina, dose 2 del 24 luglio 2026. Avevi registrato alle 13:05.',
    );
  });

  it('G3 traduce i nomi di campo fra le due sedi ratificate separatamente', () => {
    // avvisiStore scrive farmaco_nome/dose_numero, testi.js pretende
    // farmacoNome/doseNumero: la giunzione e esattamente questo.
    const s = componiScheda(RECORD);
    expect(s.testi.fatti).toContain('Cardioaspirina');
    expect(s.testi.fatti).toContain('dose 2');
  });

  it.each([
    ['data rotta', { data: '24/07/2026' }],
    ['data assente', { data: '' }],
    ['data inesistente', { data: '2026-02-30' }],
    ['ora_tocco rotta', { ora_tocco: 'stamattina' }],
    ['ora_tocco senza orario', { ora_tocco: '2026-07-24' }],
    ['farmaco_nome vuoto', { farmaco_nome: '   ' }],
    ['farmaco_nome assente', { farmaco_nome: undefined }],
    ['dose_numero non intero', { dose_numero: 1.5 }],
    ['dose_numero zero', { dose_numero: 0 }],
    ['dose_numero stringa', { dose_numero: '2' }],
  ])('G4 record con %s: esito DEGRADATA, mai null', (_n, patch) => {
    const s = componiScheda({ ...RECORD, ...patch });
    expect(s).not.toBeNull();
    expect(s.esito).toBe(ESITI_SCHEDA.DEGRADATA);
  });

  it('G5 la scheda degradata porta QUATTRO righe e lo STESSO bottone', () => {
    // Q-LETTO-8=A non e ne toccata ne emendata: cambiano due righe, non il
    // numero delle righe.
    const s = componiScheda({ ...RECORD, data: 'rotta' });
    expect(s.testi.titolo).toBe(AVVISO_CONFLITTO_TITOLO);
    expect(s.testi.fatti).toBe(AVVISO_CONFLITTO_FATTI_ASSENTI);
    expect(s.testi.spiegazione).toBe(AVVISO_CONFLITTO_SPIEGAZIONE);
    expect(s.testi.chiusura).toBe(AVVISO_CONFLITTO_CHIUSURA_ASSENTI);
    expect(s.testi.azione).toBe(AVVISO_CONFLITTO_AZIONE);
    expect(Object.keys(s.testi)).toHaveLength(5);
  });

  it('G6 la scheda degradata non mostra alcun fatto del record', () => {
    const s = componiScheda({ ...RECORD, ora_tocco: 'rotta' });
    const tutto = Object.values(s.testi).join(' ');
    expect(tutto).not.toContain('Cardioaspirina');
    expect(tutto).not.toContain('13:05');
  });

  it('G7 la scheda degradata non dice che la dose non e stata presa (M3)', () => {
    const tutto = Object.values(componiScheda(null).testi).join(' ');
    expect(tutto).toMatch(/registrazione/i);
    expect(tutto).not.toMatch(/non\s+(hai\s+)?pres[ao]/i);
    expect(tutto).not.toMatch(/dose\s+non\s+/i);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['stringa', 'boh'],
    ['numero', 7],
    ['array', []],
    ['oggetto vuoto', {}],
  ])('G8 ingresso %s: DEGRADATA senza lanciare, mai null', (_n, v) => {
    let s = null;
    expect(() => {
      s = componiScheda(v);
    }).not.toThrow();
    expect(s).not.toBeNull();
    expect(s.esito).toBe(ESITI_SCHEDA.DEGRADATA);
  });

  it('G9 CONTROLLO POSITIVO -- un record buono NON degrada', () => {
    // Senza questo, ogni prova di G4 e G8 sarebbe verde anche con una
    // funzione che degrada sempre: intercetterebbe senza isolare.
    expect(componiScheda(RECORD).esito).toBe(ESITI_SCHEDA.COMPLETA);
  });

  it('G10 lo esito e congelato e il vocabolario ha due valori', () => {
    expect(Object.isFrozen(componiScheda(RECORD))).toBe(true);
    expect(Object.isFrozen(ESITI_SCHEDA)).toBe(true);
    expect(Object.values(ESITI_SCHEDA)).toEqual(['completa', 'degradata']);
  });
});

// ============================================================
// Decisione 2 -- la scheda "due dosi molto vicine" (motivo INTERVALLO_MINIMO).
// ============================================================
describe('D2 -- scheda "due dosi molto vicine"', () => {
  const DETTAGLI = Object.freeze({
    lato: 'precedente',
    minuti_dalla_vicina: 60,
    intervallo_minimo_minuti: 240,
    ora_effettiva: '2026-07-24T10:00:00',
    ora_effettiva_vicina: '2026-07-24T09:00:00',
  });
  const RECORD_D2 = Object.freeze({ ...RECORD, motivo: 'INTERVALLO_MINIMO', dettagli: DETTAGLI });

  it('I1 il letterale della giunzione e lo stesso dello store: i due non possono divergere in silenzio', () => {
    expect(MOTIVO_INTERVALLO_MINIMO).toBe(MOTIVI_AVVISO.INTERVALLO_MINIMO);
  });

  it('I2 record completo -> COMPLETA, con la ora della PRESA e non del tocco', () => {
    const s = componiScheda(RECORD_D2);
    expect(s.esito).toBe(ESITI_SCHEDA.COMPLETA);
    expect(s.testi.titolo).toBe(AVVISO_INTERVALLO_TITOLO);
    expect(s.testi.fatti).toBe(
      'Cardioaspirina, dose 2 del 24 luglio 2026. Presa alle 10:00, 1h dopo la dose precedente.',
    );
    expect(s.testi.spiegazione).toBe('Per questo farmaco fra due dosi devono passare almeno 4h.');
    expect(s.testi.chiusura).toBe(AVVISO_INTERVALLO_CHIUSURA);
    expect(s.testi.azione).toBe('Ho letto');
    // Il tocco (13:05) NON compare: la ora e quella registrata della dose.
    expect(s.testi.fatti).not.toContain('13:05');
  });

  it('I3 lato successiva: la frase cambia verso e la durata e formattata', () => {
    const s = componiScheda({
      ...RECORD_D2,
      dettagli: { ...DETTAGLI, lato: 'successiva', minuti_dalla_vicina: 90 },
    });
    expect(s.esito).toBe(ESITI_SCHEDA.COMPLETA);
    expect(s.testi.fatti).toBe(
      'Cardioaspirina, dose 2 del 24 luglio 2026. Presa alle 10:00, 1h 30min prima della dose successiva.',
    );
  });

  it('I4 dettagli assenti o malformati -> DEGRADATA col titolo nuovo, mai la scheda del conflitto e mai null', () => {
    const casi = [
      { ...RECORD_D2, dettagli: undefined },
      { ...RECORD_D2, dettagli: 'x' },
      { ...RECORD_D2, dettagli: { ...DETTAGLI, lato: 'altrove' } },
      { ...RECORD_D2, dettagli: { ...DETTAGLI, minuti_dalla_vicina: -1 } },
      { ...RECORD_D2, dettagli: { ...DETTAGLI, intervallo_minimo_minuti: '240' } },
      { ...RECORD_D2, dettagli: { ...DETTAGLI, ora_effettiva: null } },
      { ...RECORD_D2, dettagli: { ...DETTAGLI, ora_effettiva: '2026-07-24' } },
    ];
    for (const record of casi) {
      const s = componiScheda(record);
      expect(s.esito).toBe(ESITI_SCHEDA.DEGRADATA);
      expect(s.testi.titolo).toBe(AVVISO_INTERVALLO_TITOLO);
      expect(s.testi.spiegazione).toBe(AVVISO_INTERVALLO_SPIEGAZIONE_ASSENTE);
      expect(s.testi.chiusura).toBe(AVVISO_INTERVALLO_CHIUSURA);
      expect(s.testi.azione).toBe('Ho letto');
    }
  });

  it('I5 formatDurataAvviso: interi non negativi, altrimenti null', () => {
    expect(formatDurataAvviso(0)).toBe('0 min');
    expect(formatDurataAvviso(45)).toBe('45 min');
    expect(formatDurataAvviso(60)).toBe('1h');
    expect(formatDurataAvviso(450)).toBe('7h 30min');
    for (const v of [-1, 1.5, '60', null, undefined, NaN]) {
      expect(formatDurataAvviso(v)).toBeNull();
    }
  });

  it('I6 il record del conflitto resta sulla propria scheda: il ramo nuovo non lo tocca', () => {
    const s = componiScheda(RECORD);
    expect(s.esito).toBe(ESITI_SCHEDA.COMPLETA);
    expect(s.testi.titolo).not.toBe(AVVISO_INTERVALLO_TITOLO);
  });
});
