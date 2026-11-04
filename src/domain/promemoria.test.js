// @vitest-environment node
//
// The reminder of one dose, the same for the page timers and for the push:
// its instant and its text (decision 32 A of STATO_CORRENTE.md). The suite
// runs under TZ=Europe/Rome (vitest.config.js); the DST cases are in
// pubblicatore.dst.test.js.

import { describe, it, expect } from 'vitest';
import { istanteDose, testoDose, rigaInvio, TITOLO_MAX, CORPO_MAX } from './promemoria.js';

const farmaco = (campi = {}) => ({
  id: 7, nome: 'Eutirox 50', relazione_pasto: 'prima', dettaglio_pasto: null, ...campi,
});
const voce = (campi = {}) => ({
  dateStr: '2026-10-02', ora_prevista: '08:00', ora_ricalcolata: null, stato: 'prevista',
  orario: { farmaco_id: 7, dose_numero: 1 }, ...campi,
});

describe('l istante della dose', () => {
  it('una dose prevista: ora_prevista nel suo giorno', () => {
    expect(istanteDose(voce())).toBe(new Date('2026-10-02T08:00:00').getTime());
  });

  it('una dose ricalcolata: ora_ricalcolata, anche in un altro giorno', () => {
    expect(istanteDose(voce({ ora_ricalcolata: '2026-10-03T01:30', stato: 'ricalcolata' })))
      .toBe(new Date('2026-10-03T01:30:00').getTime());
  });

  it('una dose senza orario non ha istante', () => {
    expect(istanteDose(voce({ ora_prevista: null }))).toBeNull();
    expect(istanteDose(null)).toBeNull();
  });
});

describe('il testo della dose (decisione 32 A)', () => {
  it('titolo il nome, corpo l ora, la relazione col pasto e l invito', () => {
    expect(testoDose(voce(), farmaco())).toEqual({
      titolo: 'Eutirox 50',
      corpo: "Dose delle 08:00, prima dei pasti. Apri l'app per procedere.",
    });
  });

  it('senza relazione col pasto: l ora e l invito', () => {
    expect(testoDose(voce(), farmaco({ relazione_pasto: 'indifferente' })).corpo)
      .toBe("Dose delle 08:00. Apri l'app per procedere.");
  });

  it('il dettaglio scritto a mano entra pulito: spazi e punto finale non si raddoppiano', () => {
    expect(testoDose(voce(), farmaco({ dettaglio_pasto: '  30 min  prima\ncolazione. ' })).corpo)
      .toBe("Dose delle 08:00, 30 min prima colazione. Apri l'app per procedere.");
  });

  it('una dose ricalcolata dice l ora ricalcolata, quella dell istante', () => {
    const t = testoDose(voce({ ora_ricalcolata: '2026-10-03T01:30', stato: 'ricalcolata' }), farmaco());
    expect(t.corpo).toBe("Dose delle 01:30, prima dei pasti. Apri l'app per procedere.");
  });

  // Decision 8 of 2026-11-04, Roberto's own words: "«Per controllare»
  // diventa «per procedere» solo nel testo della dose".
  it('decisione 8: il banner di Assonal delle 12:30, lontano dai pasti, invita a procedere', () => {
    const assonal = farmaco({ nome: 'Assonal', relazione_pasto: 'lontano' });
    expect(testoDose(voce({ ora_prevista: '12:30' }), assonal)).toEqual({
      titolo: 'Assonal',
      corpo: "Dose delle 12:30, lontano dai pasti. Apri l'app per procedere.",
    });
  });

  it('non asserisce mai uno stato della dose (I1), qualunque esso sia', () => {
    for (const stato of ['prevista', 'ricalcolata', 'presa', 'saltata', 'sospesa']) {
      const { titolo, corpo } = testoDose(voce({ stato }), farmaco());
      expect(`${titolo} ${corpo}`).not.toMatch(/presa|saltata|sospesa|ancora|ritardo|registr/i);
    }
  });

  it('i campi restano nei limiti del server, anche con dati fuori misura', () => {
    const lungo = farmaco({ nome: 'N'.repeat(300), dettaglio_pasto: 'd'.repeat(400) });
    const { titolo, corpo } = testoDose(voce(), lungo);
    expect(titolo.length).toBeLessThanOrEqual(TITOLO_MAX);
    expect(corpo.length).toBeLessThanOrEqual(CORPO_MAX);
    expect(corpo.startsWith('Dose delle 08:00, ddd')).toBe(true);
  });

  it('un nome vuoto non lascia il titolo vuoto, che il server rifiuta', () => {
    expect(testoDose(voce(), farmaco({ nome: '   ' })).titolo).toBe('Farmaco');
  });
});

// Decision 8 of 2026-11-04: the last line of every notification, the hour
// and the date of the sending in the phone's local time. The expected texts
// are written from the decision, never computed with the function.
describe('l ultima riga di ogni notifica (decisione 8)', () => {
  it('l esempio di Roberto: un push mandato alle 12:31 del 04/11/2026', () => {
    expect(rigaInvio(Date.parse('2026-11-04T12:31:00+01:00'))).toBe('PharmaTimer h.12:31  - 04/11/2026');
  });

  it.each([
    ['2026-03-05T07:04:00+01:00', 'PharmaTimer h.07:04  - 05/03/2026'],
    ['2026-11-04T23:59:59+01:00', 'PharmaTimer h.23:59  - 04/11/2026'],
    ['2026-11-05T00:00:00+01:00', 'PharmaTimer h.00:00  - 05/11/2026'],
    ['2026-07-14T13:05:00+02:00', 'PharmaTimer h.13:05  - 14/07/2026'],
  ])('ore e minuti a due cifre sulle 24 ore, giorno e mese a due cifre, l anno a quattro (%s)', (iso, atteso) => {
    expect(rigaInvio(Date.parse(iso))).toBe(atteso);
  });

  it('nell ora locale del telefono, non in UTC: le 23:30 UTC del 04/11 sono le 00:30 del 05/11 a Roma', () => {
    expect(rigaInvio(Date.parse('2026-11-04T23:30:00Z'))).toBe('PharmaTimer h.00:30  - 05/11/2026');
  });

  it.each([
    ['assente', undefined],
    ['null', null],
    ['NaN', Number.NaN],
    ['infinito', Number.POSITIVE_INFINITY],
    ['una stringa', '1793878260000'],
    ['zero', 0],
    ['negativo', -1],
    ['fuori dal calendario', 1e20],
  ])('un istante che non si legge (%s) non da una riga', (_nome, istante) => {
    expect(rigaInvio(istante)).toBeNull();
  });
});
