// @vitest-environment node
// ============================================================
// computeOraPrevista ai confini (coda STATO riga 3, decisione 1 P3).
//
// TZ-INDIPENDENTE per costruzione: qui non c e alcun giorno di calendario,
// quindi nessuno scivolamento; il solo caso per giorno usa un giorno di
// luglio, dove la etichetta e identica in ogni fuso. Il DST vive nei file
// *.dst.test.js, che il controllo positivo fa arrossare senza ora legale.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  computeOraPrevista,
  computeOraPrevistaOnDay,
  isOrarioNonRisolvibile,
  ORARIO_NON_RISOLVIBILE,
} from './orarioResolver.js';
import { DomainError } from './errors.js';

const profilo = {
  id: 1,
  nome_profilo: 'Standard',
  ora_sveglia: '07:00',
  ora_colazione: '07:30',
  ora_pranzo: '13:00',
  ora_cena: '20:00',
  ora_sonno: '23:30',
  attivo: 1,
};

const orario = (ancora_riferimento, offset_minuti) => ({
  id: 1,
  farmaco_id: 1,
  dose_numero: 1,
  ancora_riferimento,
  offset_minuti,
  descrizione_momento: null,
});

function attesoNonRisolvibile(fn) {
  let err = null;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(DomainError);
  expect(err.code).toBe(ORARIO_NON_RISOLVIBILE);
  expect(isOrarioNonRisolvibile(err)).toBe(true);
  return err;
}

describe('computeOraPrevista -- offset negativi', () => {
  it('sveglia 07:00 meno 30 e 06:30', () => {
    expect(computeOraPrevista(orario('sveglia', -30), profilo)).toBe('06:30');
  });

  it('colazione 07:30 meno 90 e 06:00', () => {
    expect(computeOraPrevista(orario('colazione', -90), profilo)).toBe('06:00');
  });

  it('assoluto meno 1 avvolge a 23:59 (wrap dichiarato, Spec 3.6 AMB-9.D)', () => {
    expect(computeOraPrevista(orario('assoluto', -1), profilo)).toBe('23:59');
  });
});

describe('computeOraPrevista -- oltre la mezzanotte, wrap DICHIARATO', () => {
  // Spec 3.6 :258 -- ora_prevista e HH:MM e non attraversa mai la mezzanotte
  // per costruzione (AMB-9.D). Il wrap resta quindi sullo STESSO giorno:
  // "sonno + 60" legge 00:30 del giorno della dose, non del giorno dopo.
  // Pinnato come DICHIARATO; la sua sorte e una decisione in coda, non di
  // questo file.
  it('sonno 23:30 piu 60 e 00:30, stesso giorno', () => {
    expect(computeOraPrevista(orario('sonno', 60), profilo)).toBe('00:30');
  });

  it('sveglia 07:00 meno 480 avvolge a 23:00', () => {
    expect(computeOraPrevista(orario('sveglia', -480), profilo)).toBe('23:00');
  });

  it('assoluto 1440 avvolge a 00:00 e assoluto 1439 e 23:59', () => {
    expect(computeOraPrevista(orario('assoluto', 1440), profilo)).toBe('00:00');
    expect(computeOraPrevista(orario('assoluto', 1439), profilo)).toBe('23:59');
    expect(computeOraPrevista(orario('assoluto', 0), profilo)).toBe('00:00');
  });
});

describe('computeOraPrevista -- ancora mancante: DomainError, non TypeError', () => {
  it('profilo senza la ancora chiesta (undefined, null, stringa vuota, non HH:MM)', () => {
    for (const valore of [undefined, null, '', '20', 'venti']) {
      const err = attesoNonRisolvibile(() =>
        computeOraPrevista(orario('cena', 0), { ...profilo, ora_cena: valore })
      );
      expect(err.message).toContain('ora_cena');
    }
  });

  it('profilo assente del tutto', () => {
    attesoNonRisolvibile(() => computeOraPrevista(orario('cena', 0), undefined));
    attesoNonRisolvibile(() => computeOraPrevista(orario('cena', 0), null));
  });

  it('ancora sconosciuta, o assente, o ereditata dal prototipo', () => {
    const err = attesoNonRisolvibile(() => computeOraPrevista(orario('merenda', 0), profilo));
    expect(err.message).toContain('merenda');
    attesoNonRisolvibile(() => computeOraPrevista(orario(undefined, 0), profilo));
    attesoNonRisolvibile(() => computeOraPrevista(orario(null, 0), profilo));
    attesoNonRisolvibile(() => computeOraPrevista(orario('constructor', 0), profilo));
  });

  it('la ancora assoluto non legge il profilo: passa anche con un profilo vuoto', () => {
    expect(computeOraPrevista(orario('assoluto', 510), {})).toBe('08:30');
  });
});

describe('computeOraPrevista -- offset non numerico: DomainError, non NaN:NaN', () => {
  it('offset assente, null, vuoto, NaN, non numerico', () => {
    for (const valore of [undefined, null, '', NaN, 'trenta', Infinity]) {
      const err = attesoNonRisolvibile(() => computeOraPrevista(orario('cena', valore), profilo));
      expect(err.message).toContain('offset_minuti');
    }
  });

  it('una stringa numerica resta accettata (coercizione misurata prima del cambio)', () => {
    expect(computeOraPrevista(orario('cena', '30'), profilo)).toBe('20:30');
  });
});

describe('computeOraPrevistaOnDay -- la forma per giorno', () => {
  it('in un giorno senza transizione e identica alla forma ricorrente', () => {
    expect(computeOraPrevistaOnDay(orario('colazione', 60), profilo, '2026-07-15')).toBe('08:30');
    expect(computeOraPrevistaOnDay(orario('assoluto', 150), profilo, '2026-07-15')).toBe('02:30');
  });

  it('propaga la stessa DomainError della forma ricorrente', () => {
    attesoNonRisolvibile(() =>
      computeOraPrevistaOnDay(orario('cena', 0), { ...profilo, ora_cena: null }, '2026-07-15')
    );
  });
});

describe('isOrarioNonRisolvibile', () => {
  it('e falso per ogni altro errore', () => {
    expect(isOrarioNonRisolvibile(new Error('x'))).toBe(false);
    expect(isOrarioNonRisolvibile(new DomainError('RECUPERO_NEGATIVO', 'x'))).toBe(false);
    expect(isOrarioNonRisolvibile(null)).toBe(false);
  });
});
