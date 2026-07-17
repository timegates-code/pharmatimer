// ============================================================
// FarmaciTab — ramo intervallo esteso. RISCRITTO INTEGRALE da P15-B
// (par.22.198-octodecies, Q-SEPT-3=(A)): prova di accettazione del
// code-step. SENTINEL_P15B_EXTENDED_TESTS
// ============================================================
//
// Cosa e cambiato rispetto alla versione CP8 §6.183-185 di questo file.
// Prima: due input numerici liberi, `intervallo_giorni` + `intervallo_ore_
// residue`, letti come ADDENDI (giorni*24 + ore). Si potevano digitare
// combinazioni fuori dal dominio del modello -- "1 giorno e 6 ore" (30h,
// non rappresentabile come cadenza a giorni civili) o 365 giorni (8760h,
// oltre la colonna DECIMAL(4,1): B28).
// Ora (s.6.255): due RAMI MUTUAMENTE ESCLUSIVI selezionati da
// `intervallo_modo` ('ore' -> select a dominio chiuso; 'giorni' -> intero
// 2..41). Il modo NON e persistito: si DERIVA da `intervallo_ore` al load
// (P4), e i valori legacy non classificabili finiscono in QUARANTENA.
//
//   T1'  edit 168h -> ramo 'giorni' con Giorni=7; switch a 'ore' + 12
//        -> updateFarmaco con intervallo_ore=12.
//   T2'  48h -> l input dosi e sostituito dalla riga statica (P2 198-ter).
//   T3'  cascade §6.185: 2 orari sopravvivono al chokepoint (che MAPPA le
//        righe, non le trimma) -> Salva apre il ConfirmModal -> Conferma
//        -> payload dosi=1, orari=1, intervallo_ore=48.
//   Tq   quarantena: 30h non e ne un valore del select ne un multiplo di
//        24 -> nessun campo, avviso, Salva bloccato anche a form dirty.
//   Ts   lo switch di ramo azzera SEMPRE il campo che si lascia.
//   Tt   fisso -> intervallo rientra pulito (modo 'ore', campi vuoti).
//   Td   dominio del select: placeholder disabilitato + 8 opzioni.
//   Tcs5 REGRESSION CS-5 (D3 + chokepoint azione 1). Vedi la nota nel test.
//
// Pattern invariati dalla versione precedente: `actions: { ... }` override
// su renderWithProvider (renderHelpers.jsx 7d-1 + §6.94); `fireEvent.change`
// per input/select; ConfirmModal via testid `confirm-modal` (i 3 montati in
// FarmaciTab sono mutuamente esclusivi su open=true).
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import FarmaciTab from './FarmaciTab.jsx';

function buildProfiloAttivo() {
  return {
    id: 1, nome_profilo: 'Standard',
    ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
    attivo: 1,
  };
}

// Farmaco a intervallo, campi non pertinenti ai test tenuti costanti.
function buildFarmaco(overrides) {
  return {
    id: 1, nome: 'Test', principio_attivo: null, funzione: null,
    tipo_frequenza: 'intervallo', intervallo_ore: 8, intervallo_minimo_ore: null,
    dosi_giornaliere: 1, relazione_pasto: 'indifferente',
    dettaglio_pasto: null, note: null,
    data_inizio: '2026-04-01', data_fine: null, attivo: 1,
    ...overrides,
  };
}

function buildOrari(farmacoId, n) {
  return Array.from({ length: n }, (_, i) => ({
    id: farmacoId * 10 + i + 1,
    farmaco_id: farmacoId,
    dose_numero: i + 1,
    offset_minuti: i * 480,
    ancora_riferimento: 'colazione',
    descrizione_momento: null,
  }));
}

// Apre il drawer in edit sul farmaco indicato.
async function openEdit(user, id) {
  await user.click(within(screen.getByTestId(`farmaco-card-${id}`)).getByRole('button'));
  return screen.getByTestId('farmaco-drawer');
}

function renderEdit(farmaco, orari, actions = {}) {
  return renderWithProvider(<FarmaciTab />, {
    stateOverrides: {
      farmaci: [farmaco],
      orari,
      profili: [buildProfiloAttivo()],
    },
    actions,
  });
}

describe('FarmaciTab — P15-B ramo intervallo: derivazione e switch', () => {
  // ----------------------------------------------------------
  // T1' — 168h si carica come 7 giorni; switch a 'ore' e salvataggio.
  // ----------------------------------------------------------
  it("(T1') edit intervallo_ore=168 carica il ramo 'giorni' a 7; switch a 'ore' + 12 -> updateFarmaco con intervallo_ore=12", async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    const farmaco = buildFarmaco({
      id: 99, nome: 'Metotrexato', principio_attivo: 'metotrexato',
      funzione: 'Antireumatico', intervallo_ore: 168, relazione_pasto: 'durante',
    });
    renderEdit(farmaco, buildOrari(99, 1), { updateFarmaco });

    const drawer = await openEdit(user, 99);

    // 168 = 7 * 24 -> cadenza a giorni civili: ramo 'giorni', select assente.
    expect(within(drawer).getByLabelText('Giorni')).toHaveValue(7);
    expect(within(drawer).queryByLabelText('Ore')).not.toBeInTheDocument();

    await user.click(within(drawer).getByLabelText('Ogni tot ore'));

    // Lo switch azzera il campo lasciato: il select nasce sul placeholder.
    const selectOre = within(drawer).getByLabelText('Ore');
    expect(selectOre).toHaveValue('');
    expect(within(drawer).queryByLabelText('Giorni')).not.toBeInTheDocument();

    fireEvent.change(selectOre, { target: { value: '12' } });
    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));

    await waitFor(() => expect(updateFarmaco).toHaveBeenCalledTimes(1));
    const [calledId, farmacoData] = updateFarmaco.mock.calls[0];
    expect(calledId).toBe(99);
    expect(farmacoData.intervallo_ore).toBe(12);
  });

  // ----------------------------------------------------------
  // Ts — lo switch di ramo azzera il campo inattivo.
  // ----------------------------------------------------------
  it('(Ts) lo switch di modalita azzera sempre il campo del ramo che si lascia', async () => {
    const user = userEvent.setup();
    const farmaco = buildFarmaco({ id: 51, nome: 'Switch', intervallo_ore: 8 });
    renderEdit(farmaco, buildOrari(51, 1));

    const drawer = await openEdit(user, 51);
    expect(within(drawer).getByLabelText('Ore')).toHaveValue('8');

    await user.click(within(drawer).getByLabelText('Ogni tot giorni'));
    const giorni = within(drawer).getByLabelText('Giorni');
    expect(giorni).toHaveValue(null);
    fireEvent.change(giorni, { target: { value: '3' } });
    expect(within(drawer).getByLabelText('Giorni')).toHaveValue(3);

    // Tornando a 'ore' il valore 8 NON riaffiora: era stato azzerato al
    // primo switch. Un campo inattivo che conserva il valore e un addendo
    // fantasma in attesa di rientrare nel conto.
    await user.click(within(drawer).getByLabelText('Ogni tot ore'));
    expect(within(drawer).getByLabelText('Ore')).toHaveValue('');

    // Simmetrico: il 3 dei giorni e stato azzerato a sua volta.
    await user.click(within(drawer).getByLabelText('Ogni tot giorni'));
    expect(within(drawer).getByLabelText('Giorni')).toHaveValue(null);
  });

  // ----------------------------------------------------------
  // Tt — rientro pulito da fisso a intervallo.
  // ----------------------------------------------------------
  it("(Tt) tipo fisso azzera campi e modo; il rientro in intervallo riparte da 'ore' pulito", async () => {
    const user = userEvent.setup();
    const farmaco = buildFarmaco({ id: 52, nome: 'Rientro', intervallo_ore: 168 });
    renderEdit(farmaco, buildOrari(52, 1));

    const drawer = await openEdit(user, 52);
    expect(within(drawer).getByLabelText('Giorni')).toHaveValue(7);

    await user.click(within(drawer).getByLabelText('Fisso'));
    expect(within(drawer).queryByLabelText('Giorni')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Ore')).not.toBeInTheDocument();

    await user.click(within(drawer).getByLabelText('A intervallo'));

    // Il 7 non riaffiora e il modo e tornato al default: nessuno stato
    // extended sopravvive al passaggio da fisso.
    expect(within(drawer).getByLabelText('Ore')).toHaveValue('');
    expect(within(drawer).queryByLabelText('Giorni')).not.toBeInTheDocument();
    expect(within(drawer).queryByTestId('intervallo-quarantena')).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Td — dominio chiuso del select.
  // ----------------------------------------------------------
  it('(Td) il ramo ore e un select a dominio chiuso: placeholder disabilitato + 8 opzioni', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: [], profili: [buildProfiloAttivo()] },
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    await user.click(within(drawer).getByLabelText('A intervallo'));

    const select = within(drawer).getByLabelText('Ore');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(9);
    expect(options.map((o) => o.value)).toEqual(
      ['', '1', '2', '3', '4', '6', '8', '12', '24'],
    );
    expect(options[0]).toBeDisabled();
  });
});

describe('FarmaciTab — P15-B quarantena dei valori legacy', () => {
  // ----------------------------------------------------------
  // Tq — 30h non e rappresentabile: nessun campo, avviso, Salva bloccato.
  // ----------------------------------------------------------
  it('(Tq) intervallo_ore=30 (ne opzione del select ne multiplo di 24) va in quarantena e blocca Salva', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn();
    const updateFarmaco = vi.fn();

    const farmaco = buildFarmaco({ id: 30, nome: 'Legacy 30h', intervallo_ore: 30 });
    renderEdit(farmaco, buildOrari(30, 1), { addFarmaco, updateFarmaco });

    const drawer = await openEdit(user, 30);

    expect(within(drawer).getByTestId('intervallo-quarantena')).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Ore')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Giorni')).not.toBeInTheDocument();

    // Il form viene sporcato: cosi il Salva disabilitato prova la quarantena
    // e non il semplice "nulla da salvare".
    await user.type(within(drawer).getByLabelText(/^Nome/), 'X');
    expect(within(drawer).getByRole('button', { name: /^salva$/i })).toBeDisabled();
    expect(updateFarmaco).not.toHaveBeenCalled();
  });
});

describe('FarmaciTab — P15-B confine extended (§6.184-185)', () => {
  // ----------------------------------------------------------
  // T2' — oltre le 24h l input dosi lascia il posto alla riga statica.
  // ----------------------------------------------------------
  it("(T2') Giorni=2 (48h) sostituisce l input dosi con la riga statica a 1", async () => {
    const user = userEvent.setup();
    const farmaco = buildFarmaco({
      id: 50, nome: 'Standard 8h', intervallo_ore: 8, dosi_giornaliere: 3,
    });
    renderEdit(farmaco, buildOrari(50, 3));

    const drawer = await openEdit(user, 50);

    const dosiInput = within(drawer).getByTestId('farmaco-dosi-giornaliere-input');
    expect(dosiInput).toHaveValue(3);
    expect(dosiInput).not.toBeDisabled();

    await user.click(within(drawer).getByLabelText('Ogni tot giorni'));
    fireEvent.change(within(drawer).getByLabelText('Giorni'), { target: { value: '2' } });

    expect(within(drawer).queryByTestId('farmaco-dosi-giornaliere-input')).not.toBeInTheDocument();
    const statica = within(drawer).getByTestId('farmaco-dosi-statica');
    expect(statica).toHaveTextContent('Dosi giornaliere: 1');
    expect(statica).toHaveTextContent('oltre le 24 ore');
  });

  // ----------------------------------------------------------
  // T3' — cascade al salvataggio quando restano righe in eccesso.
  // ----------------------------------------------------------
  it("(T3') 2 orari + passaggio a 48h -> Salva apre il cascade -> Conferma salva dosi=1, orari=1, intervallo_ore=48", async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    const farmaco = buildFarmaco({
      id: 70, nome: 'Test cascade', intervallo_ore: 8, dosi_giornaliere: 2,
    });
    renderEdit(farmaco, buildOrari(70, 2), { updateFarmaco });

    const drawer = await openEdit(user, 70);

    // Le 2 righe restano 2: il chokepoint le RIMAPPA ad 'assoluto', non le
    // trimma (il trim vive al save-time, §6.185).
    await user.click(within(drawer).getByLabelText('Ogni tot giorni'));
    fireEvent.change(within(drawer).getByLabelText('Giorni'), { target: { value: '2' } });

    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));
    expect(updateFarmaco).not.toHaveBeenCalled();

    const confirm = await screen.findByTestId('confirm-modal');
    expect(within(confirm).getByText('Intervallo oltre le 24 ore')).toBeInTheDocument();
    expect(within(confirm).getByText(/Verrà rimosso 1 orario aggiuntivo/i)).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: /^conferma$/i }));

    await waitFor(() => expect(updateFarmaco).toHaveBeenCalledTimes(1));
    const [calledId, farmacoData, orariPayload] = updateFarmaco.mock.calls[0];
    expect(calledId).toBe(70);
    expect(farmacoData.dosi_giornaliere).toBe(1);
    expect(farmacoData.intervallo_ore).toBe(48);
    expect(orariPayload).toHaveLength(1);
    expect(orariPayload[0].dose_numero).toBe(1);
  });

  // ----------------------------------------------------------
  // Tcs5 — REGRESSION CS-5.
  // ----------------------------------------------------------
  //
  // Il difetto (misurato su d6665e6, par.22.198-septdecies). Ridurre le dosi
  // riempie `removedOrari` e accende un banner con il pulsante "Ripristina".
  // Il flip a extended NON svuotava quello stato e il banner non e gated su
  // extended: il pulsante restava li. Premendolo, `undoTrim` riscriveva
  // `dosi_giornaliere` FUORI dal lock -- mentre la UI mostrava gia la riga
  // statica "Dosi giornaliere: 1" -- e si sarebbe persistito un farmaco
  // extended con dosi_giornaliere=3 e un solo orario.
  //
  // Il fix (D3) agisce A MONTE: il chokepoint svuota `removedOrari` sul
  // fronte di salita. Il banner sparisce, "Ripristina" con lui, e la catena
  // non ha piu un ingresso -- senza toccare i gate del banner (Q4 / C-1).
  //
  // Percio questo test NON attraversa il cascade: dopo il trim le righe sono
  // gia 1, e `handleSalva` apre il ConfirmModal solo con orari.length > 1.
  // L assenza del modal e essa stessa un asserto. Il cascade e coperto da T3'.
  //
  // Attribuzione (verbale par.22.198-octodecies): Tcs5 prova D3 e l azione (1)
  // del chokepoint. D2 (hardening di normalizeForm) NON e esercitata qui -- il
  // form arriva al Salva gia con dosi='1' -- e post-fix non e raggiungibile
  // da UI: resta una cintura difensiva, non una regola coperta da test.
  it('(Tcs5) il flip a extended estingue la catena undoTrim: banner e Ripristina spariscono, il payload resta a dosi=1', async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    const farmaco = buildFarmaco({
      id: 60, nome: 'Regression CS-5', intervallo_ore: 8, dosi_giornaliere: 3,
    });
    renderEdit(farmaco, buildOrari(60, 3), { updateFarmaco });

    const drawer = await openEdit(user, 60);

    // 3 -> 1: due righe finiscono in `removedOrari`, il banner si accende.
    fireEvent.change(
      within(drawer).getByTestId('farmaco-dosi-giornaliere-input'),
      { target: { value: '1' } },
    );
    expect(within(drawer).getByText('2 orari rimossi')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /^ripristina$/i })).toBeInTheDocument();

    // Fronte di salita verso extended.
    await user.click(within(drawer).getByLabelText('Ogni tot giorni'));
    fireEvent.change(within(drawer).getByLabelText('Giorni'), { target: { value: '2' } });

    // D3: lo stato e svuotato, quindi non c e piu nulla da ripristinare.
    expect(within(drawer).queryByText('2 orari rimossi')).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /^ripristina$/i })).not.toBeInTheDocument();
    expect(within(drawer).getByTestId('farmaco-dosi-statica')).toHaveTextContent('Dosi giornaliere: 1');

    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));

    // Una sola riga: nessun cascade da intercettare.
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    await waitFor(() => expect(updateFarmaco).toHaveBeenCalledTimes(1));
    const [calledId, farmacoData, orariPayload] = updateFarmaco.mock.calls[0];
    expect(calledId).toBe(60);
    expect(farmacoData.dosi_giornaliere).toBe(1);
    expect(farmacoData.intervallo_ore).toBe(48);
    expect(orariPayload).toHaveLength(1);
  });
});
