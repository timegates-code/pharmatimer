// src/data/repository/ApiRepository.contratto.test.js
//
// ============================================================
// Decisione 3 -- IL CONTRATTO DEI TIPI del payload di presa, campo per campo.
//
// I tipi vivono in DUE copie non collegate (inventario, voce 9 e voce 16):
// pydantic sul server, JSDoc sul client, in IRepository.js e in
// domain/types.js. Fra le due sta il ponte, ApiRepository (VIETATO: si legge,
// non si scrive). Questo file li lega SENZA un generatore: legge lo schema
// OpenAPI che `make openapi` esporta dal backend vivo in backend/openapi.json,
// legge i due typedef PER CONTENUTO (la stessa sonda della voce 16), esercita
// il ponte VERO con apiClient finto, e confronta ogni campo con IL CONTRATTO
// scritto qui sotto: la forma che le due copie devono dichiarare.
//
// Ogni campo presente da entrambe le parti ha la forma attesa; i campi di una
// copia sola sono dichiarati tali PER SCELTA, uno per riga con il motivo; la
// conversione di ora_effettiva e pinnata nei due versi, compreso lo scavalco
// della mezzanotte. Se un campo cambia su un lato solo -- modello pydantic,
// typedef, ponte o produttore -- un test qui arrossa (collaudato per
// mutazione al commit che introduce il file).
//
// UNA DIVERGENZA VERA, che il file fa vedere: il ponte manda client_op_id
// DENTRO ricalcolo_dose_successiva e il server non lo dichiara; pydantic lo
// scarta in silenzio (misurato: 201, riga D+1 con client_op_id NULL). Il test
// che la copre e `it.fails`, la forma vitest dello xfail stretto: passa oggi
// perche la divergenza c e, e ARROSSA il giorno in cui un lato la chiude --
// server che dichiara il campo o ponte che smette di mandarlo -- cosi la
// chiusura e la rimozione del marcatore viaggiano insieme. La scelta di quale
// lato muovere e in coda come decisione di Roberto.
//
// PRECONDIZIONE DICHIARATA: backend/openapi.json deve esistere. `make check`
// e `make test-frontend` lo rigenerano prima di vitest; `npx vitest run` da
// solo legge quello che trova sul disco, e se manca questo file arrossa
// NOMINANDO `make openapi`, invece di saltare.
// ============================================================

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('./apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ApiRepository } from './ApiRepository.js';
import { apiClient } from './apiClient.js';
import { buildMultiDayPlan } from '../../domain/planBuilder.js';
import { applyAssunzione } from '../../domain/recalc.js';
import { parseIsoDateTime } from '../../utils/time.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OPENAPI_PATH = resolve(ROOT, 'backend', 'openapi.json');
const TYPEDEF_PATHS = Object.freeze({
  IRepository: resolve(HERE, 'IRepository.js'),
  types: resolve(ROOT, 'src', 'domain', 'types.js'),
});

// ------------------------------------------------------------------
// IL CONTRATTO. Una riga per campo della RIGA DI REGISTRO (LogAssunzione):
//   typedef -- il tipo JS scritto fra le graffe di @property, virgolette
//              normalizzate a doppie;
//   server  -- la forma OpenAPI della proprieta nella risposta del verbo,
//              normalizzata da formaServer (type, format, enum, nullable).
// ------------------------------------------------------------------
const STATI = ['prevista', 'presa', 'saltata', 'sospesa', 'ricalcolata'];

const CONTRATTO_RIGA = Object.freeze({
  id: { typedef: 'number', server: { type: 'integer' } },
  farmaco_id: { typedef: 'number', server: { type: 'integer' } },
  data: { typedef: 'string', server: { type: 'string', format: 'date' } },
  dose_numero: { typedef: 'number', server: { type: 'integer' } },
  ora_prevista: { typedef: 'string', server: { type: 'string', format: 'time' } },
  ora_effettiva: {
    typedef: 'string|null',
    server: { type: 'string', format: 'date-time', nullable: true },
  },
  delta_minuti: { typedef: 'number|null', server: { type: 'integer', nullable: true } },
  ora_ricalcolata: {
    typedef: 'string|null',
    server: { type: 'string', format: 'date-time', nullable: true },
  },
  gap_minuti: { typedef: 'number', server: { type: 'integer' } },
  recupero_minuti: { typedef: 'number', server: { type: 'integer' } },
  stato: {
    typedef: STATI.map((s) => `"${s}"`).join('|'),
    server: { type: 'string', enum: STATI },
  },
  note: { typedef: 'string|null', server: { type: 'string', nullable: true } },
});

// Campi che la RISPOSTA del server porta e il typedef NO, per scelta.
const SOLO_SERVER_RISPOSTA = Object.freeze({
  utente_id: 'scoping multi-tenant iniettato dal server; il client non lo legge mai',
  created_at: 'timestamp del server; il client lo legge solo sui farmaci (T_inizio), mai sulle righe di registro',
  dedup: 'flag di trasporto di Spec 14.6; oggi nessuna sede client lo consuma (misurato)',
  avviso: 'decisione 2: lo consuma il guardiano (SyncRepository), non e un campo della riga',
  ricalcolo: 'decisione 2: esito del ricalcolo nested; il riallineamento del client passa dalla rilettura, nessun consumatore',
});

// Campi del typedef che il payload della RICHIESTA non porta, per scelta.
const SOLO_TYPEDEF_RICHIESTA = Object.freeze({
  id: 'assegnato dal server: una richiesta non lo conosce',
  farmaco_id: 'viaggia nel path /api/farmaci/{id}/log/presa, non nel corpo',
  stato: 'seleziona il verbo e non viene mai trasmesso (Q-TER-1=A: la rotta e funzione del verbo)',
  ora_ricalcolata: 'viaggia solo dentro ricalcolo_dose_successiva, sulla dose D+1',
});

// Campi della RICHIESTA che il typedef non porta, per scelta.
const SOLO_RICHIESTA = Object.freeze({
  client_op_id: 'la targa del tocco e dello elemento di coda (Spec 14.6), non della riga',
  ricalcolo_dose_successiva: 'la coppia atomica presa piu D+1 (Spec 11.6.9), un annidamento del trasporto',
});

// La forma dei VALORI che il ponte produce, per proprieta della richiesta.
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_ORA = /^\d{2}:\d{2}$/;
const RE_ISO_SECONDI = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const RE_ISO_MINUTI = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const intero = (v) => Number.isInteger(v);
const stringaONull = (v) => v === null || typeof v === 'string';

const FORMA_VALORE = Object.freeze({
  data: (v) => RE_DATA.test(v),
  dose_numero: intero,
  ora_prevista: (v) => RE_ORA.test(v),
  ora_effettiva: (v) => RE_ISO_SECONDI.test(v),
  delta_minuti: intero,
  gap_minuti: intero,
  recupero_minuti: intero,
  note: stringaONull,
  client_op_id: stringaONull,
  ricalcolo_dose_successiva: (v) => v === null || (typeof v === 'object' && v !== null),
  // annidato
  ora_ricalcolata: (v) => RE_ISO_MINUTI.test(v) || RE_ISO_SECONDI.test(v),
});

// ------------------------------------------------------------------
// Sonde: OpenAPI e typedef, per contenuto.
// ------------------------------------------------------------------
function leggiOpenapi() {
  if (!existsSync(OPENAPI_PATH)) {
    throw new Error(
      'backend/openapi.json ASSENTE: esegui `make openapi` (make check e make test-frontend lo fanno prima di vitest)'
    );
  }
  return JSON.parse(readFileSync(OPENAPI_PATH, 'utf-8'));
}

/** Normalise an OpenAPI property to {type|ref, format?, enum?, nullable}. */
function formaServer(prop) {
  if (!prop || typeof prop !== 'object') return null;
  if (Array.isArray(prop.anyOf)) {
    const nonNull = prop.anyOf.filter((p) => p.type !== 'null');
    const nullable = prop.anyOf.some((p) => p.type === 'null');
    if (nonNull.length !== 1) return { anyOf: prop.anyOf.length, nullable };
    const base = nonNull[0].$ref ? { ref: nonNull[0].$ref } : formaServer(nonNull[0]);
    return { ...base, nullable };
  }
  const out = { nullable: false };
  if (prop.$ref) out.ref = prop.$ref;
  if (prop.type) out.type = prop.type;
  if (prop.format) out.format = prop.format;
  if (prop.enum) out.enum = prop.enum;
  return out;
}

const atteso = (s) => ({ nullable: false, ...s });

/** Read a JSDoc typedef by content: name -> {tipo, opzionale}. */
function estraiTypedef(path, nome) {
  const sorgente = readFileSync(path, 'utf-8');
  const blocco = new RegExp(`@typedef \\{[Oo]bject\\} ${nome}\\b([\\s\\S]*?)\\*/`).exec(sorgente);
  if (!blocco) throw new Error(`typedef ${nome} non trovato in ${path}`);
  const campi = {};
  for (const m of blocco[1].matchAll(/@property \{([^}]+)\}\s*(\[?)(\w+)\]?/g)) {
    campi[m[3]] = { tipo: m[1].replace(/'/g, '"').replace(/\s+/g, ''), opzionale: m[2] === '[' };
  }
  return campi;
}

// ------------------------------------------------------------------
// Il ponte VERO, esercitato con apiClient finto: i corpi catturati.
// ------------------------------------------------------------------
const PATCH_PRESA = Object.freeze({
  stato: 'presa',
  ora_prevista: '08:00',
  ora_effettiva: '2026-04-16T08:30:00',
  delta_minuti: 30,
  gap_minuti: 0,
  recupero_minuti: 0,
  note: null,
  client_op_id: '11111111-2222-4333-8444-555555555555',
});

const RIGA_RICALCOLATA = Object.freeze({
  farmaco_id: 42,
  data: '2026-04-16',
  dose_numero: 2,
  stato: 'ricalcolata',
  ora_prevista: '16:00',
  ora_ricalcolata: '2026-04-16T16:30',
  gap_minuti: 30,
  recupero_minuti: 0,
  client_op_id: '11111111-2222-4333-8444-555555555555',
});

async function corpoPresaSingola() {
  apiClient.post.mockReset();
  apiClient.post.mockResolvedValue({ id: 1 });
  const repo = new ApiRepository();
  await repo.upsertLog(42, '2026-04-16', 1, PATCH_PRESA);
  const [url, body] = apiClient.post.mock.calls[0];
  expect(url).toBe('/api/farmaci/42/log/presa');
  return body;
}

async function corpoPresaBatch() {
  apiClient.post.mockReset();
  apiClient.post.mockResolvedValue({ id: 1 });
  const repo = new ApiRepository();
  await repo.upsertLogsBatch([
    { farmaco_id: 42, data: '2026-04-16', dose_numero: 1, ...PATCH_PRESA },
    RIGA_RICALCOLATA,
  ]);
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  const [url, body] = apiClient.post.mock.calls[0];
  expect(url).toBe('/api/farmaci/42/log/presa');
  return body;
}

// ------------------------------------------------------------------
describe('contratto dei tipi -- richiesta /presa contro LogAssunzioneCreatePresa', () => {
  let doc;
  let schemaPresa;
  let schemaNested;

  beforeAll(() => {
    doc = leggiOpenapi();
    schemaPresa = doc.components.schemas.LogAssunzioneCreatePresa;
    schemaNested = doc.components.schemas.RicalcoloDoseSuccessivaPayload;
  });

  it('Z0 sonda: lo schema esportato porta i tre schemi della presa, e le sonde dei typedef leggono dodici campi', () => {
    expect(doc.openapi).toMatch(/^3\./);
    expect(schemaPresa).toBeDefined();
    expect(schemaNested).toBeDefined();
    expect(doc.components.schemas.LogAssunzioneVerboResponse).toBeDefined();
    for (const p of Object.values(TYPEDEF_PATHS)) {
      expect(Object.keys(estraiTypedef(p, 'LogAssunzione'))).toHaveLength(12);
    }
  });

  it('R1 ogni chiave della presa singola e dichiarata dal server, col valore nella forma dichiarata; gli obbligatori ci sono tutti', async () => {
    const body = await corpoPresaSingola();
    for (const [chiave, valore] of Object.entries(body)) {
      expect(schemaPresa.properties, `chiave ${chiave} non dichiarata dal server`).toHaveProperty(chiave);
      expect(FORMA_VALORE, `forma di ${chiave} non contrattata`).toHaveProperty(chiave);
      expect(FORMA_VALORE[chiave](valore), `${chiave}=${JSON.stringify(valore)} fuori forma`).toBe(true);
    }
    for (const obbligatorio of schemaPresa.required) {
      expect(body, `obbligatorio ${obbligatorio} assente`).toHaveProperty(obbligatorio);
      expect(body[obbligatorio]).not.toBeNull();
    }
  });

  it('R2 fra presa singola e coppia atomica il ponte produce ESATTAMENTE le proprieta che il server dichiara: nessuna in una copia sola', async () => {
    const singola = await corpoPresaSingola();
    const batch = await corpoPresaBatch();
    const prodotte = new Set([...Object.keys(singola), ...Object.keys(batch)]);
    expect([...prodotte].sort()).toEqual(Object.keys(schemaPresa.properties).sort());
    expect(batch.ricalcolo_dose_successiva).toBeTypeOf('object');
    expect(singola).not.toHaveProperty('ricalcolo_dose_successiva');
  });

  it('R3 annidato: le chiavi del ricalcolo che il server dichiara hanno la forma dichiarata, e gli obbligatori ci sono tutti', async () => {
    const nested = (await corpoPresaBatch()).ricalcolo_dose_successiva;
    for (const [chiave, prop] of Object.entries(schemaNested.properties)) {
      expect(nested, `annidato: ${chiave} dichiarato dal server ma non prodotto`).toHaveProperty(chiave);
      expect(FORMA_VALORE[chiave](nested[chiave]), `annidato: ${chiave} fuori forma`).toBe(true);
      expect(['string', 'integer']).toContain(formaServer(prop).type);
    }
    for (const obbligatorio of schemaNested.required) {
      expect(nested).toHaveProperty(obbligatorio);
    }
  });

  it.fails('R4 DIVERGENZA VERA, in coda: il ponte manda client_op_id annidato e il server non lo dichiara (pydantic lo scarta in silenzio, misurato)', async () => {
    // Forma vitest dello xfail stretto: questo test PASSA finche la
    // divergenza esiste e ARROSSA il giorno in cui un lato la chiude,
    // obbligando a togliere il marcatore insieme alla chiusura.
    const nested = (await corpoPresaBatch()).ricalcolo_dose_successiva;
    for (const chiave of Object.keys(nested)) {
      expect(schemaNested.properties, `annidato: ${chiave} non dichiarato dal server`).toHaveProperty(chiave);
    }
  });

  it('R5 i campi di una copia sola fra typedef e richiesta sono ESATTAMENTE quelli dichiarati per scelta', async () => {
    const singola = await corpoPresaSingola();
    const batch = await corpoPresaBatch();
    const richiesta = new Set([...Object.keys(singola), ...Object.keys(batch)]);
    for (const [nome, path] of Object.entries(TYPEDEF_PATHS)) {
      const typedef = new Set(Object.keys(estraiTypedef(path, 'LogAssunzione')));
      const soloTypedef = [...typedef].filter((k) => !richiesta.has(k)).sort();
      const soloRichiesta = [...richiesta].filter((k) => !typedef.has(k)).sort();
      expect(soloTypedef, `${nome}: campi del typedef fuori dalla richiesta`).toEqual(
        Object.keys(SOLO_TYPEDEF_RICHIESTA).sort()
      );
      expect(soloRichiesta, `${nome}: campi della richiesta fuori dal typedef`).toEqual(
        Object.keys(SOLO_RICHIESTA).sort()
      );
    }
  });
});

describe('contratto dei tipi -- risposta LogAssunzioneVerboResponse contro i due typedef LogAssunzione', () => {
  let schemaRisposta;
  const typedefs = {};

  beforeAll(() => {
    schemaRisposta = leggiOpenapi().components.schemas.LogAssunzioneVerboResponse;
    for (const [nome, path] of Object.entries(TYPEDEF_PATHS)) {
      typedefs[nome] = estraiTypedef(path, 'LogAssunzione');
    }
  });

  it('S1 ogni campo del contratto ha, campo per campo, la forma attesa nel server E nei due typedef', () => {
    for (const [campo, riga] of Object.entries(CONTRATTO_RIGA)) {
      expect(schemaRisposta.properties, `server: ${campo} assente dalla risposta`).toHaveProperty(campo);
      expect(formaServer(schemaRisposta.properties[campo]), `server: forma di ${campo}`).toEqual(atteso(riga.server));
      for (const [nome, typedef] of Object.entries(typedefs)) {
        expect(typedef, `${nome}: ${campo} assente dal typedef`).toHaveProperty(campo);
        expect(typedef[campo].tipo, `${nome}: tipo di ${campo}`).toBe(riga.typedef);
      }
    }
  });

  it('S2 i campi di una copia sola sono ESATTAMENTE quelli dichiarati per scelta: nessuno in piu, nessuno in meno', () => {
    const contratto = new Set(Object.keys(CONTRATTO_RIGA));
    const risposta = new Set(Object.keys(schemaRisposta.properties));
    const soloServer = [...risposta].filter((k) => !contratto.has(k)).sort();
    expect(soloServer).toEqual(Object.keys(SOLO_SERVER_RISPOSTA).sort());
    expect([...contratto].filter((k) => !risposta.has(k))).toEqual([]);
    for (const [nome, typedef] of Object.entries(typedefs)) {
      const campi = new Set(Object.keys(typedef));
      expect([...campi].filter((k) => !contratto.has(k)), `${nome}: campi fuori contratto`).toEqual([]);
      expect([...contratto].filter((k) => !campi.has(k)), `${nome}: campi del contratto assenti`).toEqual([]);
    }
  });

  it('S3 i due typedef dicono la stessa cosa, nome per nome e tipo per tipo', () => {
    const a = typedefs.IRepository;
    const b = typedefs.types;
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    for (const campo of Object.keys(a)) {
      expect(a[campo].tipo, `tipo di ${campo}`).toBe(b[campo].tipo);
    }
    // Le parentesi di opzionalita differiscono fra le copie e NON sono
    // parte del filo: un campo nullable viaggia come null. Dichiarato.
  });

  it('S4 gli obbligatori della risposta sono un sottoinsieme di contratto piu solo-server', () => {
    const ammessi = new Set([...Object.keys(CONTRATTO_RIGA), ...Object.keys(SOLO_SERVER_RISPOSTA)]);
    for (const obbligatorio of schemaRisposta.required) {
      expect(ammessi, `obbligatorio ${obbligatorio} ignoto al contratto`).toContain(obbligatorio);
    }
  });
});

describe('contratto dei tipi -- ora_effettiva nei due versi, compreso lo scavalco della mezzanotte', () => {
  const profilo = {
    id: 1, nome_profilo: 'Standard', ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30', attivo: 1,
  };
  const farmaco = {
    id: 42, nome: 'Sera', funzione: 'Test', tipo_frequenza: 'fisso', intervallo_ore: null,
    intervallo_minimo_ore: null, dosi_giornaliere: 1, relazione_pasto: 'indifferente',
    dettaglio_pasto: null, note: null, data_inizio: '2024-01-01', data_fine: null, attivo: 1,
  };
  const orario = {
    id: 421, farmaco_id: 42, dose_numero: 1, offset_minuti: 1410,
    ancora_riferimento: 'assoluto', descrizione_momento: null,
  };

  it('T1 client -> server: HH:MM piu la data della dose diventa ISO con secondi; una ISO passa intatta', async () => {
    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({ id: 1 });
    const repo = new ApiRepository();
    await repo.upsertLog(42, '2026-04-16', 1, { ...PATCH_PRESA, ora_effettiva: '08:30' });
    expect(apiClient.post.mock.calls[0][1].ora_effettiva).toBe('2026-04-16T08:30:00');
    await repo.upsertLog(42, '2026-04-16', 1, { ...PATCH_PRESA, ora_effettiva: '2026-04-17T00:30:00' });
    expect(apiClient.post.mock.calls[1][1].ora_effettiva).toBe('2026-04-17T00:30:00');
    expect(apiClient.post.mock.calls[1][1].data).toBe('2026-04-16');
  });

  it('T2 scavalco, client -> server: la dose delle 23:30 del 16 presa alle 00:30 del 17 viaggia con data 16 e ora_effettiva del 17, dal produttore al filo', async () => {
    const plan = buildMultiDayPlan({
      profilo, farmaci: [farmaco], orari: [orario], logAssunzioni: [],
      startDate: '2026-04-16', numDays: 2,
    });
    const { logWrites } = applyAssunzione(plan, {
      entryKey: '2026-04-16-42-1', dataEffettiva: '2026-04-17', oraEffettiva: '00:30',
    });
    expect(logWrites).toHaveLength(1);
    const scrittura = logWrites[0];
    expect(scrittura.data).toBe('2026-04-16');
    expect(scrittura.ora_effettiva).toBe('2026-04-17T00:30:00');
    expect(scrittura.delta_minuti).toBe(60);

    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({ id: 1 });
    const repo = new ApiRepository();
    await repo.upsertLog(scrittura.farmaco_id, scrittura.data, scrittura.dose_numero, scrittura);
    const body = apiClient.post.mock.calls[0][1];
    expect(body.data).toBe('2026-04-16');
    expect(body.ora_effettiva).toBe('2026-04-17T00:30:00');
    expect(RE_ISO_SECONDI.test(body.ora_effettiva)).toBe(true);
  });

  it('T3 scavalco, server -> client: la riga con data 16 e ora_effettiva del 17 e fusa nel piano senza perdere nessuno dei due, e la ISO si legge 17 e 00:30', () => {
    const rigaServer = {
      id: 9, utente_id: 2, farmaco_id: 42, data: '2026-04-16', dose_numero: 1,
      ora_prevista: '23:30:00', ora_effettiva: '2026-04-17T00:30:00', delta_minuti: 60,
      ora_ricalcolata: null, gap_minuti: 0, recupero_minuti: 0, stato: 'presa', note: null,
      created_at: '2026-04-17T00:30:05', dedup: false, avviso: null, ricalcolo: null,
    };
    const plan = buildMultiDayPlan({
      profilo, farmaci: [farmaco], orari: [orario], logAssunzioni: [rigaServer],
      startDate: '2026-04-16', numDays: 2,
    });
    const voce = plan.find((e) => e.key === '2026-04-16-42-1');
    expect(voce.stato).toBe('presa');
    expect(voce.dateStr).toBe('2026-04-16');
    expect(voce.ora_effettiva).toBe('2026-04-17T00:30:00');
    expect(voce.delta_minuti).toBe(60);
    const letta = parseIsoDateTime(voce.ora_effettiva);
    expect(letta.dateStr).toBe('2026-04-17');
    expect(letta.hhmm).toBe('00:30');
    // La voce del 17 resta prevista: la presa non e scivolata sul giorno dopo.
    expect(plan.find((e) => e.key === '2026-04-17-42-1').stato).toBe('prevista');
  });

  it('T4 la forma di ora_effettiva dichiarata dal server e date-time nullable, nei due versi', () => {
    const schemi = leggiOpenapi().components.schemas;
    expect(formaServer(schemi.LogAssunzioneCreatePresa.properties.ora_effettiva)).toEqual(
      atteso({ type: 'string', format: 'date-time' })
    );
    expect(formaServer(schemi.LogAssunzioneVerboResponse.properties.ora_effettiva)).toEqual(
      atteso({ type: 'string', format: 'date-time', nullable: true })
    );
  });
});
