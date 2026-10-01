// ============================================================
// SezioneCanale -- the whole state of the reminder channel ad app chiusa in
// Impostazioni (step 4 of the client). The head and its reason, what the
// server says, the last outcomes where a 201 is "accettato" and never
// "consegnato" (decision 2), "Verifica ora". Rows in the bench: sezione-*.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContext } from '../../state/AppContext.jsx';
import { initialState } from '../../state/reducer.js';
import ImpostazioniTab from './ImpostazioniTab.jsx';

const DEV = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

function risposta(campi = {}) {
  const ora = Date.now();
  return {
    ora_server_ms: ora,
    tolleranza_min: 20,
    canale: { attivo: true, motivo: null },
    pianificatore: { ultima_passata_ms: ora - 30_000, eta_ms: 30_000, esito: 'ok', dettaglio: null },
    iscrizioni: [{ device_id: DEV, attiva: true, confermata_ms: ora - 60_000 }],
    pubblicazione: { device_id: DEV, pubblicata_ms: ora - 120_000, orizzonte_fino_ms: ora + 86_400_000,
      avviso_fine_ms: ora + 80_000_000, avviso_fine_entro_ms: ora + 81_200_000, voci: 9 },
    ultimi_invii: [
      { device_id: DEV, farmaco_id: 7, data: '2026-10-07', dose_numero: 1, istante_ms: ora - 600_000,
        forma: 'dose', stato: 'accettato', motivo: null, http_status: 201, deciso_ms: ora - 590_000,
        inviato_ms: ora - 590_000 },
      { device_id: DEV, farmaco_id: 7, data: '2026-10-07', dose_numero: 2, istante_ms: ora - 300_000,
        forma: null, stato: 'non_inviato', motivo: 'presa', http_status: null, deciso_ms: ora - 290_000,
        inviato_ms: null },
    ],
    ultimi_avvisi_fine: [],
    ...campi,
  };
}

function monta({ campiRisposta = {}, impostazioni = { notifiche_attive: 1 }, canale } = {}) {
  const actions = {
    setSetting: vi.fn().mockResolvedValue({ ok: true }),
    resetAllData: vi.fn(),
    accendiCanale: vi.fn().mockResolvedValue(null),
    rinnovaCanale: vi.fn().mockResolvedValue(null),
    leggiStatoCanale: vi.fn().mockResolvedValue(null),
  };
  const state = {
    ...initialState,
    status: 'ready',
    impostazioni,
    farmaci: [{ id: 7, nome: 'Eutirox 50' }],
    canale: canale === undefined
      ? {
        iscrizione: { esito: 'attiva', motivo: null, dettaglio: null },
        stato: { risposta: risposta(campiRisposta), lettoMono: globalThis.performance.now(), lettoMs: Date.now(), deviceId: DEV },
        statoErrore: null,
        pubblicazione: { esito: 'pubblicata', motivo: null, dettaglio: null, voci: 9 },
      }
      : canale,
  };
  // The toggle's hook reads the permission from here: granted, so it does
  // not switch the toggle off under the test.
  const notifications = {
    isSupported: () => true, getPermission: () => 'granted', requestPermission: vi.fn(),
    cancelAll: vi.fn(), scheduleNotification: vi.fn(), cancelNotification: vi.fn(),
    showDoseNotification: vi.fn(), getPendingCount: () => 0,
  };
  render(
    <AppContext.Provider value={{ state, actions, services: { notifications }, tickMs: Date.now() }}>
      <ImpostazioniTab />
    </AppContext.Provider>
  );
  return { actions };
}

describe('la sezione del canale in Impostazioni', () => {
  it('lo stato intero: testa, telefono, calendario, invii', () => {
    monta();
    expect(screen.getByTestId('sezione-canale-stato')).toHaveTextContent(/Promemoria ad app chiusa attivi, ultima verifica alle \d\d:\d\d\./);
    expect(screen.queryByTestId('sezione-canale-perche')).toBeNull();
    const sezione = screen.getByTestId('sezione-canale');
    expect(sezione).toHaveTextContent('Questo telefono: iscritto, confermato');
    expect(sezione).toHaveTextContent('9 dosi');
    expect(screen.getByTestId('sezione-canale-invii')).toHaveTextContent('Eutirox 50, dose 1: accettato');
    expect(screen.getByTestId('sezione-canale-invii')).toHaveTextContent('Eutirox 50, dose 2: non inviato, dose già presa');
  });

  it('un 201 si legge accettato, mai consegnato', () => {
    monta();
    expect(screen.getByTestId('sezione-canale')).not.toHaveTextContent(/consegnat/i);
  });

  it('non attivi: la testa lo dice e il perche sta sotto', () => {
    monta({ campiRisposta: { canale: { attivo: false, motivo: 'pem_illeggibile' } } });
    expect(screen.getByTestId('sezione-canale-stato')).toHaveTextContent('Promemoria ad app chiusa non attivi.');
    expect(screen.getByTestId('sezione-canale-perche')).toHaveTextContent(
      'Il server non può firmare i promemoria: la chiave non si legge.'
    );
  });

  it('all ingresso rilegge lo stato; Verifica ora rinnova e rilegge', async () => {
    const { actions } = monta();
    expect(actions.leggiStatoCanale).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Verifica ora' }));
    await vi.waitFor(() => expect(actions.leggiStatoCanale).toHaveBeenCalledTimes(2));
    expect(actions.rinnovaCanale).toHaveBeenCalledTimes(1);
  });

  it('a toggle spento, o in modalita locale, la sezione non c e', () => {
    monta({ impostazioni: { notifiche_attive: 0 } });
    expect(screen.queryByTestId('sezione-canale')).toBeNull();
  });

  it('in modalita locale la sezione non c e', () => {
    monta({ canale: null });
    expect(screen.queryByTestId('sezione-canale')).toBeNull();
  });
});
