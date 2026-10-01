// ============================================================
// RigaCanale -- the line of Oggi for the reminder channel ad app chiusa
// (step 4 of the client). One line only when the state is not OK, with the
// word that says what is known (Roberto, 2026-10-01); it appears by itself
// when the heartbeat grows old while the app stays open (decision 33 B);
// the tap renews inside the gesture when this phone is not subscribed
// (ratification A of 2026-10-01). Rows in the bench: riga-*.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppContext } from '../../state/AppContext.jsx';
import { initialState } from '../../state/reducer.js';
import RigaCanale from './RigaCanale.jsx';

const DEV = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const MINUTO = 60_000;

function risposta(campi = {}) {
  return {
    ora_server_ms: Date.now(),
    tolleranza_min: 20,
    canale: { attivo: true, motivo: null },
    pianificatore: { ultima_passata_ms: Date.now() - 30_000, eta_ms: 30_000, esito: 'ok', dettaglio: null },
    iscrizioni: [{ device_id: DEV, attiva: true, confermata_ms: Date.now() }],
    pubblicazione: null,
    ultimi_invii: [],
    ultimi_avvisi_fine: [],
    ...campi,
  };
}

function stato({ campiRisposta = {}, canale = {}, impostazioni = { notifiche_attive: 1 } } = {}) {
  return {
    ...initialState,
    status: 'ready',
    impostazioni,
    canale: {
      iscrizione: { esito: 'attiva', motivo: null, dettaglio: null },
      stato: { risposta: risposta(campiRisposta), lettoMono: globalThis.performance.now(), lettoMs: Date.now(), deviceId: DEV },
      statoErrore: null,
      pubblicazione: null,
      ...canale,
    },
  };
}

function monta(s, services = {}) {
  const actions = {
    accendiCanale: vi.fn().mockResolvedValue(null),
    rinnovaCanale: vi.fn().mockResolvedValue(null),
    leggiStatoCanale: vi.fn().mockResolvedValue(null),
  };
  const value = { state: s, actions, services, tickMs: Date.now() };
  const ui = (v) => (
    <AppContext.Provider value={v}>
      <RigaCanale />
    </AppContext.Provider>
  );
  const utils = render(ui(value));
  return { ...utils, actions, rimonta: (nuovo) => utils.rerender(ui({ ...value, ...nuovo })) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('la riga c e solo quando lo stato non e OK', () => {
  it('attivi: nessuna riga', () => {
    monta(stato());
    expect(screen.queryByTestId('riga-canale')).toBeNull();
  });

  it('non attivi: la riga lo dice in chiaro', () => {
    monta(stato({ campiRisposta: { canale: { attivo: false, motivo: 'pem_non_configurato' } } }));
    expect(screen.getByTestId('riga-canale')).toHaveTextContent(
      'Promemoria ad app chiusa non attivi. Tocca per verificare.'
    );
  });

  it('non verificati: battito vecchio', () => {
    monta(stato({ campiRisposta: { pianificatore: { ultima_passata_ms: Date.now() - 6 * MINUTO,
      eta_ms: 6 * MINUTO, esito: 'ok', dettaglio: null } } }));
    expect(screen.getByTestId('riga-canale')).toHaveTextContent(/non verificati dalle \d\d:\d\d\. Tocca per verificare\./);
  });

  it('non aggiornati: l ultima pubblicazione non e arrivata', () => {
    monta(stato({ canale: { pubblicazione: { esito: 'non_pubblicata', motivo: 'pubblicazione' } } }));
    expect(screen.getByTestId('riga-canale')).toHaveTextContent('non aggiornati');
  });

  it('a toggle spento, in modalita locale o senza nulla di noto: nessuna riga', () => {
    const spento = monta(stato({
      campiRisposta: { canale: { attivo: false, motivo: null } }, impostazioni: { notifiche_attive: 0 },
    }));
    expect(screen.queryByTestId('riga-canale')).toBeNull();
    spento.unmount();
    const locale = monta({ ...stato(), canale: null });
    expect(screen.queryByTestId('riga-canale')).toBeNull();
    locale.unmount();
    monta(stato({ canale: { stato: null, statoErrore: null } }));
    expect(screen.queryByTestId('riga-canale')).toBeNull();
  });
});

describe('ad app aperta il battito invecchia da solo, senza rileggere', () => {
  it('la riga compare quando l eta passa la soglia', () => {
    const t0 = Date.now();
    const p0 = globalThis.performance.now();
    const s = stato();
    const { rimonta } = monta(s);
    expect(screen.queryByTestId('riga-canale')).toBeNull();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 6 * MINUTO);
    vi.spyOn(globalThis.performance, 'now').mockReturnValue(p0 + 6 * MINUTO);
    rimonta({ tickMs: t0 + 6 * MINUTO });
    expect(screen.getByTestId('riga-canale')).toHaveTextContent('non verificati');
  });
});

describe('il tocco', () => {
  it('telefono non iscritto: subscribe e il primo atto del tocco, poi la conferma e la rilettura', async () => {
    const esitoGesto = { ok: true, iscrizione: {} };
    const canale = { iscriviNelGesto: vi.fn(() => Promise.resolve(esitoGesto)) };
    const { actions } = monta(stato({ campiRisposta: { iscrizioni: [] } }), { canale });
    fireEvent.click(screen.getByTestId('riga-canale'));
    expect(canale.iscriviNelGesto).toHaveBeenCalledTimes(1);
    expect(actions.accendiCanale).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(actions.leggiStatoCanale).toHaveBeenCalledTimes(1));
    expect(actions.accendiCanale).toHaveBeenCalledWith(esitoGesto);
    expect(actions.rinnovaCanale).not.toHaveBeenCalled();
  });

  it('negli altri casi: rinnova e rilegge, senza iscrivere nel gesto', async () => {
    const canale = { iscriviNelGesto: vi.fn(() => null) };
    const { actions } = monta(stato({ campiRisposta: { pianificatore: null } }), { canale });
    fireEvent.click(screen.getByTestId('riga-canale'));
    await vi.waitFor(() => expect(actions.leggiStatoCanale).toHaveBeenCalledTimes(1));
    expect(actions.rinnovaCanale).toHaveBeenCalledTimes(1);
    expect(canale.iscriviNelGesto).not.toHaveBeenCalled();
  });
});
