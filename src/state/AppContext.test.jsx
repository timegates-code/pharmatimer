// ============================================================
// AppContext / AppProvider — dual-mode contract tests +
// CP4 wiring tests (Sessione 9-B parte 2/2 §6.126 / §6.131).
// ============================================================
//
// Scope Sessione 7d-2 CP2 (§6.49 / AMB-7d-2.B):
//   (A) When initialStateProp is passed, Provider does NOT invoke
//       any repo method (init path is skipped).
//   (B) Post-mount state reflects seed via shallow spread.
//
// Scope CP4 Sessione 9-B parte 2/2 (§6.126):
//   (C) services bag exposed in context value
//   (D) useApp alias mirrors useAppContext (§6.125)
//   (E) setSetting toggle wiring (notifiche_attive on/off)
//   (F) maybeReschedule gate on impostazioni.notifiche_attive=1
//
// Strategy:
// - Repo mocked via vi.mock (hoisted).
// - notifications singleton spied via vi.spyOn — the AppProvider
//   imports the same module-scoped instance, so spies on its
//   methods intercept calls made by createActions(...).
// - NO vi.useFakeTimers(): @testing-library waitFor uses setTimeout
//   for retry loops; fake timers cause indefinite hangs.
//   Today's date is computed dynamically via localToday() to match
//   selectToday's local-time output.
//
// Environment: jsdom (default) — React rendering required.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';

// Hoisted mock so vi.mock factory below can close over the stub.
const { repoMock } = vi.hoisted(() => {
  const mk = (val) => vi.fn().mockResolvedValue(val);
  return {
    repoMock: {
      getProfili: mk([]),
      getProfiloAttivo: mk(null),
      getFarmaci: mk([]),
      getAllOrari: mk([]),
      getLogByData: mk([]),
      getLogByRange: mk([]),
      getLogByFarmacoData: mk([]),
      getAllSettings: mk({}),
      // init()-only reads above; include extras defensively so any future
      // expansion of actions.init() doesn't silently pass through.
      upsertLogsBatch: mk([]),
      setProfiloAttivo: mk(undefined),
      setProfiloAttivoConCleanup: mk(undefined),
      setSetting: mk(undefined),
      // SENTINEL_QOCT_MOCK_DRAIN
      // CS-4.26: il thunk di drenaggio chiama repo.drainOutbox(). Senza
      // questa voce il ramo catch del thunk diventerebbe il percorso
      // normale, e i pin sui trigger passerebbero per il motivo sbagliato.
      drainOutbox: mk(0),
    },
  };
});

vi.mock('../data/repository/index.js', () => ({ repo: repoMock }));

// Import AFTER vi.mock so the mocked module is in the import graph.
import { AppProvider, useAppContext, useApp } from './AppContext.jsx';
import { notifications } from '../services/notifications.js';

/**
 * Minimal consumer that forwards state updates to a spy.
 * Used to observe post-dispatch state without relying on timing.
 */
function Probe({ onState }) {
  const ctx = useAppContext();
  useEffect(() => {
    onState(ctx.state);
  }, [ctx.state, onState]);
  return null;
}

describe('AppProvider — dual-mode (Sessione 7d-2 CP2)', () => {
  beforeEach(() => {
    // Reset call history on each method between tests; preserves
    // mockResolvedValue configuration.
    Object.values(repoMock).forEach((fn) => fn.mockClear());
  });

  it('does not invoke any repo fetch method when initialStateProp is provided', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: null,
    };

    render(
      <AppProvider initialStateProp={seed}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    // Flush microtasks + a macrotask so any async init() chain would have
    // started its first await (and thus touched repoMock). If the seed
    // path is honored, no method is ever called.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(repoMock.getProfili).not.toHaveBeenCalled();
    expect(repoMock.getProfiloAttivo).not.toHaveBeenCalled();
    expect(repoMock.getFarmaci).not.toHaveBeenCalled();
    expect(repoMock.getAllOrari).not.toHaveBeenCalled();
    expect(repoMock.getLogByData).not.toHaveBeenCalled();
    expect(repoMock.getAllSettings).not.toHaveBeenCalled();
  });

  it('applies initialStateProp via shallow spread; untouched fields keep initialState defaults', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: { id: 7, nome_profilo: 'Test' },
    };
    const captured = [];

    render(
      <AppProvider initialStateProp={seed}>
        <Probe onState={(s) => captured.push(s)} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(captured.some((s) => s.status === 'ready')).toBe(true);
    });

    const last = captured.at(-1);
    // Seed fields applied.
    expect(last.status).toBe('ready');
    expect(last.profiloAttivo).toEqual({ id: 7, nome_profilo: 'Test' });
    // §6.77 cleanup: state.nomeUtente mirror rimosso — non deve apparire
    // nello state anche se il seed non lo cita.
    expect(last).not.toHaveProperty('nomeUtente');
    // Non-seeded fields preserved from initialState (NOT wiped).
    expect(last.plan).toEqual([]);
    expect(last.presoStack).toEqual([]);
    expect(last.impostazioni).toEqual({});
    expect(last.error).toBeNull();
  });
});

// ============================================================
// CP4 §6.131 — wiring tests (Sessione 9-B parte 2/2 §6.126).
// ============================================================

/**
 * Local YYYY-MM-DD per selectToday's convention. Computed dynamically
 * (no fake timers / setSystemTime) so `selectEntriesForDay(state, today)`
 * matches plan entries created in the test seed regardless of run date.
 */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('AppProvider — CP4 wiring (Sessione 9-B parte 2/2 §6.126)', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockClear());
    // Pulisci eventuali timer pendenti del singleton da test precedenti.
    notifications.cancelAll();
    // Spy con `mockImplementation(() => {})` per showDoseNotification:
    // l'originale tenta `new globalThis.Notification(...)` dopo setTimeout,
    // jsdom non lo implementa, e con real timers il timer finirebbe per
    // sparare. Bypassando l'implementazione, l'asserzione spia verifica
    // solo l'invocazione + argomenti.
    vi.spyOn(notifications, 'cancelAll');
    vi.spyOn(notifications, 'showDoseNotification').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('§6.126: services bag esposto nel context value (.notifications con API completa)', async () => {
    let captured = null;
    function ServicesProbe() {
      const ctx = useAppContext();
      captured = ctx.services;
      return null;
    }
    render(
      <AppProvider initialStateProp={{ status: 'ready', profiloAttivo: null }}>
        <ServicesProbe />
      </AppProvider>
    );
    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured.notifications).toBeDefined();
    expect(typeof captured.notifications.cancelAll).toBe('function');
    expect(typeof captured.notifications.showDoseNotification).toBe('function');
    expect(typeof captured.notifications.scheduleNotification).toBe('function');
    expect(typeof captured.notifications.getPendingCount).toBe('function');
  });

  it('§6.125: useApp alias restituisce stesso ctx di useAppContext', async () => {
    let viaAppContext = null;
    let viaUseApp = null;
    function Probe1() {
      viaAppContext = useAppContext();
      return null;
    }
    function Probe2() {
      viaUseApp = useApp();
      return null;
    }
    render(
      <AppProvider initialStateProp={{ status: 'ready', profiloAttivo: null }}>
        <Probe1 />
        <Probe2 />
      </AppProvider>
    );
    await waitFor(() => expect(viaAppContext).not.toBeNull());
    expect(viaUseApp).not.toBeNull();
    // Stessa context value (same reference perché entrambi useContext(AppContext))
    expect(viaUseApp.actions).toBe(viaAppContext.actions);
    expect(viaUseApp.services).toBe(viaAppContext.services);
    expect(viaUseApp.state).toBe(viaAppContext.state);
  });

  it('§6.126: setSetting con chiave non-notifiche NON triggera reschedule né cancelAll', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: { id: 1, nome_profilo: 'Test' },
      impostazioni: { notifiche_attive: 1 },
    };
    let actions = null;
    function ActionsProbe() {
      actions = useAppContext().actions;
      return null;
    }
    render(
      <AppProvider initialStateProp={seed}>
        <ActionsProbe />
      </AppProvider>
    );
    await waitFor(() => expect(actions).not.toBeNull());
    notifications.cancelAll.mockClear();
    notifications.showDoseNotification.mockClear();
    await act(async () => {
      await actions.setSetting('nome_utente', 'Roberto');
    });
    expect(notifications.cancelAll).not.toHaveBeenCalled();
    expect(notifications.showDoseNotification).not.toHaveBeenCalled();
  });

  it('§6.126: setSetting toggle off (notifiche_attive=0) chiama services.notifications.cancelAll', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: { id: 1, nome_profilo: 'Test' },
      impostazioni: { notifiche_attive: 1 },
      plan: [],
      farmaci: [],
    };
    let actions = null;
    function ActionsProbe() {
      actions = useAppContext().actions;
      return null;
    }
    render(
      <AppProvider initialStateProp={seed}>
        <ActionsProbe />
      </AppProvider>
    );
    await waitFor(() => expect(actions).not.toBeNull());
    notifications.cancelAll.mockClear();
    notifications.showDoseNotification.mockClear();
    await act(async () => {
      await actions.setSetting('notifiche_attive', 0);
    });
    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(notifications.showDoseNotification).not.toHaveBeenCalled();
  });

  it('§6.126/§6.132: setSetting toggle on (notifiche_attive=1) triggera rescheduleAllNotifications', async () => {
    // §6.132: il fix bypassa il gate maybeReschedule (stateRef-lag dopo
    // l'optimistic dispatch), così rescheduleAllNotifications viene
    // invocato direttamente con lo state corrente (plan+farmaci unchanged
    // dal SET_IMPOSTAZIONE).
    const today = localToday();
    const seed = {
      status: 'ready',
      profiloAttivo: { id: 1, nome_profilo: 'Test' },
      impostazioni: { notifiche_attive: 0 },
      plan: [
        {
          dateStr: today,
          stato: 'prevista',
          orario: { farmaco_id: 7, dose_numero: 1 },
          // Ora futura nello stesso giorno: setTimeout delay > 0,
          // così scheduleNotification non scatta no-op.
          ora_prevista: '23:55',
        },
      ],
      farmaci: [{ id: 7, nome: 'TestMed', relazione_pasto: 'durante' }],
    };
    let actions = null;
    function ActionsProbe() {
      actions = useAppContext().actions;
      return null;
    }
    render(
      <AppProvider initialStateProp={seed}>
        <ActionsProbe />
      </AppProvider>
    );
    await waitFor(() => expect(actions).not.toBeNull());
    notifications.cancelAll.mockClear();
    notifications.showDoseNotification.mockClear();
    await act(async () => {
      await actions.setSetting('notifiche_attive', 1);
    });
    // Toggle on: rescheduleAllNotifications invocato direttamente
    // (§6.132). cancelAll è la prima istruzione nella reschedule;
    // showDoseNotification viene chiamato per l'unica entry 'prevista'
    // di today.
    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(notifications.showDoseNotification).toHaveBeenCalledTimes(1);
    const farmacoArg = notifications.showDoseNotification.mock.calls[0][1];
    expect(farmacoArg.id).toBe(7);
  });
});

// ============================================================
// SENTINEL_QOCT_PIN_TRIGGER_BLOCCO
// Trigger di drenaggio (CS-4.26, Spec 14.2 punti 2, 3 e 4).
// ============================================================
// Senza questi pin i tre trigger a evento sono rimovibili senza che nulla
// diventi rosso, e sono lunico meccanismo che porta fuori dal telefono una
// presa registrata offline: M2 per omissione di guardia.
//
// Tutte le prove montano sulla via SEED, quindi `actions.init()` non gira
// e il contatore del throttle parte da zero a ogni montaggio: una passata
// per prova, senza interferenze fra trigger.

describe('AppProvider -- trigger di drenaggio (CS-4.26)', () => {
  const SEED = { status: 'ready', profiloAttivo: { id: 7, nome_profilo: 'Test' } };
  let spiaInterval = null;

  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    // Ripristino MIRATO, non globale. Non perche `vi.restoreAllMocks()`
    // sia pericoloso qui -- questo file lo usa gia nel describe CP4 ed e
    // verde -- ma perche ripristinare SOLO cio che si e creato e lo
    // intervento minimo e non dipende dalla semantica di
    // `restoreAllMocks`, che e cambiata fra versioni di vitest.
    if (spiaInterval) {
      spiaInterval.mockRestore();
      spiaInterval = null;
    }
  });

  it('trigger 3: levento online DEDICATO chiede una passata', async () => {
    // SENTINEL_QOCT_PIN_TRIGGER_ONLINE
    render(
      <AppProvider initialStateProp={SEED}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(repoMock.drainOutbox).toHaveBeenCalledTimes(1);
  });

  it('trigger 2: visibilitychange chiede una passata', async () => {
    // SENTINEL_QOCT_PIN_TRIGGER_PRIMOPIANO
    render(
      <AppProvider initialStateProp={SEED}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(repoMock.drainOutbox).toHaveBeenCalledTimes(1);
  });

  it('trigger 4: il tick chiede una passata, senza toccare alcun timer', async () => {
    // SENTINEL_QOCT_PIN_TRIGGER_TICK
    // `setInterval` e spiato e lo handler invocato a mano: il tick e
    // pinnato davvero, ma senza fake timer e quindi senza il rischio di
    // hang che il commento in testa a questo file documenta.
    spiaInterval = vi.spyOn(globalThis, 'setInterval');

    render(
      <AppProvider initialStateProp={SEED}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    const chiamata = spiaInterval.mock.calls.find(([, ms]) => ms === 60000);
    expect(chiamata).toBeDefined();

    await act(async () => {
      chiamata[0]();
    });

    expect(repoMock.drainOutbox).toHaveBeenCalledTimes(1);
  });

  it('il listener online viene RIMOSSO allo smontaggio', async () => {
    // SENTINEL_QOCT_PIN_CLEANUP_ONLINE
    // Un listener registrato e mai rimosso si accumula a ogni rimontaggio:
    // N passate per un solo evento, e il budget `attempts` bruciato N
    // volte piu in fretta.
    const { unmount } = render(
      <AppProvider initialStateProp={SEED}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    unmount();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(repoMock.drainOutbox).not.toHaveBeenCalled();
  });
});
