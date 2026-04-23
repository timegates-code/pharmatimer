// ============================================================
// ConfigView — routing tests.
// ============================================================
//
// Scope CP2 Sessione 8a (§11 + AMB-8a.A + rettifica F5):
//   - /config/impostazioni monta ImpostazioniTab
//   - /config (index)      redirect → /config/impostazioni
//   - /config/profili      monta ProfiliTab
//   - /config/*            redirect → /config/impostazioni
//
// Pattern: MemoryRouter supplied via `initialEntries` option on
// `renderWithProvider` (AMB-8a.H, rettifica F5). The option is
// backward-compatible: existing callers that omit it keep the
// previous behaviour (no router in tree). The mount reproduces
// App.jsx's parent route `<Route path="/config/*" …>` so the
// relative children inside ConfigView resolve correctly.
//
// Assertion strategy: testid on the tab-level wrapper (stable
// across CP2→CP6; see ImpostazioniTab.jsx convention note).
// This avoids coupling routing tests to placeholder copy that
// will change in later CPs.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import ConfigView from './ConfigView.jsx';

function renderAtPath(initialPath) {
  return renderWithProvider(
    <Routes>
      <Route path="/config/*" element={<ConfigView />} />
    </Routes>,
    { initialEntries: [initialPath] }
  );
}

describe('ConfigView — routing', () => {
  it('/config/impostazioni monta ImpostazioniTab', () => {
    renderAtPath('/config/impostazioni');
    expect(screen.getByTestId('config-tab-impostazioni')).toBeInTheDocument();
  });

  it('/config redirige all index → impostazioni', () => {
    renderAtPath('/config');
    expect(screen.getByTestId('config-tab-impostazioni')).toBeInTheDocument();
    // Negative assertion: non mostra altre tab.
    expect(screen.queryByTestId('config-tab-profili')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config-tab-farmaci')).not.toBeInTheDocument();
  });

  it('/config/profili monta ProfiliTab', () => {
    renderAtPath('/config/profili');
    expect(screen.getByTestId('config-tab-profili')).toBeInTheDocument();
    // Redirect catch-all non scatta per path validi.
    expect(screen.queryByTestId('config-tab-impostazioni')).not.toBeInTheDocument();
  });

  it('/config/rotta-inesistente (catch-all) redirige a impostazioni', () => {
    renderAtPath('/config/qualcosa-che-non-esiste');
    expect(screen.getByTestId('config-tab-impostazioni')).toBeInTheDocument();
  });
});
