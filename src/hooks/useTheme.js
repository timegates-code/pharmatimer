// ============================================================
// useTheme — read-only theme hook.
//
// Reads `state.impostazioni.tema` (one of 'auto'|'light'|'dark', default 'auto')
// from the AppContext (AMB-7a.C + §6.25) and composes it with
// window.matchMedia('(prefers-color-scheme: dark)') to return the effective
// dark flag + full token map.
//
// Resolution:
//   mode='auto'  → dark follows matchMedia dynamically
//   mode='light' → dark=false, matchMedia ignored
//   mode='dark'  → dark=true,  matchMedia ignored
//
// Tokens are memoised on `dark` (AMB-7a.G) to stay referentially stable
// across re-renders.
//
// AMB-7a.H: no setter exposed here. The toggle UI (Sessione 7b) will call
// `actions.setSetting('tema', <newValue>)` directly.
//
// Throws (via useAppContext) if invoked outside <AppProvider>.
// Do NOT use this hook inside AppContext.jsx itself (circular mount risk).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../state/AppContext.jsx';
import { createThemeTokens } from '../utils/theme.js';

/**
 * @returns {{dark: boolean, tokens: ReturnType<typeof createThemeTokens>, mode: 'auto'|'light'|'dark'}}
 */
export function useTheme() {
  const { state } = useAppContext();
  const mode = state.impostazioni?.tema ?? 'auto';

  // Track the OS-level preference. Read lazily to avoid SSR / jsdom crashes
  // when matchMedia is not available.
  const [mqDark, setMqDark] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // When mode is forced (light/dark), matchMedia is irrelevant — skip
    // the subscription entirely so we don't trigger unnecessary updates.
    if (mode !== 'auto') return undefined;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setMqDark(e.matches);
    mq.addEventListener('change', handler);
    // Resync on mount: in case the preference changed between lazy init and here.
    setMqDark(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const dark = mode === 'auto' ? mqDark : mode === 'dark';
  const tokens = useMemo(() => createThemeTokens(dark), [dark]);

  return { dark, tokens, mode };
}
