// @vitest-environment node
// ============================================================
// The calendar the phone publishes (step 3 of the client; decisions 8, 11,
// 12 and 16 of STATO_CORRENTE.md). The suite runs under TZ=Europe/Rome.
// ============================================================
// The load-bearing test binds the published key to the log row that the
// REAL transitions of recalc.js write, in both directions, on a plan built
// by the REAL buildMultiDayPlan: a standard farmaco, an extended one (every
// 48 hours), a fisso_date one, and a dose of yesterday recalculated into
// today. The same for ora_ricalcolata. The planner re-reads the log by that
// key and compares ora_ricalcolata by equality (decision 11): a key or a
// value that drifts from the log is a push for the wrong row, or a neutral
// notice in place of the dose. Rows in the bench: calendario-data-dall-istante,
// calendario-dose-numero, calendario-ricalcolata-vuota, and the others named
// next to their tests.

import { describe, it, expect } from 'vitest';
import { buildMultiDayPlan } from './planBuilder.js';
import { applyAssunzione, applySospensione } from './recalc.js';
import {
  componiCalendario,
  fineOrizzonte,
  fuoriDalSonno,
  oraRicalcolataAlSecondo,
  vociDelCalendario,
} from './pubblicatore.js';

const IERI = '2026-10-06';
const OGGI = '2026-10-07';
const DOMANI = '2026-10-08';
const MINUTO = 60_000;

const PROFILO = {
  id: 1, nome_profilo: 'Standard', ora_sveglia: '07:00', ora_colazione: '07:30',
  ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30', attivo: 1,
};

function farmaco(campi) {
  return {
    funzione: null, intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: 'indifferente', dettaglio_pasto: null, note: null,
    data_inizio: '2026-01-01', data_fine: null, attivo: 1, ...campi,
  };
}
function orario(farmaco_id, dose_numero, offset_minuti, ancora_riferimento, campi = {}) {
  return {
    id: farmaco_id * 10 + dose_numero, farmaco_id, dose_numero, offset_minuti, ancora_riferimento,
    descrizione_momento: null, ...campi,
  };
}

const STANDARD = farmaco({ id: 1, nome: 'Cardioaspirina 100', tipo_frequenza: 'fisso', relazione_pasto: 'dopo' });
const ESTESO = farmaco({ id: 2, nome: 'Esteso 48h', tipo_frequenza: 'intervallo', intervallo_ore: 48, data_inizio: IERI });
const DATE_FISSE = farmaco({
  id: 3, nome: 'Vitamina D', tipo_frequenza: 'fisso_date', data_inizio: OGGI, data_fine: OGGI,
});
const OTTO_ORE = farmaco({
  id: 4, nome: 'Antibiotico', tipo_frequenza: 'intervallo', intervallo_ore: 8, intervallo_minimo_ore: 4,
  dosi_giornaliere: 2,
});
const FARMACI = [STANDARD, ESTESO, DATE_FISSE, OTTO_ORE];
const ORARI = [
  orario(1, 1, 0, 'colazione'), // 07:30
  orario(2, 1, 0, 'colazione'), // 07:30, ieri e domani
  orario(3, 1, 540, 'assoluto', { data_specifica: OGGI }), // 09:00, solo oggi
  orario(4, 1, 960, 'assoluto'), // 16:00
  orario(4, 2, 1380, 'assoluto'), // 23:00
];

function piano(logAssunzioni = []) {
  return buildMultiDayPlan({
    profilo: PROFILO, farmaci: FARMACI, orari: ORARI, logAssunzioni, startDate: IERI, numDays: 3,
  });
}

// The dose 2 of yesterday, recalculated into today by the real transition:
// dose 1 taken at 18:30 instead of 16:00 moves dose 2 past midnight. Its new
// time is the one the transition writes, read from its log row.
function pianoConRicalcolata() {
  const base = piano();
  const esito = applyAssunzione(base, { entryKey: `${IERI}-4-1`, dataEffettiva: IERI, oraEffettiva: '18:30' });
  return { base, ...esito };
}

const chiave = (r) => `${r.farmaco_id}|${r.data}|${r.dose_numero}`;
const aperta = (e) => e.stato === 'prevista' || e.stato === 'ricalcolata';

describe('il fixture copre i quattro casi della struttura', () => {
  it('standard, esteso, fisso_date e la dose di ieri ricalcolata a oggi', () => {
    const { plan } = pianoConRicalcolata();
    const voci = vociDelCalendario(plan);
    expect(voci.filter((v) => v.farmaco_id === 1).map((v) => v.data)).toEqual([IERI, OGGI, DOMANI]);
    expect(voci.filter((v) => v.farmaco_id === 2).map((v) => v.data)).toEqual([IERI, DOMANI]);
    expect(voci.filter((v) => v.farmaco_id === 3).map((v) => v.data)).toEqual([OGGI]);
    const ricalcolata = plan.find((e) => e.key === `${IERI}-4-2`);
    expect(ricalcolata.stato).toBe('ricalcolata');
    expect(ricalcolata.ora_ricalcolata.startsWith(`${OGGI}T`)).toBe(true);
  });
});

describe('la chiave pubblicata e la riga che le transizioni vere scrivono', () => {
  it('dal calendario al log: ogni voce ha la chiave della riga che la sua transizione scrive', () => {
    const { plan } = pianoConRicalcolata();
    const aperte = plan.filter(aperta);
    expect(aperte.length).toBeGreaterThan(8);
    for (const entry of aperte) {
      const [voce] = vociDelCalendario([entry]);
      const [riga] = applySospensione(plan, entry.key).logWrites;
      expect(chiave(voce)).toBe(chiave(riga));
      expect(voce.ora_ricalcolata).toBe(oraRicalcolataAlSecondo(riga.ora_ricalcolata));
    }
  });

  it('dal log al calendario: una dose chiusa esce, la ricalcolata resta con la sua riga', () => {
    const { base, plan, logWrites } = pianoConRicalcolata();
    const prima = new Set(vociDelCalendario(base).map(chiave));
    const voci = vociDelCalendario(plan);
    const presa = logWrites.find((w) => w.stato === 'presa');
    const ricalcolata = logWrites.find((w) => w.stato === 'ricalcolata');
    expect(prima.has(chiave(presa))).toBe(true);
    expect(voci.filter((v) => chiave(v) === chiave(presa))).toEqual([]);
    const pubblicate = voci.filter((v) => chiave(v) === chiave(ricalcolata));
    expect(pubblicate).toHaveLength(1);
    expect(pubblicate[0].ora_ricalcolata).toBe(oraRicalcolataAlSecondo(ricalcolata.ora_ricalcolata));
  });

  it('la dose di ieri ricalcolata a oggi: la data e quella del log, l istante e oggi', () => {
    const { plan, logWrites } = pianoConRicalcolata();
    const riga = logWrites.find((w) => w.stato === 'ricalcolata');
    const [voce] = vociDelCalendario(plan).filter((v) => v.farmaco_id === 4 && v.dose_numero === 2 && v.data === IERI);
    expect(riga.data).toBe(IERI);
    expect(voce.data).toBe(riga.data);
    expect(voce.istante_ms).toBe(new Date(`${riga.ora_ricalcolata}:00`).getTime());
    expect(new Date(voce.istante_ms).getDate()).toBe(7);
    expect(voce.ora_ricalcolata).toBe(`${riga.ora_ricalcolata}:00`);
  });

  it('il numero della dose e quello del log, non dell orario', () => {
    const voci = vociDelCalendario(piano()).filter((v) => v.farmaco_id === 4 && v.data === OGGI);
    expect(voci.map((v) => v.dose_numero)).toEqual([1, 2]);
  });

  it('una dose prevista pubblica ora_ricalcolata vuota', () => {
    const voci = vociDelCalendario(piano());
    expect(voci.length).toBeGreaterThan(0);
    for (const v of voci) expect(v.ora_ricalcolata).toBeNull();
  });

  it('la ricalcolata letta dal server, coi secondi: stessa riga, stesso valore', () => {
    const plan = piano([{
      farmaco_id: 4, data: IERI, dose_numero: 2, ora_prevista: '23:00', ora_effettiva: null,
      delta_minuti: null, ora_ricalcolata: `${OGGI}T01:30:00`, gap_minuti: 150, recupero_minuti: 0,
      stato: 'ricalcolata', note: null,
    }]);
    const [voce] = vociDelCalendario(plan).filter((v) => v.farmaco_id === 4 && v.data === IERI && v.dose_numero === 2);
    expect(voce.ora_ricalcolata).toBe(`${OGGI}T01:30:00`);
    expect(voce.istante_ms).toBe(new Date(`${OGGI}T01:30:00`).getTime());
  });
});

describe('cosa entra nel calendario', () => {
  it('le dosi chiuse sul telefono non entrano: presa, saltata, sospesa', () => {
    const plan = piano([
      { farmaco_id: 1, data: OGGI, dose_numero: 1, ora_prevista: '07:30', ora_effettiva: `${OGGI}T07:35:00`,
        delta_minuti: 5, ora_ricalcolata: null, gap_minuti: 0, recupero_minuti: 0, stato: 'presa', note: null },
      { farmaco_id: 1, data: IERI, dose_numero: 1, ora_prevista: '07:30', ora_effettiva: null,
        delta_minuti: null, ora_ricalcolata: null, gap_minuti: 0, recupero_minuti: 0, stato: 'saltata', note: null },
      { farmaco_id: 3, data: OGGI, dose_numero: 1, ora_prevista: '09:00', ora_effettiva: null,
        delta_minuti: null, ora_ricalcolata: null, gap_minuti: 0, recupero_minuti: 0, stato: 'sospesa', note: null },
    ]);
    const chiavi = vociDelCalendario(plan).map(chiave);
    expect(chiavi).not.toContain(`1|${OGGI}|1`);
    expect(chiavi).not.toContain(`1|${IERI}|1`);
    expect(chiavi).not.toContain(`3|${OGGI}|1`);
    expect(chiavi).toContain(`1|${DOMANI}|1`);
  });

  it('una dose senza orario risolvibile non entra', () => {
    const entry = { ...piano()[0], ora_prevista: null, orario_non_risolvibile: true };
    expect(vociDelCalendario([entry])).toEqual([]);
  });

  it('titolo e corpo sono quelli della dose (decisione 32)', () => {
    const [voce] = vociDelCalendario(piano()).filter((v) => v.farmaco_id === 1 && v.data === OGGI);
    expect(voce.titolo).toBe('Cardioaspirina 100');
    expect(voce.corpo).toBe("Dose delle 07:30, dopo i pasti. Apri l'app per controllare.");
  });

  it('una voce per dose, in ordine di istante', () => {
    const voci = vociDelCalendario(piano());
    expect(new Set(voci.map(chiave)).size).toBe(voci.length);
    for (let i = 1; i < voci.length; i += 1) expect(voci[i].istante_ms).toBeGreaterThanOrEqual(voci[i - 1].istante_ms);
  });
});

describe('ora_ricalcolata al secondo intero', () => {
  it('dal telefono, dal server, vuota o illeggibile', () => {
    expect(oraRicalcolataAlSecondo(`${OGGI}T01:30`)).toBe(`${OGGI}T01:30:00`);
    expect(oraRicalcolataAlSecondo(`${OGGI}T01:30:45`)).toBe(`${OGGI}T01:30:45`);
    expect(oraRicalcolataAlSecondo(`${OGGI} 01:30:00`)).toBe(`${OGGI}T01:30:00`);
    expect(oraRicalcolataAlSecondo(null)).toBeNull();
    expect(oraRicalcolataAlSecondo('')).toBeNull();
    expect(oraRicalcolataAlSecondo('ieri sera')).toBeNull();
  });
});

describe('orizzonte e avviso di fine (decisione 12)', () => {
  it('l orizzonte finisce alla mezzanotte dopo l ultimo giorno del piano', () => {
    expect(fineOrizzonte(OGGI)).toBe(new Date('2026-10-09T00:00:00').getTime());
  });

  it('l avviso e l ultima voce piu la tolleranza letta dal server, e l entro altrettanto dopo', () => {
    const plan = piano();
    const ultima = Math.max(...vociDelCalendario(plan).map((v) => v.istante_ms));
    // Un sonno lontano dall avviso, che cade domani alle 23:30.
    const c = componiCalendario({ plan, profilo: { ...PROFILO, ora_sonno: '03:00', ora_sveglia: '05:00' }, oggi: OGGI, tolleranzaMin: 30 });
    expect(c.avviso_fine_ms).toBe(ultima + 30 * MINUTO);
    expect(c.avviso_fine_entro_ms).toBe(c.avviso_fine_ms + 30 * MINUTO);
  });

  it('un avviso la cui finestra tocca il sonno va alla sveglia', () => {
    // L ultima voce e domani alle 23:00: l avviso alle 23:20 cade nel sonno (23:30-07:00).
    const c = componiCalendario({ plan: piano(), profilo: PROFILO, oggi: OGGI, tolleranzaMin: 20 });
    expect(c.avviso_fine_ms).toBe(new Date('2026-10-09T07:00:00').getTime());
    expect(c.avviso_fine_entro_ms).toBe(new Date('2026-10-09T07:20:00').getTime());
  });

  it('un avviso fuori dal sonno resta dove e', () => {
    const alle18 = new Date(`${OGGI}T18:00:00`).getTime();
    expect(fuoriDalSonno(alle18, 20 * MINUTO, PROFILO)).toBe(alle18);
    expect(fuoriDalSonno(alle18, 20 * MINUTO, { ora_sonno: null, ora_sveglia: '07:00' })).toBe(alle18);
  });

  it('il sonno che non scavalca la mezzanotte: dalle 00:30 alle 07:00', () => {
    const alle01 = new Date(`${OGGI}T01:00:00`).getTime();
    expect(fuoriDalSonno(alle01, 20 * MINUTO, { ora_sonno: '00:30', ora_sveglia: '07:00' }))
      .toBe(new Date(`${OGGI}T07:00:00`).getTime());
  });

  it('senza voci l avviso parte dalla fine dell orizzonte, con la regola del sonno', () => {
    const c = componiCalendario({ plan: [], profilo: PROFILO, oggi: OGGI, tolleranzaMin: 20 });
    expect(c.voci).toEqual([]);
    expect(c.avviso_fine_ms).toBe(new Date('2026-10-09T07:00:00').getTime());
  });

  it('cio che il server pretende: l avviso dopo la finestra dell ultima dose, l entro dopo l avviso', () => {
    for (const tolleranzaMin of [20, 30]) {
      const c = componiCalendario({ plan: piano(), profilo: PROFILO, oggi: OGGI, tolleranzaMin });
      const ultima = Math.max(...c.voci.map((v) => v.istante_ms));
      expect(c.avviso_fine_ms).toBeGreaterThanOrEqual(ultima + tolleranzaMin * MINUTO);
      expect(c.avviso_fine_entro_ms).toBeGreaterThan(c.avviso_fine_ms);
    }
  });

  it('senza una tolleranza valida non si compone nulla', () => {
    for (const tolleranzaMin of [undefined, null, 0, -5, 20.5, '20']) {
      expect(() => componiCalendario({ plan: piano(), profilo: PROFILO, oggi: OGGI, tolleranzaMin })).toThrow();
    }
  });
});
