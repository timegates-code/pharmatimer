// @vitest-environment node
// ============================================================
// The state of the reminder channel as the phone tells it (step 4 of the
// client). Decision 9 and its condition, decision 33 B (5 minutes), and
// Roberto's rule of 2026-10-01: "non attivi" when we know the reminders will
// not arrive, "non verificati" only when we do not know, "non aggiornati"
// when the server keeps the calendar it had. Every case in both directions:
// the field that turns it on, and the same reading with that field good is
// "attivi". Rows in the bench: battito-*, stato-*.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ESITI_STATO_CANALE as E,
  PERCHE_STATO_CANALE as P,
  SOGLIA_BATTITO_MS,
  trascorso,
  valutaCanale,
} from './statoCanale.js';

const DEV = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const ORA = Date.parse('2026-10-07T08:00:00Z');
const MINUTO = 60_000;

function risposta(campi = {}) {
  return {
    ora_server_ms: ORA,
    tolleranza_min: 20,
    canale: { attivo: true, motivo: null },
    pianificatore: { ultima_passata_ms: ORA - 30_000, eta_ms: 30_000, esito: 'ok', dettaglio: null },
    iscrizioni: [{ device_id: DEV, device_label: null, attiva: true, confermata_ms: ORA - MINUTO,
      disattivata_ms: null, motivo_disattivazione: null }],
    pubblicazione: { device_id: DEV, pubblicata_ms: ORA - 2 * MINUTO, orizzonte_fino_ms: ORA + 86_400_000,
      avviso_fine_ms: ORA + 80_000_000, avviso_fine_entro_ms: ORA + 81_200_000, voci: 9 },
    ultimi_invii: [],
    ultimi_avvisi_fine: [],
    ...campi,
  };
}

const lettura = (campiRisposta = {}, campi = {}) => ({
  risposta: risposta(campiRisposta), lettoMono: 1_000, lettoMs: ORA, deviceId: DEV, ...campi,
});

// The two clocks `ms` after the reading; `salto` moves the wall clock alone.
const adesso = (ms = 0, salto = 0) => ({ mono: 1_000 + ms, ms: ORA + ms + salto });

const valuta = (l, a = adesso(), pubblicazione = null) => valutaCanale({ lettura: l, adesso: a, pubblicazione });

describe('attivi', () => {
  it('canale acceso, passata ok e giovane, telefono iscritto: attivi, con l ora dell ultima passata', () => {
    expect(valuta(lettura())).toEqual({ esito: E.ATTIVI, perche: null, dalleMs: ORA - 30_000 });
  });
});

describe('la soglia del battito vecchio (decisione 33 B): 5 minuti', () => {
  it('cinque minuti meno un secondo di eta: attivi', () => {
    expect(SOGLIA_BATTITO_MS).toBe(5 * MINUTO);
    expect(valuta(lettura(), adesso(4 * MINUTO + 29_000)).esito).toBe(E.ATTIVI);
  });

  it('oltre la soglia: non verificati, dalle l ora dell ultima passata', () => {
    expect(valuta(lettura(), adesso(4 * MINUTO + 31_000))).toEqual({
      esito: E.NON_VERIFICATI, perche: P.BATTITO_VECCHIO, dalleMs: ORA - 30_000,
    });
  });

  it('l eta cresce col tempo passato sul telefono dopo la lettura', () => {
    const l = lettura({ pianificatore: { ultima_passata_ms: ORA, eta_ms: 0, esito: 'ok', dettaglio: null } });
    expect(valuta(l, adesso(4 * MINUTO)).esito).toBe(E.ATTIVI);
    expect(valuta(l, adesso(6 * MINUTO)).esito).toBe(E.NON_VERIFICATI);
  });
});

describe('il tempo trascorso: il maggiore dei due orologi', () => {
  it('un salto indietro della parete non ringiovanisce il battito', () => {
    expect(trascorso(lettura(), adesso(6 * MINUTO, -60 * MINUTO))).toBe(6 * MINUTO);
    expect(valuta(lettura(), adesso(6 * MINUTO, -60 * MINUTO)).esito).toBe(E.NON_VERIFICATI);
  });

  it('un salto avanti della parete lo invecchia', () => {
    expect(valuta(lettura(), adesso(MINUTO, 10 * MINUTO)).esito).toBe(E.NON_VERIFICATI);
  });

  it('orologi che non si leggono non danno un OK', () => {
    expect(valuta(lettura(), { mono: Number.NaN, ms: Number.NaN }).esito).toBe(E.NON_VERIFICATI);
  });
});

describe('non attivi: sappiamo che i promemoria non arriveranno', () => {
  it('canale spento sul server', () => {
    expect(valuta(lettura({ canale: { attivo: false, motivo: 'pem_non_configurato' } }))).toEqual({
      esito: E.NON_ATTIVI, perche: P.CANALE_SPENTO, dalleMs: null,
    });
  });

  it('passata mai partita', () => {
    expect(valuta(lettura({ pianificatore: null }))).toMatchObject({ esito: E.NON_ATTIVI, perche: P.PASSATA_MAI_PARTITA });
  });

  it('ultima passata con esito non ok', () => {
    const l = lettura({ pianificatore: { ultima_passata_ms: ORA, eta_ms: 0, esito: 'errore', dettaglio: 'boom' } });
    expect(valuta(l)).toMatchObject({ esito: E.NON_ATTIVI, perche: P.ESITO_PASSATA });
  });

  it('questo telefono non iscritto: assente, spento, o senza id', () => {
    expect(valuta(lettura({ iscrizioni: [] }))).toMatchObject({ esito: E.NON_ATTIVI, perche: P.NON_ISCRITTO });
    const spenta = [{ device_id: DEV, attiva: false }];
    expect(valuta(lettura({ iscrizioni: spenta }))).toMatchObject({ esito: E.NON_ATTIVI, perche: P.NON_ISCRITTO });
    expect(valuta(lettura({}, { deviceId: null }))).toMatchObject({ esito: E.NON_ATTIVI, perche: P.NON_ISCRITTO });
    const altro = [{ device_id: 'altro', attiva: true }];
    expect(valuta(lettura({ iscrizioni: altro }))).toMatchObject({ esito: E.NON_ATTIVI, perche: P.NON_ISCRITTO });
  });

  it('cio che sappiamo vince su cio che non sappiamo: canale spento e battito vecchio', () => {
    const l = lettura({ canale: { attivo: false, motivo: 'sub_assente' } });
    expect(valuta(l, adesso(30 * MINUTO)).esito).toBe(E.NON_ATTIVI);
  });
});

describe('non aggiornati: il server tiene il calendario di prima', () => {
  it('una pubblicazione fallita accende, con l ora dell ultima riuscita', () => {
    expect(valuta(lettura(), adesso(), { esito: 'non_pubblicata', motivo: 'pubblicazione' })).toEqual({
      esito: E.NON_AGGIORNATI, perche: P.PUBBLICAZIONE, dalleMs: ORA - 2 * MINUTO,
    });
  });

  it('una pubblicazione riuscita, o invariata, spegne', () => {
    expect(valuta(lettura(), adesso(), { esito: 'pubblicata' }).esito).toBe(E.ATTIVI);
    expect(valuta(lettura(), adesso(), { esito: 'invariata' }).esito).toBe(E.ATTIVI);
  });
});

describe('quando non si sa nulla', () => {
  it('nessuna lettura e nessuna fallita: niente da dire', () => {
    expect(valutaCanale({ lettura: null, adesso: adesso() })).toBeNull();
  });

  it('nessuna lettura riuscita e una fallita: non verificati, senza ora', () => {
    expect(valutaCanale({ lettura: null, letturaFallita: true, adesso: adesso() })).toEqual({
      esito: E.NON_VERIFICATI, perche: P.STATO_NON_LETTO, dalleMs: null,
    });
  });

  it('una lettura fallita dopo una riuscita: vale la riuscita, che invecchia', () => {
    const l = lettura();
    expect(valutaCanale({ lettura: l, letturaFallita: true, adesso: adesso(MINUTO) }).esito).toBe(E.ATTIVI);
    expect(valutaCanale({ lettura: l, letturaFallita: true, adesso: adesso(10 * MINUTO) }).esito).toBe(E.NON_VERIFICATI);
  });
});
