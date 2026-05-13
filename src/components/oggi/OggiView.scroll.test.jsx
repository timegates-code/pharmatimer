// ============================================================
// OggiView -- scroll-to-anchor tests (CP2 Sessione 11-bis, par.6.206).
//
// Validates the useEffect added in OggiView for UX-N10: on ready
// transition (and on rollover mezzanotte), scroll the viewport to the
// most relevant pending entry returned by selectAnchorEntry (CP1).
//
// Coverage (3 scenarios):
//   S1  anchor present (DEFAULT_SEED, farmaco1 with 2 dose/day):
//       scrollIntoView called + scrollBy(0, -157) sticky compensation.
//   S2  anchor null (no farmaci attivi -> empty plan today):
//       scrollTo({top:0, behavior:'auto'}) fallback.
//   S3  no re-fire on useNow tick (deps [state.status, today] discrete):
//       3 setSimulatedNow on same day -> scroll mock call count invariant.
//
// Mock setup. jsdom does not implement scrollIntoView nor reflows for
// window.scrollTo/scrollBy. requestAnimationFrame in jsdom is async --
// we replace it with a synchronous shim so the deferred scroll side-effect
// is observable in the same tick (production code uses rAF to defer 1
// frame post-render, ensuring DoseCard is mounted before querySelector,
// CP2-SUB-2 ratified par.22.55 closing). getComputedStyle stubbed to
// return '--sticky-offset: 149px' (matching the Tailwind fallback in
// top-[var(--sticky-offset,149px)] on the DATE SEPARATOR pill).
//
// Pattern: same Proxy/hoist mock as OggiView.test.jsx (Sessione 7c-2)
// so the test integrates with the same AppProvider + makeFakeRepo flow.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ------------------------------------------------------------
// Mock boundary -- Proxy pattern (same as OggiView.test.jsx).
// ------------------------------------------------------------

const hoist = vi.hoisted(() => ({ repo: null }));

vi.mock('../../data/repository/index.js', () => {
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      const r = hoist.repo;
      if (!r) {
        throw new Error(
          `fakeRepo read before init (prop="${String(prop)}"). ` +
          `Did the test forget beforeEach(() => { hoist.repo = makeFakeRepo(); })?`
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

import {
  DEFAULT_SEED,
  makeFakeRepo,
  renderWithRealProvider,
  waitForReady,
  runAction,
} from '../../test/renderWithRealProvider.jsx';
import { MemoryRouter } from 'react-router-dom';
import OggiView from './OggiView.jsx';

// ------------------------------------------------------------
// Scroll mocks
// ------------------------------------------------------------

let scrollIntoViewMock;
let scrollToMock;
let scrollByMock;
let originalScrollTo;
let originalScrollBy;
let originalRAF;
let originalGetComputedStyle;

beforeEach(() => {
  hoist.repo = makeFakeRepo();

  // jsdom default: scrollIntoView is undefined on Element.prototype.
  scrollIntoViewMock = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoViewMock;

  // Save + replace window.scrollTo / window.scrollBy (jsdom no-op stubs
  // exist but we want call-count visibility).
  originalScrollTo = window.scrollTo;
  originalScrollBy = window.scrollBy;
  scrollToMock = vi.fn();
  scrollByMock = vi.fn();
  window.scrollTo = scrollToMock;
  window.scrollBy = scrollByMock;

  // Synchronous rAF shim: fire callback immediately so the deferred
  // scroll side-effect is observable in the same tick.
  originalRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };

  // Stub getComputedStyle to return '--sticky-offset: 149px' (matching
  // the Tailwind fallback). Any other property returns ''.
  originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (_el) => ({
    getPropertyValue: (prop) => (prop === '--sticky-offset' ? '149px' : ''),
  });
});

afterEach(() => {
  window.scrollTo = originalScrollTo;
  window.scrollBy = originalScrollBy;
  globalThis.requestAnimationFrame = originalRAF;
  window.getComputedStyle = originalGetComputedStyle;
});

// ============================================================
// Tests
// ============================================================

describe('OggiView scroll-to-anchor on ready (par.6.206)', () => {
  it('[S1] scrolls to anchor entry on ready when plan has pending today doses', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    // DEFAULT_SEED has farmaco1 with 2 dose/day (08:00 + 14:00 per existing
    // OggiView.test.jsx scenarios). Wall-clock time of the runner determines
    // whether anchor is P1 (in_ritardo, before now) or P2 (next future) --
    // either way selectAnchorEntry returns a non-null entry, so:
    expect(scrollIntoViewMock).toHaveBeenCalled();
    const lastIntoViewArgs = scrollIntoViewMock.mock.calls.at(-1);
    expect(lastIntoViewArgs[0]).toMatchObject({ block: 'start', behavior: 'auto' });

    // Sticky offset compensation: stub returns '149px' -> -(149 + 8) = -157.
    expect(scrollByMock).toHaveBeenCalledWith(0, -157);

    // scrollTo top:0 fallback must NOT have fired (anchor was not null).
    const topCalls = scrollToMock.mock.calls.filter(
      (args) => args[0] && args[0].top === 0,
    );
    expect(topCalls.length).toBe(0);
  });

  it('[S2] scrolls to top when anchor is null (no farmaci attivi)', async () => {
    // Override seed: zero farmaci -> selectFarmaciAttivi.length===0 branch
    // triggers EmptyStateZeroFarmaci, which uses <Link> from react-router-dom
    // and needs a Router context. We wrap in MemoryRouter for that.
    // Spread DEFAULT_SEED first: makeFakeRepo does NOT spread internally
    // (see SEED_TWO_FARMACI pattern in OggiView.test.jsx), so without spread
    // profili/impostazioni come back undefined and AppProvider init crashes.
    hoist.repo = makeFakeRepo({ ...DEFAULT_SEED, farmaci: [], orari: [] });

    const { ctxRef } = renderWithRealProvider(
      <MemoryRouter><OggiView /></MemoryRouter>,
    );
    await waitForReady(ctxRef);

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(scrollByMock).not.toHaveBeenCalled();
  });

  it('[S3] does NOT re-fire scroll on useNow tick (deps [state.status, today] discrete)', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    // After ready, useEffect has fired once (either scrollIntoView or
    // scrollTo path depending on plan state).
    const intoViewAfterMount = scrollIntoViewMock.mock.calls.length;
    const scrollToAfterMount = scrollToMock.mock.calls.length;
    const scrollByAfterMount = scrollByMock.mock.calls.length;

    // 3 setSimulatedNow on same day: changes now.minutes (useNow tick proxy)
    // but neither state.status (already 'ready') nor today (same date).
    // useEffect with deps [state.status, today] must NOT re-fire.
    await runAction(() => ctxRef.current.actions.setSimulatedNow('10:00'));
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.setSimulatedNow('12:00'));

    expect(scrollIntoViewMock.mock.calls.length).toBe(intoViewAfterMount);
    expect(scrollToMock.mock.calls.length).toBe(scrollToAfterMount);
    expect(scrollByMock.mock.calls.length).toBe(scrollByAfterMount);
  });
});
