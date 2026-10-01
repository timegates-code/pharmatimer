// @vitest-environment node
// The state of the reminder channel for the views (step 4): null when the
// channel is not in play, the evaluation of domain/statoCanale.js otherwise.
import { describe, it, expect } from 'vitest';
import { selectValutazioneCanale } from './selectors.js';

const DEV = 'dev';
const lettura = {
  risposta: {
    canale: { attivo: true, motivo: null },
    pianificatore: { ultima_passata_ms: 1, eta_ms: 0, esito: 'ok', dettaglio: null },
    iscrizioni: [{ device_id: DEV, attiva: true }],
  },
  lettoMono: 0,
  lettoMs: 0,
  deviceId: DEV,
};
const pronto = (campi = {}) => ({
  status: 'ready', impostazioni: { notifiche_attive: 1 },
  canale: { stato: lettura, statoErrore: null, pubblicazione: null }, ...campi,
});
const adesso = { mono: 1000, ms: 1000 };

describe('selectValutazioneCanale', () => {
  it('in gioco: la valutazione', () => {
    expect(selectValutazioneCanale(pronto(), adesso)).toMatchObject({ esito: 'attivi' });
  });

  it('fuori gioco: app non pronta, toggle spento, modalita locale', () => {
    expect(selectValutazioneCanale(pronto({ status: 'idle' }), adesso)).toBeNull();
    expect(selectValutazioneCanale(pronto({ impostazioni: { notifiche_attive: 0 } }), adesso)).toBeNull();
    expect(selectValutazioneCanale(pronto({ canale: null }), adesso)).toBeNull();
  });

  it('una lettura fallita senza una riuscita: non verificati', () => {
    const s = pronto({ canale: { stato: null, statoErrore: 'Errore di rete', pubblicazione: null } });
    expect(selectValutazioneCanale(s, adesso)).toMatchObject({ esito: 'non_verificati', perche: 'stato_non_letto' });
  });
});
