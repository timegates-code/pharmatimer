// @vitest-environment node
//
// The reminder of one dose, the same for the page timers and for the push:
// its instant and its text (decision 32 A of STATO_CORRENTE.md). The suite
// runs under TZ=Europe/Rome (vitest.config.js); the DST cases are in
// pubblicatore.dst.test.js.

import { describe, it, expect } from 'vitest';
import { istanteDose, testoDose, TITOLO_MAX, CORPO_MAX } from './promemoria.js';

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
      corpo: "Dose delle 08:00, prima dei pasti. Apri l'app per controllare.",
    });
  });

  it('senza relazione col pasto: l ora e l invito', () => {
    expect(testoDose(voce(), farmaco({ relazione_pasto: 'indifferente' })).corpo)
      .toBe("Dose delle 08:00. Apri l'app per controllare.");
  });

  it('il dettaglio scritto a mano entra pulito: spazi e punto finale non si raddoppiano', () => {
    expect(testoDose(voce(), farmaco({ dettaglio_pasto: '  30 min  prima\ncolazione. ' })).corpo)
      .toBe("Dose delle 08:00, 30 min prima colazione. Apri l'app per controllare.");
  });

  it('una dose ricalcolata dice l ora ricalcolata, quella dell istante', () => {
    const t = testoDose(voce({ ora_ricalcolata: '2026-10-03T01:30', stato: 'ricalcolata' }), farmaco());
    expect(t.corpo).toBe("Dose delle 01:30, prima dei pasti. Apri l'app per controllare.");
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
