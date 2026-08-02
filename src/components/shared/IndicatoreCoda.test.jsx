// ============================================================
// IndicatoreCoda -- pins. CS-5.5-quater, P-1.
// SENTINEL_QROSONE_INDICATORE_TEST
// ------------------------------------------------------------
// Mocking strategy copied from the seat next door, ErrorSurface.test.jsx
// :28-48: `vi.mock` replaces AppContext and useTheme at module-resolution
// time, and `mockState` is a let-binding the mocked hook closes over.
// The mocked AppContext exposes `useAppContext` and NOT `useApp`, which
// is why the component imports the former: `useApp` is only an alias
// declared inside the real module (AppContext.jsx :258) and a factory
// that omits it would leave it undefined.
//
// `testi.js` is NOT mocked, on purpose. The phrases are imported and
// asserted by IDENTITY, so a copy edit either propagates or breaks these
// pins -- it can never drift silently between copy and surface.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import IndicatoreCoda, { scegliStatoCoda } from './IndicatoreCoda.jsx';
import {
  STATI_CODA,
  INDICATORE_QUIETE_ETICHETTA,
  INDICATORE_DA_INVIARE_RASSICURAZIONE,
  INDICATORE_DA_CONTROLLARE_RASSICURAZIONE,
} from '../../utils/testi.js';

let mockState = { coda: null };

vi.mock('../../state/AppContext.jsx', () => ({
  useAppContext: () => ({ state: mockState }),
}));

vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    tokens: {
      // Values measured in src/utils/theme.js :59-60 and :78 (light mode).
      textPrimary: '#1C1917',
      textSecondary: '#57534E',
      amberTx: '#92400E',
    },
    mode: 'light',
  }),
}));

function montaCon(coda) {
  mockState = { coda };
  return render(<IndicatoreCoda />);
}

function glifoDi(coda) {
  const { container } = montaCon(coda);
  const svg = container.querySelector('[data-testid="indicatore-coda"] svg');
  return svg === null ? null : svg.innerHTML;
}

beforeEach(() => {
  mockState = { coda: null };
});

afterEach(() => {
  cleanup();
});

// ------------------------------------------------------------
// F1 -- the precedence, exercised without a DOM.
// ------------------------------------------------------------
describe('scegliStatoCoda -- precedenza in sede unica (Q-LUCERNA-9=A)', () => {
  it('coda null significa NON ANCORA NOTO e non quiete', () => {
    expect(scegliStatoCoda(null)).toBeNull();
  });

  it('coda undefined e la stessa ignoranza di null', () => {
    expect(scegliStatoCoda(undefined)).toBeNull();
  });

  it('coda vuota su entrambi i conteggi da QUIETE', () => {
    expect(scegliStatoCoda({ pending: 0, parked: 0 })).toEqual({
      stato: STATI_CODA.QUIETE,
      n: 0,
    });
  });

  it('solo pending da DA_INVIARE col conteggio dei pending', () => {
    expect(scegliStatoCoda({ pending: 3, parked: 0 })).toEqual({
      stato: STATI_CODA.DA_INVIARE,
      n: 3,
    });
  });

  it('solo parked da DA_CONTROLLARE col conteggio dei parked', () => {
    expect(scegliStatoCoda({ pending: 0, parked: 2 })).toEqual({
      stato: STATI_CODA.DA_CONTROLLARE,
      n: 2,
    });
  });

  it('PIN M2: con entrambi non vuoti vince parked, e n e il conteggio dei parked', () => {
    // L ordine opposto seppellirebbe lo stato che chiede mani umane sotto
    // uno dichiarato "non devi fare niente". Questo e il pin portante.
    expect(scegliStatoCoda({ pending: 5, parked: 2 })).toEqual({
      stato: STATI_CODA.DA_CONTROLLARE,
      n: 2,
    });
  });

  it('conteggi non interi degradano a zero invece di sollevare', () => {
    expect(scegliStatoCoda({ pending: 'x', parked: null })).toEqual({
      stato: STATI_CODA.QUIETE,
      n: 0,
    });
  });
});

// ------------------------------------------------------------
// F2 -- what reaches the screen.
// ------------------------------------------------------------
describe('IndicatoreCoda -- resa dei tre stati', () => {
  it('CONTROLLO POSITIVO: in quiete la sonda VEDE lo indicatore', () => {
    // Senza questo, l asserzione di assenza qui sotto sarebbe verde anche
    // se il meccanismo non guardasse nulla (LC-106).
    montaCon({ pending: 0, parked: 0 });
    expect(screen.queryByTestId('indicatore-coda')).not.toBeNull();
  });

  it('coda non ancora nota: non rende NULLA', () => {
    montaCon(null);
    expect(screen.queryByTestId('indicatore-coda')).toBeNull();
  });

  it('quiete: etichetta dalla copy e NESSUNA seconda riga', () => {
    montaCon({ pending: 0, parked: 0 });
    expect(screen.getByTestId('indicatore-coda-etichetta').textContent).toBe(
      INDICATORE_QUIETE_ETICHETTA,
    );
    expect(screen.queryByTestId('indicatore-coda-rassicurazione')).toBeNull();
  });

  it('da inviare: etichetta col referente nella frase, piu la rassicurazione', () => {
    montaCon({ pending: 3, parked: 0 });
    expect(screen.getByTestId('indicatore-coda-etichetta').textContent).toBe(
      'Da inviare: 3 registrazioni',
    );
    expect(
      screen.getByTestId('indicatore-coda-rassicurazione').textContent,
    ).toBe(INDICATORE_DA_INVIARE_RASSICURAZIONE);
  });

  it('da inviare a uno: accordo di numero al singolare', () => {
    montaCon({ pending: 1, parked: 0 });
    expect(screen.getByTestId('indicatore-coda-etichetta').textContent).toBe(
      'Da inviare: 1 registrazione',
    );
  });

  it('da controllare: etichetta piu la rassicurazione che non chiede nulla adesso', () => {
    montaCon({ pending: 0, parked: 2 });
    expect(screen.getByTestId('indicatore-coda-etichetta').textContent).toBe(
      'Da controllare: 2 registrazioni',
    );
    expect(
      screen.getByTestId('indicatore-coda-rassicurazione').textContent,
    ).toBe(INDICATORE_DA_CONTROLLARE_RASSICURAZIONE);
  });

  it('PIN M2 sullo schermo: con entrambi non vuoti si legge Da controllare', () => {
    montaCon({ pending: 5, parked: 2 });
    const etichetta = screen.getByTestId('indicatore-coda-etichetta').textContent;
    expect(etichetta).toBe('Da controllare: 2 registrazioni');
    expect(etichetta).not.toContain('Da inviare');
  });
});

// ------------------------------------------------------------
// F3 -- the clinical invariants of 14.5.
// ------------------------------------------------------------
describe('IndicatoreCoda -- invarianti clinici di 14.5', () => {
  it('sempre icona PIU testo, in tutti e tre gli stati', () => {
    for (const coda of [
      { pending: 0, parked: 0 },
      { pending: 3, parked: 0 },
      { pending: 0, parked: 2 },
    ]) {
      const { container } = montaCon(coda);
      const nodo = container.querySelector('[data-testid="indicatore-coda"]');
      expect(nodo.querySelector('svg')).not.toBeNull();
      expect(
        screen.getByTestId('indicatore-coda-etichetta').textContent.trim(),
      ).not.toBe('');
      cleanup();
    }
  });

  it('MAI SOLO COLORE: i tre stati portano tre glifi DISTINTI', () => {
    const quiete = glifoDi({ pending: 0, parked: 0 });
    cleanup();
    const daInviare = glifoDi({ pending: 3, parked: 0 });
    cleanup();
    const daControllare = glifoDi({ pending: 0, parked: 2 });
    cleanup();
    expect(quiete).not.toBeNull();
    expect(new Set([quiete, daInviare, daControllare]).size).toBe(3);
  });

  it('AREA DI TOCCO SPENTA fino a CS-5.6: niente bottone, niente focus, niente handler', () => {
    const { container } = montaCon({ pending: 3, parked: 0 });
    const nodo = container.querySelector('[data-testid="indicatore-coda"]');
    expect(screen.queryByRole('button')).toBeNull();
    expect(nodo.querySelector('[tabindex]')).toBeNull();
    expect(nodo.getAttribute('role')).toBeNull();
    expect(nodo.outerHTML).not.toContain('onclick');
  });

  it('NESSUN aria-live: il rumore addestra a ignorare i messaggi', () => {
    const { container } = montaCon({ pending: 0, parked: 2 });
    const nodo = container.querySelector('[data-testid="indicatore-coda"]');
    expect(nodo.getAttribute('aria-live')).toBeNull();
    expect(nodo.querySelector('[aria-live]')).toBeNull();
  });
});
