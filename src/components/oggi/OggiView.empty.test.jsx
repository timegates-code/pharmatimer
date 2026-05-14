// ============================================================
// OggiView -- empty state piano futuro tests
// (CP3-bis Sessione 11-quater, par.6.207 re-design Opzione A).
//
// Valida il riordino esterno del ternario in OggiView quando TUTTI
// i farmaci attivi hanno data_inizio > today (L2-NEW
// PianoFuturoEmptyState precede la foglia L2-OLD PreviewBlock).
//
// Coverage (3 scenari):
//   T1  1 farmaco data_inizio futura (2030) -> L2-NEW renderizzato,
//       testid + label "Piano disponibile dal" + 1 nome farmaco.
//   T2  2 farmaci STESSA data_inizio futura -> L2-NEW renderizzato,
//       2 nomi in ordine alfabetico it-IT.
//   T3  1 farmaco con data_inizio === today (boundary del check
//       strict >) -> planBuilder produce entries today ->
//       todayEntries.length > 0 -> ramo MULTI-DAY CARDS, NEW branch
//       skipped, no empty state piano futuro.
//
// Mock pattern: Proxy/hoist mirror di OggiView.scroll.test.jsx
// (Sessione 11-bis CP2) cosi' AppProvider monta con il fake repo
// hoisted prima di ciascun test.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

const hoist = vi.hoisted(() => ({ repo: null }));

vi.mock('../../data/repository/index.js', () => {
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      const r = hoist.repo;
      if (!r) {
        throw new Error(
          `fakeRepo read before init (prop="${String(prop)}"). ` +
          'Did the test forget to set hoist.repo before mount?'
        );
      }
      return r[prop];
    },
  });
  return {
    repo: proxy,
    getRepository: () => hoist.repo,
  };
});

import { screen } from '@testing-library/react';
import {
  makeFakeRepo,
  renderWithRealProvider,
  waitForReady,
} from '../../test/renderWithRealProvider.jsx';
import OggiView from './OggiView.jsx';

describe('OggiView empty state piano futuro (CP3-bis Opzione A)', () => {
  beforeEach(() => {
    hoist.repo = null;
  });

  it('T1: 1 farmaco data_inizio futura -> L2-NEW PianoFuturoEmptyState', async () => {
    hoist.repo = makeFakeRepo({
      farmaci: [
        {
          id: 1,
          nome: 'Antibiotico',
          tipo_frequenza: 'fisso',
          intervallo_ore: null,
          intervallo_minimo_ore: null,
          dosi_giornaliere: 1,
          relazione_pasto: 'indifferente',
          data_inizio: '2030-01-01',
          data_fine: null,
          attivo: 1,
        },
      ],
      orari: [
        {
          id: 1,
          farmaco_id: 1,
          dose_numero: 1,
          offset_minuti: 0,
          ancora_riferimento: 'colazione',
        },
      ],
    });

    const { ctxRef, unmount } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    expect(screen.getByTestId('empty-state-piano-futuro')).toBeInTheDocument();
    expect(screen.getByText(/Piano disponibile dal/i)).toBeInTheDocument();
    expect(screen.getByText('Antibiotico')).toBeInTheDocument();

    unmount();
  });

  it('T2: 2 farmaci stessa data_inizio futura -> 2 nomi alfabetico it-IT', async () => {
    hoist.repo = makeFakeRepo({
      farmaci: [
        {
          id: 1,
          nome: 'Zoloft',
          tipo_frequenza: 'fisso',
          intervallo_ore: null,
          intervallo_minimo_ore: null,
          dosi_giornaliere: 1,
          relazione_pasto: 'indifferente',
          data_inizio: '2030-01-01',
          data_fine: null,
          attivo: 1,
        },
        {
          id: 2,
          nome: 'Antibiotico',
          tipo_frequenza: 'fisso',
          intervallo_ore: null,
          intervallo_minimo_ore: null,
          dosi_giornaliere: 1,
          relazione_pasto: 'indifferente',
          data_inizio: '2030-01-01',
          data_fine: null,
          attivo: 1,
        },
      ],
      orari: [
        { id: 1, farmaco_id: 1, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'colazione' },
        { id: 2, farmaco_id: 2, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'colazione' },
      ],
    });

    const { ctxRef, unmount } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const block = screen.getByTestId('empty-state-piano-futuro');
    expect(block).toBeInTheDocument();

    const list = block.querySelector('ul');
    expect(list).not.toBeNull();
    const items = Array.from(list.children).map((li) => li.textContent);
    expect(items).toEqual(['Antibiotico', 'Zoloft']);

    unmount();
  });

  it('T3: data_inizio === today (boundary strict >) -> NEW skipped, piano in corso', async () => {
    const today = new Date().toISOString().slice(0, 10);
    hoist.repo = makeFakeRepo({
      farmaci: [
        {
          id: 1,
          nome: 'InCorsoFarmaco',
          tipo_frequenza: 'fisso',
          intervallo_ore: null,
          intervallo_minimo_ore: null,
          dosi_giornaliere: 1,
          relazione_pasto: 'indifferente',
          data_inizio: today,
          data_fine: null,
          attivo: 1,
        },
      ],
      orari: [
        {
          id: 1,
          farmaco_id: 1,
          dose_numero: 1,
          offset_minuti: 0,
          ancora_riferimento: 'colazione',
        },
      ],
    });

    const { ctxRef, unmount } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    expect(screen.queryByTestId('empty-state-piano-futuro')).toBeNull();

    unmount();
  });
});
