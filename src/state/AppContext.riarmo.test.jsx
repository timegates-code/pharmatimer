// ============================================================
// The page timers re-armed on the state React has committed.
// ============================================================
// Ratification A of 2026-10-01 (client of the reminder channel, step 3).
// The seats of maybeReschedule in actions.js read stateRef, which follows a
// dispatch one render later. Measured in this session with two probes whose
// outcomes were declared first: at a cold opening the seat of init armed
// nothing, and after addFarmaco the seat re-armed the plan WITHOUT the new
// farmaco; a visibilitychange afterwards armed both (the positive control).
// The same holds in production: the code served by the Mini (820e1ed) has
// the same seats. These two pins are those probes, kept: red before the
// effect of AppContext, green with it, without any foreground event.
//
// The real AppProvider on the init path, with a repo stub. The notifications
// singleton is spied and its showDoseNotification stubbed: what is pinned is
// WHICH doses get armed, not the timers (services/notifications.test.js).
// Rows in the bench: effetto-apertura-non-arma.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';

const PROFILO = {
  id: 1, nome_profilo: 'Standard', ora_sveglia: '07:00', ora_colazione: '07:30',
  ora_pranzo: '13:00', ora_cena: '20:00', ora_sonno: '23:30', attivo: 1,
};
// Every day at 12:00 (offset from midnight): an entry for today in the plan.
const ORARIO = { id: 1, farmaco_id: 10, dose_numero: 1, offset_minuti: 720, ancora_riferimento: 'assoluto' };
const FARMACO = {
  id: 10, nome: 'Eutirox 50', tipo_frequenza: 'fisso', intervallo_ore: null,
  intervallo_minimo_ore: null, dosi_giornaliere: 1, relazione_pasto: 'indifferente',
  data_inizio: '2020-01-01', data_fine: null, attivo: 1,
};

const { repoMock, archivio } = vi.hoisted(() => {
  const archivio = { farmaci: [], orari: [] };
  const mk = (val) => vi.fn().mockResolvedValue(val);
  return {
    archivio,
    repoMock: {
      getProfili: vi.fn(),
      getFarmaci: vi.fn(async () => archivio.farmaci),
      getAllOrari: vi.fn(async () => archivio.orari),
      getAllSettings: mk([{ chiave: 'notifiche_attive', valore: 1 }]),
      getLogByRange: mk([]),
      drainOutbox: mk(0),
      withTransaction: vi.fn(async (_modo, _tabelle, operazione) => operazione()),
      addFarmaco: vi.fn(),
      replaceOrariForFarmaco: mk(undefined),
    },
  };
});

vi.mock('../data/repository/index.js', () => ({ repo: repoMock, shouldUseApiRepo: () => false }));

import { AppProvider, useAppContext } from './AppContext.jsx';
import { notifications } from '../services/notifications.js';
import { canalePush } from '../services/canalePush.js';

function Sonda({ alContesto }) {
  const contesto = useAppContext();
  useEffect(() => {
    alContesto(contesto);
  }, [contesto, alContesto]);
  return null;
}

function armatePer(idFarmaco) {
  return notifications.showDoseNotification.mock.calls.filter(([, f]) => f && f.id === idFarmaco).length;
}

let spia = null;
let spiaPubblica = null;

beforeEach(() => {
  repoMock.getProfili.mockResolvedValue([PROFILO]);
  spia = vi.spyOn(notifications, 'showDoseNotification').mockImplementation(() => {});
  spiaPubblica = vi.spyOn(canalePush, 'pubblica').mockResolvedValue(null);
});

afterEach(() => {
  // Targeted restore: restoreAllMocks would also empty the repo stubs.
  spia.mockRestore();
  spiaPubblica.mockRestore();
  archivio.farmaci = [];
  archivio.orari = [];
});

describe('i timer di pagina si armano sullo stato applicato', () => {
  it('all apertura a freddo la dose di oggi e armata, senza alcun evento', async () => {
    archivio.farmaci = [FARMACO];
    archivio.orari = [ORARIO];
    let contesto = null;
    render(
      <AppProvider>
        <Sonda alContesto={(c) => { contesto = c; }} />
      </AppProvider>
    );
    await waitFor(() => expect(contesto?.state.status).toBe('ready'));
    await waitFor(() => expect(armatePer(10)).toBeGreaterThan(0));
  });

  it('un farmaco aggiunto ha la sua dose armata, senza alcun evento', async () => {
    repoMock.addFarmaco.mockImplementation(async () => {
      archivio.farmaci = [FARMACO];
      archivio.orari = [ORARIO];
      return 10;
    });
    let contesto = null;
    render(
      <AppProvider>
        <Sonda alContesto={(c) => { contesto = c; }} />
      </AppProvider>
    );
    await waitFor(() => expect(contesto?.state.status).toBe('ready'));
    expect(armatePer(10)).toBe(0);
    await act(async () => {
      await contesto.actions.addFarmaco({ nome: 'Eutirox 50' }, [ORARIO]);
    });
    await waitFor(() => expect(armatePer(10)).toBeGreaterThan(0));
  });
});

// The calendar of the channel is published from the same seat and on the
// same state (step 3). Rows in the bench: effetto-non-pubblica.
function pubblicatiCon(idFarmaco) {
  return spiaPubblica.mock.calls.filter(([stato]) =>
    stato.status === 'ready' && stato.plan.some((e) => e.farmaco.id === idFarmaco)
  ).length;
}

describe('il calendario si pubblica sullo stato applicato', () => {
  it('all apertura a freddo il calendario si pubblica, senza alcun evento', async () => {
    archivio.farmaci = [FARMACO];
    archivio.orari = [ORARIO];
    let contesto = null;
    render(
      <AppProvider>
        <Sonda alContesto={(c) => { contesto = c; }} />
      </AppProvider>
    );
    await waitFor(() => expect(contesto?.state.status).toBe('ready'));
    await waitFor(() => expect(pubblicatiCon(10)).toBeGreaterThan(0));
  });

  it('un farmaco aggiunto ripubblica il calendario con la sua dose, senza alcun evento', async () => {
    repoMock.addFarmaco.mockImplementation(async () => {
      archivio.farmaci = [FARMACO];
      archivio.orari = [ORARIO];
      return 10;
    });
    let contesto = null;
    render(
      <AppProvider>
        <Sonda alContesto={(c) => { contesto = c; }} />
      </AppProvider>
    );
    await waitFor(() => expect(contesto?.state.status).toBe('ready'));
    expect(pubblicatiCon(10)).toBe(0);
    await act(async () => {
      await contesto.actions.addFarmaco({ nome: 'Eutirox 50' }, [ORARIO]);
    });
    await waitFor(() => expect(pubblicatiCon(10)).toBeGreaterThan(0));
  });
});
