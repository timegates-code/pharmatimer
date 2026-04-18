import { useAppContext } from '../../state/AppContext.jsx';
import {
  selectToday,
  selectEntriesForDay,
  selectProssimaDose,
  selectFarmaciAttivi,
} from '../../state/selectors.js';

// Placeholder ready per Sessione 5b parte 2/2.
// Verifica visiva dell integrazione stato-selectors-Provider.
// La vista Oggi completa arriva in Step 7 (porting mockup v5).
export default function OggiView() {
  const { state, actions } = useAppContext();

  if (state.status === 'idle') {
    return (
      <div className="p-4 pb-24">
        <p className="text-sm opacity-70">Caricamento...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-xl font-bold mb-2">Errore</h1>
        <p className="text-sm mb-4">
          {state.error?.message ?? 'Errore sconosciuto'}
        </p>
        <button
          type="button"
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          onClick={() => actions.init()}
        >
          Riprova
        </button>
      </div>
    );
  }

  // status === 'ready'
  const today = selectToday(state);
  const entriesOggi = selectEntriesForDay(state, today);
  const prossima = selectProssimaDose(state);
  const farmaciAttivi = selectFarmaciAttivi(state);

  return (
    <div className="p-4 pb-24 space-y-2">
      <h1 className="text-2xl font-bold mb-2">Oggi</h1>
      <p>Ciao {state.nomeUtente || '(anonimo)'}</p>
      <p>Profilo attivo: {state.profiloAttivo?.nome_profilo ?? '-'}</p>
      <p>Farmaci attivi: {farmaciAttivi.length}</p>
      <p>Dosi oggi: {entriesOggi.length}</p>
      <p>Prossima: {prossima?.farmaco?.nome ?? '-'}</p>
    </div>
  );
}
