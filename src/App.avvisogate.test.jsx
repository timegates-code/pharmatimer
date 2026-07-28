// ============================================================
// App.avvisogate.test -- CS-5.3-bis parte 3, P-3. Q-ORDITO-1=A.
// ============================================================
//
// The FIRST suite in this repo that mounts <App /> for real. That is the whole
// point: measured at FASE 0 of this session, NOTHING rendered App before --
// `main.jsx` is its only consumer, and the three `App*.test.js` files import
// pure helpers that live beside it. So the arrest criterion written in the
// previous one-liner -- "if one of the four suites goes red, the Gate is
// wrong" -- could never fire, because no suite would ever see the Gate.
//
// The exposure is the mirror image of the one that was feared: a throw inside
// the Gate reaches the PWA with nothing to intercept it, and an app that does
// not start is a dose that does not get recorded. That is M2 by a lateral
// route, and it is what these six pins exist for.
//
// DECLARED MOCKS, leaf by leaf -- no silent stubbing:
//   - ./pwa/registerSW.js : UpdatePrompt subscribes to it at mount and it
//     talks to the service worker. Same mock as UpdatePrompt.test.jsx.
//   - ./data/repository/index.js : App reads `shouldUseApiRepo()` in LoginGate
//     and OnboardingGate. Mocked to false so LoginGate renders nothing; this
//     is the pattern of AppContext.test.jsx :61.
// NOT mocked, deliberately: `./utils/avvisoScheda.js`, `./data/repository/
// avvisiStore.js`, `./components/shared/AvvisoConflittoCard.jsx` and the Gate
// itself. Mocking any of those would make the mount a puppet show and the
// pins worthless.
//
// NO `@vitest-environment` directive here: vitest.config.js has jsdom as the
// DEFAULT, and naming the directive in a jsdom file -- even to deny it -- is
// how voce 135 happened. The name is not written.
//
// SENTINEL_QORDITO_SUITE
// ============================================================

import { useMemo, useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./pwa/registerSW.js', () => ({
  subscribeUpdateAvailable: (cb) => {
    cb(false);
    return () => {};
  },
  triggerUpdate: () => {},
}));

vi.mock('./data/repository/index.js', () => ({
  shouldUseApiRepo: () => false,
  getRepository: () => ({}),
  repo: {},
}));

import App from './App.jsx';
import { AppContext } from './state/AppContext.jsx';
import { ONBOARDING_LS_KEY } from './data/db.js';
import { buildTestState } from './test/renderHelpers.jsx';
import { ESITI_SCHEDA } from './utils/avvisoScheda.js';
import { avvisoKey } from './data/repository/avvisiStore.js';

// Action bag: the NAMES are copied from renderHelpers.defaultNoopActions, so
// nothing in the tree TypeErrors on a missing thunk. No behaviour is stubbed
// here -- none of these is called by a mount.
const AZIONI = {
  init: async () => {},
  rebuildPlan: async () => {},
  presa: async () => {},
  salta: async () => {},
  sospendi: async () => {},
  recupero: async () => {},
  ripristina: async () => {},
  annullaUltima: async () => {},
  annullaAssunzione: async () => {},
  cambiaProfilo: async () => {},
  dismissPrompt: () => {},
  setSetting: async () => ({ ok: true }),
  setSimulatedNow: () => {},
  completeOnboarding: async () => {},
  drainOutbox: async () => 0,
};

// STABLE ELEMENT, and this is the load-bearing detail of the whole file.
// In production `main.jsx` passes <App /> to the provider as `children`: the
// element identity does NOT change when the provider's state changes, so
// React bails out of that subtree and ONLY CONSUMERS re-render. Rebuilding
// the element inside the bench would re-render everything on every tick, and
// the pin of Q-ORDITO-2=A would go green whether or not the Gate consumes the
// context -- an outcome compatible with both hypotheses, which is exactly what
// LC-106 forbids. Hoisting it here is what keeps that pin a MEASURE.
const ALBERO = (
  <MemoryRouter initialEntries={['/oggi']}>
    <App />
  </MemoryRouter>
);

function Banco({ stato }) {
  const [tickMs, setTickMs] = useState(1);
  const value = useMemo(
    () => ({ state: stato, actions: AZIONI, tickMs }),
    [stato, tickMs],
  );
  return (
    <AppContext.Provider value={value}>
      <button
        type="button"
        data-testid="banco-tick"
        onClick={() => setTickMs((n) => n + 1)}
      >
        tick
      </button>
      {ALBERO}
    </AppContext.Provider>
  );
}

function montaApp(stato = buildTestState()) {
  return render(<Banco stato={stato} />);
}

// Record shape copied from avvisiStore.salvaAvviso :118-131. Written straight
// to localStorage on purpose: F2 does not exist yet, so the Gate must be
// exercised against the SEAT and not against a writer that is still to come.
function scriviAvviso(overrides = {}) {
  const record = {
    client_op_id: 'targa-1',
    farmaco_nome: 'Demo Med',
    dose_numero: 2,
    data: '2026-07-24',
    ora_tocco: '2026-07-24T11:05:00.000Z',
    op: 'presa',
    motivo: 'CONFLITTO_VERO',
    creato_at: '2026-07-24T11:06:00.000Z',
    ...overrides,
  };
  localStorage.setItem(avvisoKey(record.client_op_id), JSON.stringify(record));
  return record;
}

beforeEach(() => {
  localStorage.clear();
  // Keeps OnboardingGate shut regardless of how selectImpostazione reads the
  // state: shouldOpenOnboarding :80 returns false on the localStorage mirror
  // alone. Belt and suspenders, and declared rather than assumed.
  localStorage.setItem(ONBOARDING_LS_KEY, '1');
});

describe('AvvisoConflittoGate montato in App (Q-ORDITO-1=A)', () => {
  it('G1 -- senza avvisi App monta e il Gate non rende nulla', () => {
    montaApp();
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();
  });

  it('G2 -- un record leggibile mostra la scheda COMPLETA con i fatti', () => {
    scriviAvviso();
    montaApp();
    const card = screen.getByTestId('avviso-conflitto-card');
    expect(card).toBeTruthy();
    expect(card.querySelector('[data-esito]').getAttribute('data-esito')).toBe(
      ESITI_SCHEDA.COMPLETA,
    );
    expect(screen.getByTestId('avviso-fatti').textContent).toContain('Demo Med');
  });

  it('G3 -- un record illeggibile mostra la DEGRADATA e App non lancia', () => {
    scriviAvviso({ data: 'non-una-data' });
    expect(() => montaApp()).not.toThrow();
    const card = screen.getByTestId('avviso-conflitto-card');
    expect(card.querySelector('[data-esito]').getAttribute('data-esito')).toBe(
      ESITI_SCHEDA.DEGRADATA,
    );
    // The degraded card must NOT invent facts: Q-TRAMA-4=A keeps four lines
    // and drops the facts, it does not fill them with something plausible.
    expect(screen.getByTestId('avviso-fatti').textContent).not.toContain(
      'Demo Med',
    );
  });

  it('G4 -- Ho letto rimuove il record e la scheda sparisce', async () => {
    const record = scriviAvviso();
    montaApp();
    expect(screen.getByTestId('avviso-conflitto-card')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /ho letto/i }));

    expect(localStorage.getItem(avvisoKey(record.client_op_id))).toBeNull();
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();
  });

  it('G5 -- un avviso scritto ad app montata compare al cambio di contesto, senza interazione con la scheda (Q-ORDITO-2=A)', async () => {
    montaApp();
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();

    // This is what F2 will do from inside the guardian: write the seat and
    // nothing else. localStorage notifies nobody, so what follows is the
    // whole guarantee of Q-ORDITO-2=A.
    scriviAvviso();
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();

    await userEvent.click(screen.getByTestId('banco-tick'));

    expect(screen.getByTestId('avviso-conflitto-card')).toBeTruthy();
  });

  it('G6 -- con due record si mostra UNA sola scheda, la piu vecchia (Q-TRAMA-5=A)', () => {
    scriviAvviso({
      client_op_id: 'targa-nuova',
      farmaco_nome: 'Farmaco Nuovo',
      creato_at: '2026-07-24T18:00:00.000Z',
    });
    scriviAvviso({
      client_op_id: 'targa-vecchia',
      farmaco_nome: 'Farmaco Vecchio',
      creato_at: '2026-07-24T06:00:00.000Z',
    });
    montaApp();

    expect(screen.getAllByTestId('avviso-conflitto-card')).toHaveLength(1);
    expect(screen.getByTestId('avviso-fatti').textContent).toContain(
      'Farmaco Vecchio',
    );
  });
});
