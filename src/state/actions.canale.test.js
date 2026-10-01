// @vitest-environment node
//
// Client of the reminder channel ad app chiusa, step 2: the thunks that carry
// the records of services/canalePush.js into the state, and the renewal at
// the opening. The channel is a reminder: whatever it does, the app opens
// (decision 15 of STATO_CORRENTE.md), so the renewal sits after INIT_SUCCESS
// and nothing it does can turn the boot into INIT_ERROR.

import { describe, it, expect, vi } from 'vitest';
import { createActions } from './actions.js';

const PROFILO = {
  id: 1, nome_profilo: 'Test', ora_sveglia: '07:00', ora_colazione: '08:00',
  ora_pranzo: '13:00', ora_cena: '20:00', ora_sonno: '23:00', attivo: 1,
};

function creaRepo(impostazioni) {
  return {
    getProfili: vi.fn().mockResolvedValue([PROFILO]),
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    getAllSettings: vi.fn().mockResolvedValue(impostazioni),
    getLogByRange: vi.fn().mockResolvedValue([]),
    drainOutbox: vi.fn().mockResolvedValue(0),
  };
}

function creaServizi(canale) {
  return {
    notifications: {
      isSupported: () => false, getPermission: () => 'default', requestPermission: vi.fn(),
      scheduleNotification: vi.fn(), cancelNotification: vi.fn(), cancelAll: vi.fn(),
      showDoseNotification: vi.fn(), getPendingCount: () => 0,
    },
    canale,
  };
}

const ATTIVA = { esito: 'attiva', motivo: null, dettaglio: null };

function monta({ impostazioni = {}, canale } = {}) {
  const dispatch = vi.fn();
  const stato = { status: 'idle', impostazioni: {} };
  const actions = createActions({
    dispatch,
    getState: () => stato,
    repo: creaRepo(impostazioni),
    services: creaServizi(canale),
  });
  return { actions, dispatch, stato };
}

const tipi = (dispatch) => dispatch.mock.calls.map(([a]) => a.type);

describe('il rinnovo all apertura', () => {
  it('dopo INIT_SUCCESS, col valore del toggle appena caricato', async () => {
    const canale = { rinnova: vi.fn().mockResolvedValue(ATTIVA) };
    const { actions, dispatch } = monta({ impostazioni: { notifiche_attive: 1 }, canale });
    await actions.init();
    await vi.waitFor(() => expect(canale.rinnova).toHaveBeenCalledWith({ voluto: true }));
    await vi.waitFor(() => expect(tipi(dispatch)).toContain('CANALE_ISCRIZIONE'));
    const sequenza = tipi(dispatch);
    expect(sequenza.indexOf('INIT_SUCCESS')).toBeLessThan(sequenza.indexOf('CANALE_ISCRIZIONE'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'CANALE_ISCRIZIONE', payload: ATTIVA });
  });

  it('un canale che rifiuta o lancia non rompe l apertura: nessun INIT_ERROR', async () => {
    for (const rinnova of [
      vi.fn().mockRejectedValue(new Error('registrazione')),
      vi.fn(() => {
        throw new Error('sincrono');
      }),
    ]) {
      const { actions, dispatch } = monta({ impostazioni: { notifiche_attive: 1 }, canale: { rinnova } });
      await expect(actions.init()).resolves.toBeUndefined();
      await vi.waitFor(() => expect(rinnova).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0));
      expect(tipi(dispatch)).toContain('INIT_SUCCESS');
      expect(tipi(dispatch)).not.toContain('INIT_ERROR');
      expect(tipi(dispatch)).not.toContain('CANALE_ISCRIZIONE');
    }
  });
});

describe('i thunk del canale', () => {
  it('il record del servizio va nello stato; null lo lascia com e', async () => {
    const canale = {
      rinnova: vi.fn().mockResolvedValue(null),
      accendi: vi.fn().mockResolvedValue(ATTIVA),
      spegni: vi.fn().mockResolvedValue({ esito: 'spenta', motivo: null, dettaglio: null }),
    };
    const { actions, dispatch } = monta({ canale });
    await expect(actions.rinnovaCanale({ voluto: false })).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    await actions.accendiCanale({ ok: true, iscrizione: {} });
    expect(canale.accendi).toHaveBeenCalledWith({ ok: true, iscrizione: {} });
    await actions.spegniCanale();
    expect(tipi(dispatch)).toEqual(['CANALE_ISCRIZIONE', 'CANALE_ISCRIZIONE']);
  });

  it('il rinnovo senza valore legge il toggle dallo stato', async () => {
    const canale = { rinnova: vi.fn().mockResolvedValue(null) };
    const { actions, stato } = monta({ canale });
    stato.impostazioni = { notifiche_attive: 1 };
    await actions.rinnovaCanale();
    expect(canale.rinnova).toHaveBeenCalledWith({ voluto: true });
  });

  it('senza servizio del canale i thunk non fanno nulla', async () => {
    const { actions, dispatch } = monta({ canale: undefined });
    await expect(actions.rinnovaCanale()).resolves.toBeNull();
    await expect(actions.accendiCanale(null)).resolves.toBeNull();
    await expect(actions.spegniCanale()).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('la pubblicazione del calendario', () => {
  const PRONTO = { status: 'ready', impostazioni: { notifiche_attive: 1 }, plan: [], lastBuiltForDay: '2026-10-07' };

  it('con l app pronta e il toggle acceso: il record va nello stato', async () => {
    const record = { esito: 'pubblicata', motivo: null, dettaglio: null, voci: 0 };
    const canale = { pubblica: vi.fn().mockResolvedValue(record) };
    const { actions, dispatch } = monta({ canale });
    await actions.pubblicaCanale(PRONTO);
    expect(canale.pubblica).toHaveBeenCalledWith(PRONTO);
    expect(dispatch).toHaveBeenCalledWith({ type: 'CANALE_PUBBLICAZIONE', payload: record });
  });

  it('a toggle spento o app non pronta nessuna pubblicazione', async () => {
    const canale = { pubblica: vi.fn().mockResolvedValue(null) };
    const { actions, dispatch } = monta({ canale });
    await actions.pubblicaCanale({ ...PRONTO, impostazioni: { notifiche_attive: 0 } });
    await actions.pubblicaCanale({ ...PRONTO, status: 'idle' });
    await actions.pubblicaCanale(null);
    expect(canale.pubblica).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('la lettura dello stato del canale', () => {
  const LETTURA = { risposta: { tolleranza_min: 20 }, lettoMono: 1, lettoMs: 2, deviceId: 'dev', errore: null };

  it('una lettura riuscita va nello stato, una fallita come errore', async () => {
    const canale = { leggiStato: vi.fn().mockResolvedValueOnce(LETTURA).mockResolvedValueOnce({ risposta: null, errore: 'x' }) };
    const { actions, dispatch } = monta({ canale });
    await actions.leggiStatoCanale({ voluto: true });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'CANALE_STATO', payload: { risposta: { tolleranza_min: 20 }, lettoMono: 1, lettoMs: 2, deviceId: 'dev' },
    });
    await actions.leggiStatoCanale({ voluto: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'CANALE_STATO_ERRORE', payload: 'x' });
  });

  it('a toggle spento nessuna lettura', async () => {
    const canale = { leggiStato: vi.fn().mockResolvedValue(LETTURA) };
    const { actions, dispatch } = monta({ canale });
    await actions.leggiStatoCanale({ voluto: false });
    await actions.leggiStatoCanale();
    expect(canale.leggiStato).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dopo una pubblicazione che ha fatto il PUT lo stato si rilegge; dopo una invariata no', async () => {
    const PRONTO = { status: 'ready', impostazioni: { notifiche_attive: 1 }, plan: [], lastBuiltForDay: '2026-10-07' };
    const canale = {
      pubblica: vi.fn()
        .mockResolvedValueOnce({ esito: 'pubblicata', motivo: null, dettaglio: null, voci: 0 })
        .mockResolvedValueOnce({ esito: 'invariata', motivo: null, dettaglio: null, voci: null })
        .mockResolvedValueOnce({ esito: 'non_pubblicata', motivo: 'pubblicazione', dettaglio: 'x', voci: null }),
      leggiStato: vi.fn().mockResolvedValue(LETTURA),
    };
    const { actions } = monta({ canale });
    await actions.pubblicaCanale(PRONTO);
    await vi.waitFor(() => expect(canale.leggiStato).toHaveBeenCalledTimes(1));
    await actions.pubblicaCanale(PRONTO);
    await new Promise((r) => setTimeout(r, 10));
    expect(canale.leggiStato).toHaveBeenCalledTimes(1);
    await actions.pubblicaCanale(PRONTO);
    await vi.waitFor(() => expect(canale.leggiStato).toHaveBeenCalledTimes(2));
  });
});
