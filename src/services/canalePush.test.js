// @vitest-environment node
// ============================================================
// The reminder channel on the phone: subscription and renewal (step 2 of
// the client). Decisions 2, 14 and 15; ratification A of 2026-10-01 on the
// order inside the toggle's tap.
// ============================================================
// The question to the worker is answered by the REAL public/sw-push.js, run
// in a node:vm context as src/pwa/sw-push.test.js runs it, over a real
// MessageChannel: the page's question and the worker's answer are tested
// together. Registration, PushManager and the network are fakes that record
// what the service asks of them. Every pin has its row in
// scripts/audit/mutazioni.py.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../data/repository/index.js', () => ({ shouldUseApiRepo: () => true }));

import {
  createCanaleService,
  chiediAlWorker,
  chiaveDaBase64Url,
  stessaChiave,
  ESITI_CANALE,
  ESITI_PUBBLICAZIONE,
  MOTIVI_CANALE,
} from './canalePush.js';

const SORGENTE_WORKER = readFileSync(new URL('../../public/sw-push.js', import.meta.url), 'utf8');

// A VAPID public key as /api/push/chiave returns it: 65 bytes, 0x04 first.
function chiaveDi(seme) {
  const byte = new Uint8Array(65);
  byte[0] = 0x04;
  for (let i = 1; i < 65; i += 1) byte[i] = (seme * 7 + i) % 256;
  return byte;
}
function base64UrlDi(byte) {
  return Buffer.from(byte).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const CHIAVE = chiaveDi(1);
const CHIAVE_TESTO = base64UrlDi(CHIAVE);
const ALTRA_CHIAVE = chiaveDi(2);
const DEVICE = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

// The real worker: its 'message' listener, reached as the browser reaches it.
function workerVero() {
  const ascoltatori = {};
  const contesto = {
    setTimeout,
    clearTimeout,
    URL,
    addEventListener(tipo, fn) {
      (ascoltatori[tipo] = ascoltatori[tipo] || []).push(fn);
    },
    registration: { scope: 'https://pt.esempio/', async showNotification() {} },
    clients: { async matchAll() { return []; }, async openWindow() { return null; } },
  };
  contesto.self = contesto;
  vm.runInNewContext(SORGENTE_WORKER, contesto, { filename: 'public/sw-push.js' });
  return {
    postMessage(dati, porte) {
      for (const fn of ascoltatori.message || []) fn({ data: dati, ports: porte });
    },
  };
}

const workerMuto = () => ({ postMessage() {} });
const workerAltraVersione = () => ({
  postMessage(dati, porte) {
    porte[0].postMessage({ tipo: dati.tipo, versione: 2 });
  },
});

function creaIscrizione({ chiave = CHIAVE, senzaOpzioni = false, endpoint = 'https://web.push.apple.com/abc' } = {}) {
  return {
    endpoint,
    options: senzaOpzioni ? undefined : { userVisibleOnly: true, applicationServerKey: chiave.slice().buffer },
    toJSON() {
      return { endpoint, expirationTime: null, keys: { p256dh: 'P256DH', auth: 'AUTH' } };
    },
    unsubscribe: vi.fn(async () => true),
  };
}

function creaRegistrazione({ worker = workerVero(), iscrizione = null, subscribeLancia = null } = {}) {
  const stato = { iscrizione };
  const pushManager = {
    getSubscription: vi.fn(async () => stato.iscrizione),
    subscribe: vi.fn((opzioni) => {
      if (subscribeLancia) return Promise.reject(subscribeLancia);
      stato.iscrizione = creaIscrizione({ chiave: new Uint8Array(opzioni.applicationServerKey) });
      return Promise.resolve(stato.iscrizione);
    }),
  };
  return { active: worker, pushManager, stato };
}

function creaRete({ chiave = CHIAVE_TESTO, chiaveRifiuta = null, confermaRifiuta = null, revocaRifiuta = null } = {}) {
  return {
    leggiChiave: vi.fn(async () => {
      if (chiaveRifiuta) throw chiaveRifiuta;
      return chiave;
    }),
    confermaIscrizione: vi.fn(async (corpo) => {
      if (confermaRifiuta) throw confermaRifiuta;
      return { device_id: corpo.device_id, attiva: true };
    }),
    revocaIscrizione: vi.fn(async () => {
      if (revocaRifiuta) throw revocaRifiuta;
      return null;
    }),
    deviceId: vi.fn(() => DEVICE),
    leggiDeviceId: vi.fn(() => DEVICE),
    leggiStato: vi.fn(async () => ({ tolleranza_min: 20 })),
    pubblicaCalendario: vi.fn(async (calendario) => ({ voci: calendario.voci.length })),
  };
}

// The state of the app as the effect of AppContext passes it: the plan and
// what the calendar needs of it.
const OGGI = '2026-10-07';
function statoApp(ore = ['08:00']) {
  return {
    status: 'ready',
    impostazioni: { notifiche_attive: 1 },
    lastBuiltForDay: OGGI,
    profiloAttivo: { ora_sonno: '23:30', ora_sveglia: '07:00' },
    plan: ore.map((ora, i) => ({
      key: `${OGGI}-7-${i + 1}`,
      dateStr: OGGI,
      farmaco: { id: 7, nome: 'Eutirox 50', relazione_pasto: 'indifferente', dettaglio_pasto: null },
      orario: { farmaco_id: 7, dose_numero: i + 1 },
      ora_prevista: ora,
      ora_ricalcolata: null,
      stato: 'prevista',
    })),
  };
}

function creaServizio({
  registrazione = creaRegistrazione(), rete = creaRete(), permesso = 'granted', api = true, orologi = undefined,
} = {}) {
  const piattaforma = {
    supportata: () => true,
    registrazione: vi.fn(async () => registrazione),
    permesso: () => permesso,
  };
  const servizio = createCanaleService({
    modalitaApi: () => api,
    rete,
    piattaforma,
    attesaWorkerMs: 30,
    ...(orologi ? { orologi } : {}),
  });
  return { servizio, registrazione, rete, piattaforma };
}

const ATTIVA = { esito: ESITI_CANALE.ATTIVA, motivo: null, dettaglio: null };
const SPENTA = { esito: ESITI_CANALE.SPENTA, motivo: null, dettaglio: null };

describe('la domanda al worker attivo (public/sw-push.js)', () => {
  it('il worker vero risponde alla domanda: pronto', async () => {
    await expect(chiediAlWorker({ active: workerVero() }, 500)).resolves.toBe(true);
  });

  it('un worker muto non e pronto, allo scadere dell attesa', async () => {
    await expect(chiediAlWorker({ active: workerMuto() }, 30)).resolves.toBe(false);
  });

  it('una risposta di un altra versione del protocollo non e pronto', async () => {
    await expect(chiediAlWorker({ active: workerAltraVersione() }, 500)).resolves.toBe(false);
  });

  it('senza worker attivo non e pronto', async () => {
    await expect(chiediAlWorker({ active: null }, 30)).resolves.toBe(false);
  });
});

describe('la chiave', () => {
  it('base64url di un punto P-256 non compresso: 65 byte', () => {
    expect(chiaveDaBase64Url(CHIAVE_TESTO)).toEqual(CHIAVE);
  });

  it('una chiave che non e un punto P-256 non si usa', () => {
    expect(chiaveDaBase64Url(base64UrlDi(new Uint8Array(64)))).toBeNull();
    expect(chiaveDaBase64Url('non base64!')).toBeNull();
    expect(chiaveDaBase64Url(undefined)).toBeNull();
  });

  it('una subscription dice a quale chiave e legata, o non lo dice', () => {
    expect(stessaChiave(creaIscrizione({ chiave: CHIAVE }), CHIAVE)).toBe(true);
    expect(stessaChiave(creaIscrizione({ chiave: ALTRA_CHIAVE }), CHIAVE)).toBe(false);
    expect(stessaChiave(creaIscrizione({ senzaOpzioni: true }), CHIAVE)).toBeNull();
  });
});

describe('il tocco del toggle: subscribe() e il primo atto (ratifica A, S1)', () => {
  it('a preparazione completa subscribe() parte dentro la chiamata, prima di ogni attesa', async () => {
    const { servizio, registrazione } = creaServizio();
    await servizio.prepara();
    const esito = servizio.iscriviNelGesto();
    expect(registrazione.pushManager.subscribe).toHaveBeenCalledTimes(1);
    const [opzioni] = registrazione.pushManager.subscribe.mock.calls[0];
    expect(opzioni.userVisibleOnly).toBe(true);
    expect(new Uint8Array(opzioni.applicationServerKey)).toEqual(CHIAVE);
    await expect(esito).resolves.toMatchObject({ ok: true });
  });

  it('senza preparazione nessuna iscrizione nel tocco', () => {
    const { servizio, registrazione } = creaServizio();
    expect(servizio.iscriviNelGesto()).toBeNull();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('senza chiave nessuna iscrizione nel tocco', async () => {
    const rete = creaRete({ chiaveRifiuta: new Error('Canale dei promemoria spento: chiave VAPID assente') });
    const { servizio, registrazione } = creaServizio({ rete });
    const p = await servizio.prepara();
    expect(p.motivo).toBe(MOTIVI_CANALE.CHIAVE);
    expect(servizio.iscriviNelGesto()).toBeNull();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('con una chiave non valida nessuna iscrizione nel tocco', async () => {
    const { servizio, registrazione } = creaServizio({ rete: creaRete({ chiave: 'AAAA' }) });
    const p = await servizio.prepara();
    expect(p.motivo).toBe(MOTIVI_CANALE.CHIAVE_NON_VALIDA);
    expect(servizio.iscriviNelGesto()).toBeNull();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('worker muto: nessuna iscrizione nel tocco', async () => {
    const { servizio, registrazione } = creaServizio({ registrazione: creaRegistrazione({ worker: workerMuto() }) });
    const p = await servizio.prepara();
    expect(p.motivo).toBe(MOTIVI_CANALE.WORKER_NON_PRONTO);
    expect(servizio.iscriviNelGesto()).toBeNull();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('dopo il tocco il PUT conferma la subscription, con il device_id', async () => {
    const { servizio, rete } = creaServizio();
    await servizio.prepara();
    const esito = await servizio.iscriviNelGesto();
    await expect(servizio.accendi(esito)).resolves.toEqual(ATTIVA);
    expect(rete.confermaIscrizione).toHaveBeenCalledWith({
      endpoint: 'https://web.push.apple.com/abc',
      keys: { p256dh: 'P256DH', auth: 'AUTH' },
      device_id: DEVICE,
    });
  });

  it('tocco senza preparazione: lo stato dice perche il canale non si accende', async () => {
    const { servizio, rete } = creaServizio({ registrazione: creaRegistrazione({ worker: workerMuto() }) });
    await servizio.prepara();
    await expect(servizio.accendi(null)).resolves.toEqual({
      esito: ESITI_CANALE.NON_ATTIVA, motivo: MOTIVI_CANALE.WORKER_NON_PRONTO, dettaglio: null,
    });
    expect(rete.confermaIscrizione).not.toHaveBeenCalled();
  });

  it('subscribe() rifiutato nel tocco: nessun PUT, e il motivo', async () => {
    const { servizio, rete } = creaServizio();
    const esito = await servizio.accendi({ ok: false, errore: Object.assign(new Error('negato'), { name: 'NotAllowedError' }) });
    expect(esito).toEqual({ esito: ESITI_CANALE.NON_ATTIVA, motivo: MOTIVI_CANALE.ISCRIZIONE, dettaglio: 'NotAllowedError: negato' });
    expect(rete.confermaIscrizione).not.toHaveBeenCalled();
  });

  it('il PUT che non riesce lo dice', async () => {
    const { servizio } = creaServizio({ rete: creaRete({ confermaRifiuta: new Error('Errore di rete o backend irraggiungibile') }) });
    await servizio.prepara();
    const esito = await servizio.accendi(await servizio.iscriviNelGesto());
    expect(esito.esito).toBe(ESITI_CANALE.NON_ATTIVA);
    expect(esito.motivo).toBe(MOTIVI_CANALE.CONFERMA);
  });
});

describe('il rinnovo, a ogni apertura e rientro in primo piano', () => {
  it('toggle acceso e nessuna subscription: nuova iscrizione, poi il PUT', async () => {
    const { servizio, registrazione, rete } = creaServizio();
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual(ATTIVA);
    expect(registrazione.pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(rete.confermaIscrizione).toHaveBeenCalledTimes(1);
  });

  it('worker muto: nessuna iscrizione e nessun PUT', async () => {
    const { servizio, registrazione, rete } = creaServizio({ registrazione: creaRegistrazione({ worker: workerMuto() }) });
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual({
      esito: ESITI_CANALE.NON_ATTIVA, motivo: MOTIVI_CANALE.WORKER_NON_PRONTO, dettaglio: null,
    });
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
    expect(rete.confermaIscrizione).not.toHaveBeenCalled();
  });

  it('worker muto con una subscription gia presente: non la conferma', async () => {
    const registrazione = creaRegistrazione({ worker: workerMuto(), iscrizione: creaIscrizione() });
    const { servizio, rete } = creaServizio({ registrazione });
    const esito = await servizio.rinnova({ voluto: true });
    expect(esito.motivo).toBe(MOTIVI_CANALE.WORKER_NON_PRONTO);
    expect(rete.confermaIscrizione).not.toHaveBeenCalled();
  });

  it('senza chiave: nessuna iscrizione, e lo stato lo dice', async () => {
    const rete = creaRete({ chiaveRifiuta: new Error('Canale dei promemoria spento: chiave VAPID assente') });
    const { servizio, registrazione } = creaServizio({ rete });
    const esito = await servizio.rinnova({ voluto: true });
    expect(esito.esito).toBe(ESITI_CANALE.NON_ATTIVA);
    expect(esito.motivo).toBe(MOTIVI_CANALE.CHIAVE);
    expect(esito.dettaglio).toContain('chiave VAPID assente');
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
    expect(rete.confermaIscrizione).not.toHaveBeenCalled();
  });

  it('subscription legata alla stessa chiave: solo il PUT che la conferma', async () => {
    const vecchia = creaIscrizione({ chiave: CHIAVE });
    const { servizio, registrazione, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual(ATTIVA);
    expect(vecchia.unsubscribe).not.toHaveBeenCalled();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
    expect(rete.confermaIscrizione).toHaveBeenCalledTimes(1);
  });

  it('subscription legata a un altra chiave: si disfa e se ne fa una nuova, poi il PUT', async () => {
    const vecchia = creaIscrizione({ chiave: ALTRA_CHIAVE });
    const { servizio, registrazione, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual(ATTIVA);
    expect(vecchia.unsubscribe).toHaveBeenCalledTimes(1);
    expect(registrazione.pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(rete.confermaIscrizione).toHaveBeenCalledTimes(1);
  });

  it('subscription che non dice la sua chiave: si tiene e si conferma', async () => {
    const vecchia = creaIscrizione({ senzaOpzioni: true });
    const { servizio, registrazione, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual(ATTIVA);
    expect(vecchia.unsubscribe).not.toHaveBeenCalled();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
    expect(rete.confermaIscrizione).toHaveBeenCalledTimes(1);
  });

  it('toggle spento con una subscription sul telefono: unsubscribe e DELETE', async () => {
    const vecchia = creaIscrizione();
    const { servizio, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    await expect(servizio.rinnova({ voluto: false })).resolves.toEqual(SPENTA);
    expect(vecchia.unsubscribe).toHaveBeenCalledTimes(1);
    expect(rete.revocaIscrizione).toHaveBeenCalledWith(DEVICE);
  });

  it('toggle spento senza subscription: nessuna chiamata di rete', async () => {
    const { servizio, rete } = creaServizio();
    await expect(servizio.rinnova({ voluto: false })).resolves.toEqual(SPENTA);
    expect(rete.revocaIscrizione).not.toHaveBeenCalled();
    expect(rete.leggiChiave).not.toHaveBeenCalled();
  });

  it('permesso revocato con una subscription sul telefono: unsubscribe e DELETE, e il motivo', async () => {
    const vecchia = creaIscrizione();
    const { servizio, registrazione, rete } = creaServizio({
      registrazione: creaRegistrazione({ iscrizione: vecchia }),
      permesso: 'denied',
    });
    await expect(servizio.rinnova({ voluto: true })).resolves.toEqual({
      esito: ESITI_CANALE.NON_ATTIVA, motivo: MOTIVI_CANALE.PERMESSO, dettaglio: null,
    });
    expect(vecchia.unsubscribe).toHaveBeenCalledTimes(1);
    expect(rete.revocaIscrizione).toHaveBeenCalledWith(DEVICE);
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('due richieste uguali mentre una aspetta: un solo rinnovo', async () => {
    const { servizio, rete } = creaServizio();
    const primo = servizio.rinnova({ voluto: true });
    const secondo = servizio.rinnova({ voluto: true });
    expect(secondo).toBe(primo);
    await Promise.all([primo, secondo]);
    expect(rete.confermaIscrizione).toHaveBeenCalledTimes(1);
  });

  it('una richiesta diversa non si fonde: gira dopo, nell ordine', async () => {
    const vecchia = creaIscrizione();
    const { servizio, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    const acceso = servizio.rinnova({ voluto: true });
    const spento = servizio.rinnova({ voluto: false });
    expect(spento).not.toBe(acceso);
    await expect(acceso).resolves.toEqual(ATTIVA);
    await expect(spento).resolves.toEqual(SPENTA);
    expect(rete.revocaIscrizione).toHaveBeenCalledTimes(1);
  });
});

describe('il toggle spento, o il permesso revocato', () => {
  it('unsubscribe e DELETE', async () => {
    const vecchia = creaIscrizione();
    const { servizio, rete } = creaServizio({ registrazione: creaRegistrazione({ iscrizione: vecchia }) });
    await expect(servizio.spegni()).resolves.toEqual(SPENTA);
    expect(vecchia.unsubscribe).toHaveBeenCalledTimes(1);
    expect(rete.revocaIscrizione).toHaveBeenCalledWith(DEVICE);
  });

  it('il DELETE anche senza subscription sul telefono: il server puo averne una attiva', async () => {
    const { servizio, rete } = creaServizio();
    await expect(servizio.spegni()).resolves.toEqual(SPENTA);
    expect(rete.revocaIscrizione).toHaveBeenCalledWith(DEVICE);
  });

  it('un DELETE che non riesce lo dice', async () => {
    const { servizio } = creaServizio({ rete: creaRete({ revocaRifiuta: new Error('Errore di rete o backend irraggiungibile') }) });
    const esito = await servizio.spegni();
    expect(esito.esito).toBe(ESITI_CANALE.SPENTA);
    expect(esito.motivo).toBe(MOTIVI_CANALE.REVOCA);
  });
});

describe('modalita locale: il canale non esiste', () => {
  it('nessuna chiamata a /api/push e nessuna iscrizione', async () => {
    const vecchia = creaIscrizione();
    const { servizio, registrazione, rete } = creaServizio({
      registrazione: creaRegistrazione({ iscrizione: vecchia }),
      api: false,
    });
    await expect(servizio.prepara()).resolves.toBeNull();
    expect(servizio.iscriviNelGesto()).toBeNull();
    await expect(servizio.accendi(null)).resolves.toBeNull();
    await expect(servizio.rinnova({ voluto: true })).resolves.toBeNull();
    await expect(servizio.spegni()).resolves.toBeNull();
    await expect(servizio.pubblica(statoApp())).resolves.toBeNull();
    await expect(servizio.leggiStato()).resolves.toBeNull();
    for (const chiamata of Object.values(rete)) expect(chiamata).not.toHaveBeenCalled();
    expect(registrazione.pushManager.subscribe).not.toHaveBeenCalled();
    expect(registrazione.pushManager.getSubscription).not.toHaveBeenCalled();
    expect(vecchia.unsubscribe).not.toHaveBeenCalled();
  });
});

// ============================================================
// Il calendario (passo 3): il ciclo di pubblicazione. Uno alla volta, vince
// l ultimo stato chiesto, l invariato non si ripubblica ma la prima della
// sessione parte sempre, la tolleranza e quella del server nello stesso
// ciclo, un errore non riprova da solo. Righe nel banco: pubblica-*.
// ============================================================

describe('il calendario: il ciclo di pubblicazione', () => {
  it('la prima della sessione parte: tolleranza letta dal server, poi il PUT col device_id', async () => {
    const { servizio, rete } = creaServizio();
    const esito = await servizio.pubblica(statoApp());
    expect(esito).toEqual({ esito: ESITI_PUBBLICAZIONE.PUBBLICATA, motivo: null, dettaglio: null, voci: 1 });
    expect(rete.leggiStato).toHaveBeenCalledTimes(1);
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(1);
    const [corpo] = rete.pubblicaCalendario.mock.calls[0];
    expect(corpo.device_id).toBe(DEVICE);
    expect(corpo.voci.map((v) => [v.farmaco_id, v.data, v.dose_numero])).toEqual([[7, OGGI, 1]]);
  });

  it('il contenuto invariato non si ripubblica, e non legge nemmeno lo stato', async () => {
    const { servizio, rete } = creaServizio();
    await servizio.pubblica(statoApp());
    await expect(servizio.pubblica(statoApp())).resolves.toMatchObject({ esito: ESITI_PUBBLICAZIONE.INVARIATA });
    expect(rete.leggiStato).toHaveBeenCalledTimes(1);
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(1);
  });

  it('un contenuto cambiato si ripubblica', async () => {
    const { servizio, rete } = creaServizio();
    await servizio.pubblica(statoApp(['08:00']));
    await expect(servizio.pubblica(statoApp(['08:00', '20:00']))).resolves.toMatchObject({
      esito: ESITI_PUBBLICAZIONE.PUBBLICATA, voci: 2,
    });
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(2);
  });

  it('mentre una aspetta vince l ultimo stato chiesto', async () => {
    const { servizio, rete } = creaServizio();
    let libera;
    rete.pubblicaCalendario.mockImplementationOnce(
      (calendario) => new Promise((r) => { libera = () => r({ voci: calendario.voci.length }); })
    );
    const prima = servizio.pubblica(statoApp(['08:00']));
    await vi.waitFor(() => expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(1));
    const seconda = servizio.pubblica(statoApp(['09:00']));
    const terza = servizio.pubblica(statoApp(['10:00']));
    expect(terza).toBe(seconda);
    libera();
    await Promise.all([prima, seconda]);
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(2);
    const [ultima] = rete.pubblicaCalendario.mock.calls[1];
    expect(ultima.voci[0].corpo.startsWith('Dose delle 10:00')).toBe(true);
  });

  it('un errore non riprova da solo: il record lo dice, e la richiesta dopo riprova', async () => {
    const rete = creaRete();
    rete.pubblicaCalendario.mockRejectedValueOnce(new Error('Errore di rete o backend irraggiungibile'));
    const { servizio } = creaServizio({ rete });
    await expect(servizio.pubblica(statoApp())).resolves.toMatchObject({
      esito: ESITI_PUBBLICAZIONE.NON_PUBBLICATA, motivo: MOTIVI_CANALE.PUBBLICAZIONE,
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(1);
    await expect(servizio.pubblica(statoApp())).resolves.toMatchObject({ esito: ESITI_PUBBLICAZIONE.PUBBLICATA });
    expect(rete.pubblicaCalendario).toHaveBeenCalledTimes(2);
  });

  it('senza lo stato del server nessuna pubblicazione: non c e la tolleranza', async () => {
    const rete = creaRete();
    rete.leggiStato.mockRejectedValueOnce(new Error('Errore di rete o backend irraggiungibile'));
    const { servizio } = creaServizio({ rete });
    await expect(servizio.pubblica(statoApp())).resolves.toMatchObject({
      esito: ESITI_PUBBLICAZIONE.NON_PUBBLICATA, motivo: MOTIVI_CANALE.STATO,
    });
    expect(rete.pubblicaCalendario).not.toHaveBeenCalled();
  });

  it('la tolleranza e quella del server, letta nello stesso ciclo', async () => {
    const rete = creaRete();
    rete.leggiStato.mockResolvedValue({ tolleranza_min: 30 });
    const { servizio } = creaServizio({ rete });
    await servizio.pubblica(statoApp(['18:00']));
    const [corpo] = rete.pubblicaCalendario.mock.calls[0];
    expect(corpo.avviso_fine_entro_ms - corpo.avviso_fine_ms).toBe(30 * 60_000);
    expect(corpo.avviso_fine_ms).toBe(corpo.voci[0].istante_ms + 30 * 60_000);
  });

  it('senza device_id nessuna pubblicazione', async () => {
    const rete = creaRete();
    rete.deviceId.mockReturnValue(null);
    const { servizio } = creaServizio({ rete });
    await expect(servizio.pubblica(statoApp())).resolves.toMatchObject({
      esito: ESITI_PUBBLICAZIONE.NON_PUBBLICATA, motivo: MOTIVI_CANALE.DEVICE_ID,
    });
    expect(rete.pubblicaCalendario).not.toHaveBeenCalled();
  });
});

// ============================================================
// La lettura dello stato (passo 4): gli orologi prima della richiesta, un
// errore e un record, una lettura alla volta, in coda dopo cio che e stato
// chiesto prima. Righe nel banco: lettura-*.
// ============================================================

describe('la lettura dello stato del canale', () => {
  it('i due orologi si leggono prima che la richiesta parta', async () => {
    let t = 100;
    const orologi = { mono: () => t, ms: () => t + 1 };
    const rete = creaRete();
    rete.leggiStato.mockImplementation(async () => {
      t = 500;
      return { tolleranza_min: 20 };
    });
    const { servizio } = creaServizio({ rete, orologi });
    await expect(servizio.leggiStato()).resolves.toEqual({
      risposta: { tolleranza_min: 20 }, lettoMono: 100, lettoMs: 101, deviceId: DEVICE, errore: null,
    });
  });

  it('una lettura fallita e un record, mai un rifiuto', async () => {
    const rete = creaRete();
    rete.leggiStato.mockRejectedValue(new Error('Errore di rete o backend irraggiungibile'));
    const { servizio } = creaServizio({ rete });
    const lettura = await servizio.leggiStato();
    expect(lettura.risposta).toBeNull();
    expect(lettura.errore).toBe('Error: Errore di rete o backend irraggiungibile');
  });

  it('due richieste mentre una aspetta: una lettura', async () => {
    const { servizio, rete } = creaServizio();
    const prima = servizio.leggiStato();
    expect(servizio.leggiStato()).toBe(prima);
    await prima;
    expect(rete.leggiStato).toHaveBeenCalledTimes(1);
  });

  it('una lettura chiesta dopo un rinnovo lo vede: viene dopo il PUT', async () => {
    const { servizio, rete } = creaServizio();
    const rinnovo = servizio.rinnova({ voluto: true });
    const lettura = servizio.leggiStato();
    await Promise.all([rinnovo, lettura]);
    expect(rete.confermaIscrizione.mock.invocationCallOrder[0])
      .toBeLessThan(rete.leggiStato.mock.invocationCallOrder.at(-1));
  });
});
