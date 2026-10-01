// ============================================================
// OggiView and the reminder channel (step 4 of the client): the state of
// the channel is read again at the entry of the view, never at intervals
// (Q-SYNC). At a cold opening the read of init covers it: the view mounts
// before the app is ready. Row in the bench: oggi-non-riletta.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import OggiView from './OggiView.jsx';

describe('OggiView -- canale dei promemoria', () => {
  it('all ingresso nella vista rilegge lo stato del canale, una volta', () => {
    const leggiStatoCanale = vi.fn().mockResolvedValue(null);
    renderWithProvider(<OggiView />, {
      stateOverrides: {
        impostazioni: { notifiche_attive: 1 },
        profiloAttivo: { id: 1, nome_profilo: 'Standard', ora_sveglia: '07:00', ora_sonno: '23:30' },
      },
      actions: { leggiStatoCanale },
      initialEntries: ['/oggi'],
    });
    expect(leggiStatoCanale).toHaveBeenCalledTimes(1);
  });
});
