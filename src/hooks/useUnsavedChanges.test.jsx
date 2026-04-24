// ============================================================
// useUnsavedChanges — tests (CP4 Sessione 8c / AMB-8c.I).
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsavedChanges } from './useUnsavedChanges.js';

describe('useUnsavedChanges', () => {
  it('initial false → setDirty(true) flips + onChange; setDirty(false) reverts', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ onChange }));

    // Initial: isDirty=false, onChange called once with false (mount effect).
    expect(result.current[0]).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);

    // setDirty(true): isDirty flips, onChange synced.
    act(() => { result.current[1](true); });
    expect(result.current[0]).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    // setDirty(false): isDirty reverts, onChange synced.
    act(() => { result.current[1](false); });
    expect(result.current[0]).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
