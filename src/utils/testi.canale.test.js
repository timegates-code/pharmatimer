// @vitest-environment node
// ============================================================
// The words of the state of the reminder channel (step 4 of the client).
// Roberto's rule of 2026-10-01: "non attivi" when we know the reminders will
// not arrive, "non verificati" only when we do not know, "non aggiornati"
// when the server keeps the calendar it had; each text in both directions.
// A 201 is "accettato", never "consegnato" (decision 2). Times on the
// phone's wall clock (the suite runs under TZ=Europe/Rome).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  CANALE_TITOLO,
  quandoCanale,
  testoEsitoInvio,
  testoPercheCanale,
  testoRigaCanale,
  testoStatoCanale,
} from './testi.js';

const ALLE_0815 = new Date('2026-10-07T08:15:00').getTime();
const v = (esito, perche = null, dalleMs = null) => ({ esito, perche, dalleMs });

describe('la testa dello stato', () => {
  it('attivi, con l ora dell ultima verifica', () => {
    expect(testoStatoCanale(v('attivi', null, ALLE_0815)))
      .toBe('Promemoria ad app chiusa attivi, ultima verifica alle 08:15.');
  });

  it('non attivi: lo dice in chiaro, senza ora e senza dubbio', () => {
    const testo = testoStatoCanale(v('non_attivi', 'canale_spento'));
    expect(testo).toBe('Promemoria ad app chiusa non attivi.');
    expect(testo).not.toMatch(/verificat|aggiornat/);
  });

  it('non verificati: solo quando non sappiamo, con l ora se la sappiamo', () => {
    expect(testoStatoCanale(v('non_verificati', 'battito_vecchio', ALLE_0815)))
      .toBe('Promemoria ad app chiusa non verificati dalle 08:15.');
    const senzaOra = testoStatoCanale(v('non_verificati', 'stato_non_letto'));
    expect(senzaOra).toBe('Promemoria ad app chiusa non verificati.');
    expect(senzaOra).not.toMatch(/non attivi|aggiornat/);
  });

  it('non aggiornati: il server tiene il calendario di prima', () => {
    const testo = testoStatoCanale(v('non_aggiornati', 'pubblicazione', ALLE_0815));
    expect(testo).toBe('Promemoria ad app chiusa non aggiornati dalle 08:15.');
    expect(testo).not.toMatch(/non attivi|verificat/);
  });

  it('niente da dire quando nulla e noto', () => {
    expect(testoStatoCanale(null)).toBeNull();
  });
});

describe('la riga di Oggi', () => {
  it('solo quando lo stato non e OK, e invita a toccare', () => {
    expect(testoRigaCanale(v('attivi', null, ALLE_0815))).toBeNull();
    expect(testoRigaCanale(null)).toBeNull();
    expect(testoRigaCanale(v('non_attivi', 'non_iscritto')))
      .toBe('Promemoria ad app chiusa non attivi. Tocca per verificare.');
    expect(testoRigaCanale(v('non_verificati', 'battito_vecchio', ALLE_0815)))
      .toBe('Promemoria ad app chiusa non verificati dalle 08:15. Tocca per verificare.');
    expect(testoRigaCanale(v('non_aggiornati', 'pubblicazione')))
      .toBe('Promemoria ad app chiusa non aggiornati. Tocca per verificare.');
  });
});

describe('il perche, in Impostazioni', () => {
  it('canale spento: il motivo del server in parole, o com e', () => {
    const r = { canale: { attivo: false, motivo: 'pem_non_configurato' } };
    expect(testoPercheCanale(v('non_attivi', 'canale_spento'), { risposta: r }))
      .toBe('Il server non può firmare i promemoria: la chiave non è configurata.');
    const ignoto = { canale: { attivo: false, motivo: 'motivo_nuovo' } };
    expect(testoPercheCanale(v('non_attivi', 'canale_spento'), { risposta: ignoto }))
      .toBe('Il server non può firmare i promemoria: motivo_nuovo.');
  });

  it('passata mai partita, ed esito non ok col suo dettaglio', () => {
    expect(testoPercheCanale(v('non_attivi', 'passata_mai_partita')))
      .toBe('Il pianificatore del server non è mai partito.');
    const r = { pianificatore: { esito: 'errore', dettaglio: 'OperationalError: db' } };
    expect(testoPercheCanale(v('non_attivi', 'esito_passata'), { risposta: r }))
      .toBe("L'ultima passata del pianificatore non è andata a buon fine: errore, OperationalError: db.");
  });

  it('telefono non iscritto, col motivo locale', () => {
    expect(testoPercheCanale(v('non_attivi', 'non_iscritto'), { iscrizione: { motivo: 'worker_non_pronto' } }))
      .toBe("Questo telefono non è iscritto: il service worker non risponde: aggiorna l'app.");
    expect(testoPercheCanale(v('non_attivi', 'non_iscritto'), {}))
      .toBe('Questo telefono non è iscritto.');
  });

  it('battito vecchio, stato non letto, pubblicazione fallita', () => {
    expect(testoPercheCanale(v('non_verificati', 'battito_vecchio', ALLE_0815)))
      .toBe('Nessuna passata del pianificatore verificata dalle 08:15.');
    expect(testoPercheCanale(v('non_verificati', 'stato_non_letto'), { errore: 'Errore di rete' }))
      .toBe('Lo stato del server non si legge: Errore di rete.');
    expect(testoPercheCanale(v('non_aggiornati', 'pubblicazione'), { pubblicazione: { motivo: 'pubblicazione' } }))
      .toBe("L'ultimo piano non è arrivato al server, che tiene il calendario di prima: l'invio non è riuscito.");
  });

  it('nessun perche per uno stato OK', () => {
    expect(testoPercheCanale(v('attivi', null, ALLE_0815))).toBeNull();
  });
});

describe('le righe degli invii', () => {
  it('un 201 e accettato, mai consegnato', () => {
    const testo = testoEsitoInvio({ stato: 'accettato', motivo: null, http_status: 201, forma: 'dose' });
    expect(testo).toBe('accettato');
    expect(testo).not.toMatch(/consegnat/);
  });

  it('i non inviati col motivo, i respinti col codice, l avviso neutro per forma', () => {
    expect(testoEsitoInvio({ stato: 'non_inviato', motivo: 'presa', http_status: null }))
      .toBe('non inviato, dose già presa');
    expect(testoEsitoInvio({ stato: 'respinto', motivo: 'iscrizione_morta', http_status: 410 }))
      .toBe('respinto, iscrizione non più valida, HTTP 410');
    expect(testoEsitoInvio({ stato: 'accettato', motivo: 'divergenza', http_status: 201, forma: 'avviso_neutro' }))
      .toBe('avviso neutro, accettato, orario diverso dal telefono');
    expect(testoEsitoInvio({ stato: 'stato_nuovo', motivo: 'motivo_nuovo' })).toBe('stato_nuovo, motivo_nuovo');
  });

  it('il quando sull orologio del telefono', () => {
    expect(quandoCanale(ALLE_0815)).toBe('07/10 08:15');
    expect(quandoCanale(null)).toBe('');
    expect(CANALE_TITOLO).toBe('Promemoria ad app chiusa');
  });
});
