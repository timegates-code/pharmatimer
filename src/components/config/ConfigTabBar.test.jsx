// ============================================================
// ConfigTabBar — tests (CP3 Sessione 8a).
// ============================================================
//
// Pattern: mount ConfigTabBar inside a Route `/config/*` (same
// shape as App.jsx) so that relative `to="profili"` resolves to
// `/config/profili`. MemoryRouter supplied via renderWithProvider
// `initialEntries` (AMB-8a.H + F5).
//
// Tests coverage:
//   1. Render: 3 label presenti come link accessibili.
//   2. Navigation: click su un tab aggiorna il pathname.
//   3. Active state: aria-current="page" riflette l'URL
//      corrente (auto-applicato da NavLink v6).

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useLocation } from 'react-router-dom';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import ConfigTabBar from './ConfigTabBar.jsx';

// Helper: expose current pathname in DOM for assertion after click.
function PathnameProbe() {
  const { pathname } = useLocation();
  return <div data-testid="pathname-probe">{pathname}</div>;
}

function renderAtPath(initialPath) {
  return renderWithProvider(
    <Routes>
      <Route
        path="/config/*"
        element={
          <>
            <ConfigTabBar />
            <PathnameProbe />
          </>
        }
      />
    </Routes>,
    { initialEntries: [initialPath] }
  );
}

describe('ConfigTabBar', () => {
  it('renderizza i 3 tab label come link accessibili', () => {
    renderAtPath('/config/impostazioni');
    expect(screen.getByRole('link', { name: 'Profili' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Farmaci' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toBeInTheDocument();
  });

  it('click su "Profili" naviga a /config/profili', async () => {
    const user = userEvent.setup();
    renderAtPath('/config/impostazioni');
    expect(screen.getByTestId('pathname-probe')).toHaveTextContent('/config/impostazioni');

    await user.click(screen.getByRole('link', { name: 'Profili' }));

    expect(screen.getByTestId('pathname-probe')).toHaveTextContent('/config/profili');
  });

  it('active tab riflette l URL corrente via aria-current', () => {
    renderAtPath('/config/farmaci');

    expect(screen.getByRole('link', { name: 'Farmaci' }))
      .toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Profili' }))
      .not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Impostazioni' }))
      .not.toHaveAttribute('aria-current');
  });
});
