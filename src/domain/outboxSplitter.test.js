// @vitest-environment node
// ============================================================
// outboxSplitter -- pin di forma (CS-4 / S2b, par.22.198-triginties).
// SENTINEL_S2B_PIN17
// ------------------------------------------------------------
// Modulo PURO: nessun Dexie, nessuna rete, nessun chiamante di
// produzione (il cablaggio e S2c). `newId` e `now` sono iniettati
// per rendere gli elementi deterministici.
//
// Il pin centrale e il finding #17 (par.22.198-septvicies): il batch
// a 3+ righe [saltata..., presa, ricalcolata], producibile dal
// dominio con autoSkip su farmaco a intervallo, oggi viaggia come N
// POST sequenziali con la riga `ricalcolata` instradata su /log/undo
// (rischio M1). Lo splitter lo spezza in saltate singole PIU una
// coppia di ESATTAMENTE 2 righe, che supera il predicato atomico di
// ApiRepository: il difetto e sanato per costruzione a S2c.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  splitIntoElements,
  deriveDelivery,
  isAtomicPresaPlusRicalc,
  OUTBOX_OPS,
  PARK_REASONS,
} from './outboxSplitter.js';

const NOW = '2026-07-22T10:00:00.000Z';

function harness() {
  let n = 0;
  return {
    newId: () => 'uuid-' + ++n,
    now: () => NOW,
  };
}

function row(farmaco_id, data, dose_numero, stato) {
  return { farmaco_id, data, dose_numero, stato };
}

describe('outboxSplitter -- pin #17: batch a 3+ righe', () => {
  it('[saltata, saltata, presa, ricalcolata] -> 2 saltate singole + 1 coppia', () => {
    const { newId, now } = harness();
    const elements = splitIntoElements({
      op: 'presa',
      logs: [
        row(1, '2026-07-20', 1, 'saltata'),
        row(1, '2026-07-21', 1, 'saltata'),
        row(1, '2026-07-22', 1, 'presa'),
        row(1, '2026-07-23', 1, 'ricalcolata'),
      ],
      newId,
      now,
    });

    expect(elements).toHaveLength(3);
    expect(elements.map((e) => e.logs.length)).toEqual([1, 1, 2]);
    expect(elements.every((e) => e.stato === 'pending')).toBe(true);
    // Una targa per elemento, tutte distinte (M3: congelata al tocco).
    expect(elements.map((e) => e.client_op_id)).toEqual([
      'uuid-1',
      'uuid-2',
      'uuid-3',
    ]);
  });

  it('la coppia arriva a ESATTAMENTE 2 righe e supera il predicato atomico', () => {
    const { newId, now } = harness();
    const elements = splitIntoElements({
      op: 'presa',
      logs: [
        row(1, '2026-07-20', 1, 'saltata'),
        row(1, '2026-07-22', 1, 'presa'),
        row(1, '2026-07-23', 1, 'ricalcolata'),
      ],
      newId,
      now,
    });
    const coppia = elements[elements.length - 1];
    expect(coppia.logs).toHaveLength(2);
    expect(isAtomicPresaPlusRicalc(coppia.logs)).toBe(true);
    expect(deriveDelivery(coppia)).toEqual({
      method: 'batch',
      verb: 'presa',
      rows: coppia.logs,
    });
  });

  it('le righe saltate del gesto presa restano op=presa ma vanno sul verbo saltata', () => {
    const { newId, now } = harness();
    const [saltata] = splitIntoElements({
      op: 'presa',
      logs: [row(1, '2026-07-20', 1, 'saltata'), row(1, '2026-07-22', 1, 'presa')],
      newId,
      now,
    });
    expect(saltata.op).toBe('presa');
    expect(deriveDelivery(saltata).verb).toBe('saltata');
  });
});

describe('outboxSplitter -- pairing BIT-IDENTICO a ApiRepository._isAtomicPresaPlusRicalc', () => {
  it('esige esattamente 2 righe', () => {
    expect(isAtomicPresaPlusRicalc([row(1, 'a', 1, 'presa')])).toBe(false);
    expect(
      isAtomicPresaPlusRicalc([
        row(1, 'a', 1, 'presa'),
        row(1, 'b', 1, 'ricalcolata'),
        row(1, 'c', 1, 'saltata'),
      ]),
    ).toBe(false);
  });

  it('esige stesso farmaco_id e ordine [presa, ricalcolata]', () => {
    expect(
      isAtomicPresaPlusRicalc([row(1, 'a', 1, 'presa'), row(2, 'b', 1, 'ricalcolata')]),
    ).toBe(false);
    expect(
      isAtomicPresaPlusRicalc([row(1, 'a', 1, 'ricalcolata'), row(1, 'b', 1, 'presa')]),
    ).toBe(false);
  });

  it('NON controlla le date (come lo originale)', () => {
    expect(
      isAtomicPresaPlusRicalc([
        row(1, '2026-01-01', 1, 'presa'),
        row(1, '2099-12-31', 9, 'ricalcolata'),
      ]),
    ).toBe(true);
  });
});

describe('outboxSplitter -- invariante OP-SCOPED (R-2 = A)', () => {
  it('dentro presa una ricalcolata che non appaia PARCHEGGIA con motivo', () => {
    const { newId, now } = harness();
    const elements = splitIntoElements({
      op: 'presa',
      logs: [row(1, 'a', 1, 'presa'), row(2, 'b', 1, 'ricalcolata')],
      newId,
      now,
    });
    expect(elements).toHaveLength(2);
    expect(elements[1].stato).toBe('parked');
    expect(elements[1].parked_reason).toBe(PARK_REASONS.PAIRING_FALLITO);
    expect(elements[1].parked_at).toBe(NOW);
    // Mai una rotta indovinata: la derivazione fallisce esplicitamente.
    expect(deriveDelivery(elements[1])).toBeNull();
  });

  it('fuori da presa una ricalcolata sola e LEGITTIMA e va su undo', () => {
    const { newId, now } = harness();
    const [el] = splitIntoElements({
      op: 'ripristina',
      logs: [row(1, 'a', 1, 'ricalcolata')],
      newId,
      now,
    });
    expect(el.stato).toBe('pending');
    expect(deriveDelivery(el).verb).toBe('undo');
  });
});

describe('outboxSplitter -- gesti di annullamento (R-1)', () => {
  it('2 righe -> UN elemento, UNA sola richiesta undo derivata da logs[0]', () => {
    const { newId, now } = harness();
    const elements = splitIntoElements({
      op: 'annullaAssunzione',
      logs: [row(1, '2026-07-22', 1, 'ricalcolata'), row(1, '2026-07-23', 2, 'prevista')],
      newId,
      now,
    });
    expect(elements).toHaveLength(1);
    // Entrambe le chiavi dose restano congelate nello elemento: servono a
    // outboxProtectedKeys per schermare la N+1 dal mirror (M2).
    expect(elements[0].logs).toHaveLength(2);
    const delivery = deriveDelivery(elements[0]);
    expect(delivery.method).toBe('single');
    expect(delivery.verb).toBe('undo');
    expect(delivery.rows).toHaveLength(1);
    expect(delivery.rows[0]).toBe(elements[0].logs[0]);
  });

  it('annullaUltima a 1 riga -> undo', () => {
    const { newId, now } = harness();
    const [el] = splitIntoElements({
      op: 'annullaUltima',
      logs: [row(1, 'a', 1, 'prevista')],
      newId,
      now,
    });
    expect(deriveDelivery(el).verb).toBe('undo');
  });
});

describe('outboxSplitter -- mappa BERSAGLIO (R-3 = A)', () => {
  it('recupero -> verbo recupero, NON undo (sana #18-L1 a S2c)', () => {
    const { newId, now } = harness();
    // La riga di recupero porta stato ricalcolata per guardia di
    // applyRecupero: senza il ramo op-first finirebbe su undo.
    const [el] = splitIntoElements({
      op: 'recupero',
      logs: [row(1, 'a', 1, 'ricalcolata')],
      newId,
      now,
    });
    expect(el.stato).toBe('pending');
    expect(deriveDelivery(el).verb).toBe('recupero');
  });

  it('salta / sospendi / presa singola sui rispettivi verbi', () => {
    const { newId, now } = harness();
    const one = (op, stato) =>
      deriveDelivery(
        splitIntoElements({ op, logs: [row(1, 'a', 1, stato)], newId, now })[0],
      ).verb;
    expect(one('salta', 'saltata')).toBe('saltata');
    expect(one('sospendi', 'sospesa')).toBe('sospesa');
    expect(one('presa', 'presa')).toBe('presa');
  });
});

describe('outboxSplitter -- PARK-ON-UNKNOWN (R-4 = A)', () => {
  it('op fuori vocabolario: UN elemento parcheggiato che conserva tutte le righe', () => {
    const { newId, now } = harness();
    const elements = splitIntoElements({
      op: 'gestoFuturoIgnoto',
      logs: [row(1, 'a', 1, 'presa'), row(1, 'b', 1, 'saltata')],
      newId,
      now,
    });
    expect(elements).toHaveLength(1);
    expect(elements[0].stato).toBe('parked');
    expect(elements[0].parked_reason).toBe(PARK_REASONS.OP_SCONOSCIUTO);
    // M2: nulla viene scartato, nessuna riga perde la protezione.
    expect(elements[0].logs).toHaveLength(2);
    expect(deriveDelivery(elements[0])).toBeNull();
  });

  it('stato di riga fuori vocabolario: derivazione nulla, mai una rotta indovinata', () => {
    expect(
      deriveDelivery({ op: 'presa', logs: [{ farmaco_id: 1, stato: 'boh' }] }),
    ).toBeNull();
  });

  it('il vocabolario op e esattamente i 7 nomi dei thunk (Q-OP1 = A)', () => {
    expect(OUTBOX_OPS).toEqual([
      'presa',
      'salta',
      'sospendi',
      'recupero',
      'ripristina',
      'annullaUltima',
      'annullaAssunzione',
    ]);
  });
});

describe('outboxSplitter -- forma dello elemento (Q4.A)', () => {
  it('dose primaria da logs[0] e contatori iniziali', () => {
    const { newId, now } = harness();
    const [el] = splitIntoElements({
      op: 'presa',
      logs: [row(7, '2026-07-22', 3, 'presa')],
      newId,
      now,
    });
    expect(el).toMatchObject({
      stato: 'pending',
      op: 'presa',
      client_op_id: 'uuid-1',
      farmaco_id: 7,
      data: '2026-07-22',
      dose_numero: 3,
      created_at: NOW,
      attempts: 0,
      parked_reason: null,
      parked_at: null,
    });
  });

  it('logs vuoto -> nessun elemento', () => {
    const { newId, now } = harness();
    expect(splitIntoElements({ op: 'presa', logs: [], newId, now })).toEqual([]);
  });
});

describe('outboxSplitter -- OUTBOX_OPS append-only (Q-S2C-5 = A)', () => {
  // SENTINEL_S2C5_PIN_OPS_APPEND
  // Il toEqual del pin Q-OP1 resta INTATTO e pinna materia distinta: la
  // forma esatta del vocabolario di oggi. Qui si pinna la REGOLA -- il
  // vocabolario non perde e non ricicla MAI un verbo. Un verbo rimosso
  // renderebbe non derivabile la rotta di ogni elemento gia in coda che
  // lo porta: il gesto finirebbe parcheggiato per un motivo che non e
  // colpa sua, e una presa vera resterebbe in attesa di mani umane (M2).
  //
  // La lista storica e SEPARATA di proposito: se fosse derivata da
  // OUTBOX_OPS il pin seguirebbe una rimozione invece di romperla.
  const OPS_STORICI = [
    'presa',
    'salta',
    'sospendi',
    'recupero',
    'ripristina',
    'annullaUltima',
    'annullaAssunzione',
  ];

  it('nessun verbo storico e mai stato rimosso', () => {
    for (const op of OPS_STORICI) {
      expect(OUTBOX_OPS, `verbo storico rimosso: ${op}`).toContain(op);
    }
  });

  it('il vocabolario e congelato in scrittura', () => {
    expect(Object.isFrozen(OUTBOX_OPS)).toBe(true);
  });

  it('nessun verbo e riciclato: zero duplicati', () => {
    expect(new Set(OUTBOX_OPS).size).toBe(OUTBOX_OPS.length);
  });
});
