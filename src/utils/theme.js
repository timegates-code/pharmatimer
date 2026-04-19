// ============================================================
// Theme tokens — pure factory function.
// Port 1:1 of the `useTheme(dk)` memo object from v5 mockup (lines 202-304).
// It is NOT a React hook anymore (AMB-7a.G): the hook wrapper lives in
// src/hooks/useTheme.js and calls this factory with the resolved `dark` flag.
//
// Sessione 7b-1 (AMB-7b.C / §6.28): the `cardBg` / `cardBorder` keys and the
// three global tokens `scaduta{Bg,Tx,Bd}` were renamed to match the feminine
// enum returned by `getCardState` (uiState.js) and the Spec §5.3 state names:
//   cardBg/cardBorder:  preso→presa, prossimo→prossima, attesa→in_attesa,
//                       scaduta→in_ritardo  (saltata/sospesa unchanged).
//   global tokens:      scadutaBg/Tx/Bd → inRitardoBg/Tx/Bd.
// Fix motivation: the previous masculine keys silently fell back to
// `cardBg.attesa` for any dose state, masking the real visual state. There
// were no consumers of these tokens in the 7a baseline, so the rename is
// zero-regression.
// ============================================================

/**
 * Return the full token map for the requested colour mode.
 * @param {boolean} dark
 */
export function createThemeTokens(dark) {
  const dk = Boolean(dark);
  return {
    pageBg: dk ? '#15141A' : '#FAFAF7',
    headerBg: dk ? '#15141A' : '#FAFAF7',
    headerBorder: dk ? '#2A2833' : '#E7E5E0',
    cardBg: {
      presa: dk ? '#132B1F' : '#F4FBF5',
      prossima: dk ? '#2A2010' : '#FFFAEB',
      in_attesa: dk ? '#1C1B23' : '#FFFFFF',
      saltata: dk ? '#241A1C' : '#FDF6F6',
      sospesa: dk ? '#1F1E26' : '#F7F6F3',
      in_ritardo: dk ? '#2E1A0E' : '#FFF4E8',
    },
    cardBorder: {
      presa: '#22C55E',
      prossima: '#F59E0B',
      in_attesa: dk ? '#2A2833' : '#E7E5E0',
      saltata: '#EF4444',
      sospesa: dk ? '#4A4854' : '#A8A29E',
      in_ritardo: '#F97316',
    },
    modalBg: dk ? '#1F1E26' : '#FFFFFF',
    modalOverlay: dk ? 'rgba(0,0,0,0.65)' : 'rgba(28,25,23,0.45)',
    navBg: dk ? '#19181F' : '#FFFFFF',
    navBorder: dk ? '#2A2833' : '#E7E5E0',
    textPrimary: dk ? '#F5F4F0' : '#1C1917',
    textSecondary: dk ? '#A8A29E' : '#57534E',
    textMuted: dk ? '#78716C' : '#A8A29E',
    textCard: dk ? '#E7E5E0' : '#292524',
    textCardSub: dk ? '#A8A29E' : '#57534E',
    green: dk ? '#4ADE80' : '#15803D',
    greenBg: dk ? '#0F2E1E' : '#DCFCE7',
    greenTx: dk ? '#86EFAC' : '#14532D',
    red: dk ? '#F87171' : '#B91C1C',
    redBg: dk ? '#3D1111' : '#FEF2F2',
    redTx: dk ? '#FCA5A5' : '#991B1B',
    orange: dk ? '#FB923C' : '#C2410C',
    orangeBg: dk ? '#3D1E0A' : '#FFF7ED',
    orangeTx: dk ? '#FDBA74' : '#9A3412',
    blue: dk ? '#60A5FA' : '#2563EB',
    blueBg: dk ? '#1E2E5C' : '#EFF6FF',
    blueTx: dk ? '#93C5FD' : '#1D4ED8',
    blueBd: dk ? '#2D4578' : '#BFDBFE',
    amberBg: dk ? '#2A2010' : '#FEF3C7',
    amberTx: dk ? '#FCD34D' : '#92400E',
    grayBg: dk ? '#252430' : '#F5F5F1',
    grayTx: dk ? '#A8A29E' : '#57534E',
    simBg: dk ? '#1E2E5C' : '#EFF6FF',
    simBd: dk ? '#2D4578' : '#BFDBFE',
    simTx: dk ? '#93C5FD' : '#1D4ED8',
    gapBg: dk ? '#5C1B1B' : '#FEF2F2',
    gapTx: dk ? '#FCA5A5' : '#B91C1C',
    gapBd: dk ? '#991B1B' : '#FCA5A5',
    recalcBg: dk ? '#1E3A6F' : '#EFF6FF',
    recalcTx: dk ? '#93C5FD' : '#1D4ED8',
    recalcBd: dk ? '#2D5A9F' : '#BFDBFE',
    recalcOrigBg: dk ? '#2A2833' : '#FEF9C3',
    recalcOrigTx: dk ? '#A8A29E' : '#854D0E',
    infoBg: dk ? '#0F2E48' : '#F0F9FF',
    infoBd: dk ? '#1E4E6B' : '#BAE6FD',
    infoTx: dk ? '#67E8F9' : '#0369A1',
    infoTxBold: dk ? '#A5F3FC' : '#0C4A6E',
    tapBd: dk ? '#4A4854' : '#D6D3D1',
    tapShadow: dk ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(28,25,23,0.08)',
    inRitardoBg: dk ? '#6B2410' : '#FFF7ED',
    inRitardoTx: dk ? '#FB923C' : '#C2410C',
    inRitardoBd: dk ? '#9A3412' : '#FDBA74',
    btnCircleBg: dk ? '#1E2E5C' : '#EFF6FF',
    btnCircleBd: dk ? '#2563EB' : '#93C5FD',
    checkBg: dk ? '#0F2E1E' : '#DCFCE7',
    checkBd: '#22C55E',
    checkStroke: dk ? '#4ADE80' : '#15803D',
    sospesaBg: dk ? '#252430' : '#F5F5F1',
    sospesaTx: dk ? '#A8A29E' : '#57534E',
    sospesaBd: dk ? '#4A4854' : '#D6D3D1',
    altroBg: dk ? '#252430' : '#F7F6F3',
    altroBd: dk ? '#4A4854' : '#A8A29E',
    altroTx: dk ? '#A8A29E' : '#57534E',
    warnBg: dk ? '#5C3510' : '#FFF7ED',
    warnTx: dk ? '#FDBA74' : '#9A3412',
    warnBd: dk ? '#92400E' : '#FED7AA',
    sliderTrack: dk ? '#2D4578' : '#DBEAFE',
    sliderFill: '#3B82F6',
    navActive: dk ? '#60A5FA' : '#2563EB',
    navInactive: dk ? '#4A4854' : '#A8A29E',
    modalCloseBtn: dk ? '#252430' : '#F5F5F1',
    modalAlertBg: dk ? '#3D1111' : '#FEF2F2',
    modalAlertBd: dk ? '#7F1D1D' : '#FECACA',
    modalAlertTx: dk ? '#FCA5A5' : '#991B1B',
    modalAlertSub: dk ? '#F87171' : '#B91C1C',
    btnDisabledBg: dk ? '#252430' : '#E7E5E0',
    btnDisabledTx: dk ? '#4A4854' : '#A8A29E',
    dateSepBg: dk ? '#2A2833' : '#E7E5E0',
    dateSepTx: dk ? '#CBC9C3' : '#1C1917',
  };
}
