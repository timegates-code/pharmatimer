// ============================================================
// GUARDIA `snapshot-recupero-client` -- CS-5.4 tronco 1 (Q-PERNO-3=A).
// ============================================================
//
// Questo file NON e piu una sonda di misura. Fino a quinquagies-quinquies
// pinnava il difetto MISURATO; da CS-5.4 pinna la RIPARAZIONE, e un rosso qui
// e una regressione vera. Il marcatore del vecchio contratto e stato rimosso
// nella stessa sessione che ha ribaltato le attese, come quel contratto
// prescriveva.
//
// COSA GARANTISCE
// `src/domain/planBuilder.js` mergeLogIntoEntry ricostruisce
// `ora_ricalcolata_originale` dalla coppia gia ricevuta: sotto la semantica
// ASSOLUTA del recupero (s.6.263) il totale memorizzato e esattamente cio che
// e stato sottratto, quindi lo originale si recupera ri-sommandolo. E la
// stessa computazione che il server esegue a post_recupero.
//
// La guardia sul null e PORTANTE: `new Date(null)` non solleva, restituisce
// lo epoch, e una derivazione incondizionata scriverebbe un orario del 1970
// nel piano. Il controllo positivo in coda esiste per quello (Q-PERNO-5=A).
//
// `gap_originale` resta INERTE e NON si ricostruisce (Q-PERNO-4=A): zero sedi
// di lettura di produzione, misurate a quinquagies-quinquies. Forma identica
// allo altro campo, esposizione clinica opposta. F5 pinna quella inerzia.
//
// FORMA DEL VALORE IN ARRIVO (Q-PERNO-6=A). Il modello di risposta dichiara
// `Optional[datetime]` su colonna DATETIME, quindi il valore serializzato
// porta i secondi; ma il dev non ha alcuna riga, quindi la forma resta una
// DEDUZIONE STATICA e non una misura. F6 esercita entrambe le forme invece di
// indovinare quale sia reale: la derivazione passa da addMinutesToIso, che
// ricompone la stringa campo per campo e normalizza qualunque cosa entri.
//
// RESIDUO DICHIARATO, ANCORATO A CS-6. La gamba Dexie piu SyncRepository non e
// esercitata: qui si prova il dominio, non la sopravvivenza a un riavvio.
//
// AMBIENTE: jsdom, da vitest.config.js :25. Questo file monta un componente,
// quindi non deve portare il docblock di ambiente che le suite di dominio
// usano. Quel nome non si scrive mai qui dentro: vitest scandisce il sorgente
// e lo applicherebbe anche da dentro un commento che lo nega -- Registro voce
// 135, famiglia della voce 99.

import { describe, it, expect } from 'vitest';
import { renderWithProvider } from '../../../test/renderHelpers.jsx';
import { RecuperoModal } from './RecuperoModal.jsx';
import { buildMultiDayPlan } from '../../../domain/planBuilder.js';
import { applyRecupero } from '../../../domain/recalc.js';

const DATA = '2026-04-19';
const ENTRY_KEY = `${DATA}-1-1`;

const PROFILO = {
  id: 1,
  nome_profilo: 'Standard',
  ora_sveglia: '07:00',
  ora_colazione: '07:30',
  ora_pranzo: '13:00',
  ora_cena: '20:30',
  ora_sonno: '23:30',
  attivo: 1,
};

// `intervallo_minimo_ore: null` e portante: calcolaRecuperoMax ritorna lo
// intero gap, quindi 30 min su 60 sono sempre ammissibili e la guardia
// RECUPERO_ECCESSIVO non scatta mai. `intervallo_ore: 8` tiene il ramo
// standard. Nessun `created_at`: il filtro P20 resta inerte.
const FARMACO = {
  id: 1,
  nome: 'Test 100mg',
  funzione: 'Test',
  tipo_frequenza: 'intervallo',
  intervallo_ore: 8,
  intervallo_minimo_ore: null,
  dosi_giornaliere: 1,
  relazione_pasto: 'indifferente',
  dettaglio_pasto: null,
  note: null,
  data_inizio: '2024-01-01',
  data_fine: null,
  attivo: 1,
};

const ORARIO = {
  id: 11,
  farmaco_id: 1,
  dose_numero: 1,
  offset_minuti: -30,
  ancora_riferimento: 'colazione',
  descrizione_momento: null,
};

/**
 * Riga server DOPO un recupero di 30 min: lo originale era 18:00, il
 * memorizzato e 17:30, il totale 30, il gap resta 60 (mai decrementato,
 * s.6.263). DDL a quindici colonne: nessun campo `*_originale`.
 */
function rigaServer(overrides = {}) {
  return {
    data: DATA,
    farmaco_id: FARMACO.id,
    dose_numero: ORARIO.dose_numero,
    stato: 'ricalcolata',
    ora_effettiva: null,
    delta_minuti: null,
    ora_ricalcolata: `${DATA}T17:30`,
    gap_minuti: 60,
    recupero_minuti: 30,
    ...overrides,
  };
}

function ricostruisci(logRows) {
  return buildMultiDayPlan({
    profilo: PROFILO,
    farmaci: [FARMACO],
    orari: [ORARIO],
    logAssunzioni: logRows,
    startDate: DATA,
    numDays: 1,
  });
}

function montaModulo(entry) {
  return renderWithProvider(
    <RecuperoModal
      entry={entry}
      onApply={() => {}}
      onReset={() => {}}
      onClose={() => {}}
    />
  );
}

describe('GUARDIA snapshot-recupero-client -- ricostruzione del piano dai log del server', () => {
  // ---------- F1 -- lo snapshot torna, derivato dalla coppia ----------
  // SENTINEL_QPERNO_F1_RICOSTRUZIONE
  it('F1: la ricostruzione DERIVA lo snapshot dal totale assoluto', () => {
    const plan = ricostruisci([rigaServer()]);
    expect(plan).toHaveLength(1);
    const e = plan[0];

    expect(e.key).toBe(ENTRY_KEY);
    expect(e.stato).toBe('ricalcolata');
    expect(e.ora_ricalcolata).toBe(`${DATA}T17:30`);
    expect(e.gap_minuti).toBe(60);
    expect(e.recupero_minuti).toBe(30);

    // 17:30 + 30 = 18:00. Era `null` e ora e il valore vero.
    expect(e.ora_ricalcolata_originale).toBe(`${DATA}T18:00`);

    // gap_originale NON si ricostruisce: Q-PERNO-4=A.
    expect(e.gap_originale).toBe(0);
  });

  // ---------- F2 -- cio che la persona LEGGE ----------
  // SENTINEL_QPERNO_F2_SUPERFICIE
  it('F2: il modulo mostra come base lo ORIGINALE, non il tempo gia recuperato', () => {
    const entry = ricostruisci([rigaServer()])[0];
    const { getByTestId, getByText, queryByText, unmount } = montaModulo(entry);

    expect(getByTestId('rec-value')).toHaveTextContent('30 min');

    // RecuperoModal.jsx :86 -- baseT prende lo snapshot, che ora esiste.
    expect(getByText('18:00')).toBeTruthy();

    // La persona legge "da 18:00 a 17:30", che e cio che ha davvero scelto.
    expect(getByTestId('new-time')).toHaveTextContent('17:30');

    // La base sbagliata non compare piu come base.
    expect(queryByText('17:00')).toBeNull();

    unmount();
  });

  // ---------- F3 -- confermare non sposta piu la riga ----------
  // SENTINEL_QPERNO_F3_LOGWRITE
  it('F3: applyRecupero riproduce lo stesso valore, la riga NON si sposta', () => {
    const plan = ricostruisci([rigaServer()]);
    const result = applyRecupero(plan, ENTRY_KEY, 30);

    expect(result.logWrites).toHaveLength(1);
    // 18:00 - 30 = 17:30, cioe esattamente il valore gia memorizzato.
    expect(result.logWrites[0].ora_ricalcolata).toBe(`${DATA}T17:30`);
    expect(result.logWrites[0].recupero_minuti).toBe(30);
    expect(result.logWrites[0].stato).toBe('ricalcolata');

    // buildLogWrite non porta i campi `*_originale`: invariato, e resta vero
    // che nulla sul filo puo restituirli. La derivazione li ricostruisce
    // in locale, non li trasporta.
    expect(result.logWrites[0].ora_ricalcolata_originale).toBeUndefined();
    expect(result.logWrites[0].gap_originale).toBeUndefined();
  });

  // ---------- F4 -- la deriva cumulativa e SPENTA ----------
  // SENTINEL_QPERNO_F4_STABILE
  it('F4: il secondo giro non arretra, il valore e un punto fisso', () => {
    const giro1 = applyRecupero(ricostruisci([rigaServer()]), ENTRY_KEY, 30);
    const riga1 = giro1.logWrites[0];
    expect(riga1.ora_ricalcolata).toBe(`${DATA}T17:30`);

    // Si rialimenta la riga prodotta come riga di specchio del rebuild
    // successivo: e il caso offline, dove nessuna rilettura la contraddice.
    const piano2 = ricostruisci([riga1]);
    const e2 = piano2[0];
    expect(e2.ora_ricalcolata).toBe(`${DATA}T17:30`);
    expect(e2.ora_ricalcolata_originale).toBe(`${DATA}T18:00`);

    const giro2 = applyRecupero(piano2, ENTRY_KEY, 30);
    // 17:30 -> 17:30 -> 17:30. La dose non cammina piu allo indietro (M1) e
    // cio che la persona legge resta cio che ha scelto (M3).
    expect(giro2.logWrites[0].ora_ricalcolata).toBe(`${DATA}T17:30`);
    expect(giro2.logWrites[0].recupero_minuti).toBe(30);
  });

  // ---------- F5 -- gap_originale: inerzia, non esposizione ----------
  // SENTINEL_QPERNO_F5_INERZIA
  it('F5: gap_originale non ricostruito e INERTE, il ritardo residuo resta corretto', () => {
    const entry = ricostruisci([rigaServer()])[0];
    expect(entry.gap_originale).toBe(0);
    expect(entry.gap_minuti).toBe(60);

    const { getAllByText, unmount } = montaModulo(entry);

    // RecuperoModal.jsx :93 calcola residualGap da `gap_minuti`, mai dallo
    // snapshot: 60 - 30 = 30, corretto NONOSTANTE gap_originale sia 0.
    // Due nodi portano "30 min": il cursore e il blocco del residuo.
    expect(getAllByText('30 min')).toHaveLength(2);

    unmount();
  });

  // ---------- F6 -- la forma coi secondi, Q-PERNO-6=A ----------
  // SENTINEL_QPERNO_F6_SECONDI
  it('F6: la derivazione NORMALIZZA la forma coi secondi', () => {
    const plan = ricostruisci([rigaServer({ ora_ricalcolata: `${DATA}T17:30:00` })]);
    const e = plan[0];

    // Il riporto e verbatim: mergeLogIntoEntry non normalizza cio che copia.
    expect(e.ora_ricalcolata).toBe(`${DATA}T17:30:00`);

    // La derivazione passa da addMinutesToIso, che ricompone campo per campo:
    // lo snapshot nasce SEMPRE in forma canonica, quale che sia lo ingresso.
    expect(e.ora_ricalcolata_originale).toBe(`${DATA}T18:00`);

    // Conseguenza dichiarata e non nascosta: dentro lo STESSO elemento i due
    // campi possono portare forme diverse. Posta clinica nulla, misurata --
    // RecuperoModal.jsx :87 discrimina su includes('T'), vero per entrambe, e
    // taglia con slice; recalc.js :494 rinormalizza. A backlog sotto MOD-1.
    const entry = { ...e };
    const { getByText, getByTestId, unmount } = montaModulo(entry);
    expect(getByText('18:00')).toBeTruthy();
    expect(getByTestId('new-time')).toHaveTextContent('17:30');
    unmount();
  });

  // ---------- CONTROLLO POSITIVO (Q-PERNO-5=A) ----------
  // Il vecchio controllo spalmava lo snapshot su un elemento ricostruito:
  // dopo la riparazione quella spalmatura e un no-op e il test resterebbe
  // verde con o senza riparazione a bordo -- lo esito compatibile con
  // entrambe le ipotesi vietato da LC-106, e un gate incapace di arrossare
  // non e un gate (voce 112). Conservato nel RUOLO e non nella lettera:
  // il caso che la riparazione NON deve toccare.
  // SENTINEL_QPERNO_CTRL_NULL
  it('CONTROLLO POSITIVO: senza ora_ricalcolata lo snapshot resta null', () => {
    const plan = ricostruisci([
      rigaServer({
        stato: 'presa',
        ora_ricalcolata: null,
        gap_minuti: 0,
        recupero_minuti: 0,
        ora_effettiva: `${DATA}T08:00`,
      }),
    ]);
    const e = plan[0];

    expect(e.ora_ricalcolata).toBeNull();
    expect(e.ora_ricalcolata_originale).toBeNull();

    // Una derivazione incondizionata darebbe lo epoch invece di null: e il
    // modo di fallire preciso che questo controllo intercetta.
    expect(String(e.ora_ricalcolata_originale)).not.toContain('1970');
  });
});
