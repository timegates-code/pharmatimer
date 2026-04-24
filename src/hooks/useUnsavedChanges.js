// ============================================================
// useUnsavedChanges — CP4 Sessione 8c (AMB-8c.I).
// ============================================================
//
// Manages a boolean "dirty" flag with outbound sync to a parent
// via an optional onChange callback. Tuple-like API mirrors
// useState so that it can drop into existing consumers without
// call-site changes beyond the declaration.
//
// Extracted from the inline pattern used in ProfiliTab and
// ImpostazioniTab (DRY-at-3, triggered rettifica F2 / §22.9).
// FarmaciTab is the first consumer; ProfiliTab + ImpostazioniTab
// retrofit deferred to Sessione 8d (candidato §6.NN 8d).
//
// Usage:
//   const [isDirty, setDirty] = useUnsavedChanges({
//     onChange: props?.setDirty,
//   });
//
// The onChange callback is invoked via useEffect *after* the state
// update settles, keeping parent re-renders in a separate commit
// from the child's update (avoids render-during-render warnings).
// When `onChange` is undefined the hook degrades to pure local state.
// ============================================================

import { useState, useEffect } from 'react';

/**
 * @param {{ onChange?: (isDirty: boolean) => void }} [options]
 * @returns {[boolean, (next: boolean) => void]}
 */
export function useUnsavedChanges({ onChange } = {}) {
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    onChange?.(isDirty);
  }, [isDirty, onChange]);

  return [isDirty, setDirty];
}
