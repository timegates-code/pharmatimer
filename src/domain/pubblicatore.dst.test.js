// @vitest-environment node
// ============================================================
// The published calendar and the two nights of the civil calendar
// (decision 1). Every instant passes the single door wallToInstant, and
// ora_ricalcolata stays wall clock, never converted (decision 11). Every
// test asserts a fact that is false without DST (`make controllo-dst`).
// ============================================================

import { describe, it, expect } from 'vitest';
import { componiCalendario, fineOrizzonte, vociDelCalendario } from './pubblicatore.js';

const FARMACO = { id: 7, nome: 'Eutirox 50', relazione_pasto: 'indifferente', dettaglio_pasto: null };
const PROFILO = { ora_sonno: '23:30', ora_sveglia: '07:00' };

function voce(dateStr, campi = {}) {
  return {
    key: `${dateStr}-7-1`, dateStr, farmaco: FARMACO, orario: { farmaco_id: 7, dose_numero: 1 },
    ora_prevista: '08:00', ora_ricalcolata: null, stato: 'prevista', ...campi,
  };
}

describe('il calendario pubblicato e le due ore del calendario civile', () => {
  it('29 marzo, dose alle 02:30: si pubblica al primo istante esistente, 01:00Z, e il corpo dice 03:00', () => {
    const [v] = vociDelCalendario([voce('2026-03-29', { ora_prevista: '02:30' })]);
    expect(v.istante_ms).toBe(Date.parse('2026-03-29T01:00:00Z'));
    expect(v.corpo.startsWith('Dose delle 03:00')).toBe(true);
  });

  it('25 ottobre, ricalcolata alle 02:30: istante alla prima occorrenza, 00:30Z, e ora_ricalcolata di parete', () => {
    const [v] = vociDelCalendario([
      voce('2026-10-25', { stato: 'ricalcolata', ora_ricalcolata: '2026-10-25T02:30' }),
    ]);
    expect(v.istante_ms).toBe(Date.parse('2026-10-25T00:30:00Z'));
    expect(v.ora_ricalcolata).toBe('2026-10-25T02:30:00');
  });

  it('dopo la notte di 25 ore l orizzonte finisce alla mezzanotte locale, 23:00Z', () => {
    expect(fineOrizzonte('2026-10-24')).toBe(Date.parse('2026-10-25T23:00:00Z'));
  });

  it('l avviso nel sonno della notte di primavera va alla sveglia, 05:00Z che sono le 07:00 CEST', () => {
    const c = componiCalendario({
      plan: [voce('2026-03-29', { ora_prevista: '23:00' })],
      profilo: PROFILO,
      oggi: '2026-03-28',
      tolleranzaMin: 20,
    });
    expect(c.avviso_fine_ms).toBe(Date.parse('2026-03-30T05:00:00Z'));
  });
});
