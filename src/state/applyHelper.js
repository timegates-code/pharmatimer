// ============================================================
// commitApplyResult — DRY optimistic-commit helper reused by all
// 6 apply* thunks (presa, salta, sospendi, recupero, ripristina,
// annullaUltima). Changelog Fase 2 §13/D7 + §11 AMB-5b2.A.
// ============================================================
//
// Flow (pushPresoKey OR neither):
//   1. snapshot plan
//   2. pure domainCall (may throw DomainError)
//   3. dispatch COMMIT_APPLY_RESULT { plan, prompt, pushPresoKey }
//   4. persist logWrites atomically via repo.upsertLogsBatch
//   5. on fail: SET_PLAN(snapshot) + maybe DISMISS_PROMPT +
//      maybe POP_PRESO_STACK + SET_ERROR kind=repo
//
// Flow (popPresoKey=true, annullaUltima only):
//   1. snapshot plan + snapshot poppedKey (last of presoStack)
//   2. pure domainCall
//   3. dispatch COMMIT_APPLY_RESULT { plan, prompt, pushPresoKey:null }
//      + dispatch POP_PRESO_STACK
//   4. persist
//   5. on fail: SET_PLAN(snapshot) + dispatch COMMIT_APPLY_RESULT
//      { plan:snapshot, prompt:null, pushPresoKey:poppedKey }
//      + SET_ERROR kind=repo
//
// Idempotency: pushPresoKey and popPresoKey are mutually
// exclusive. If both truthy, the helper throws synchronously.
//
// React 18 automatic batching collapses each dispatch cluster
// into a single render.

import { DomainError } from '../domain/errors.js';

/**
 * @typedef {object} CommitArgs
 * @property {(a: {type: string, payload?: any}) => void} dispatch
 * @property {() => import('./reducer.js').AppState} getState
 * @property {{upsertLogsBatch: (logs: any[]) => Promise<any[]>}} repo
 * @property {(plan: any) => import('../domain/types.js').ApplyResult} domainCall
 *           Pure function; closes over the thunk's own args.
 * @property {string|null} [pushPresoKey]
 *           If set, push this key onto presoStack on success
 *           (and pop it on rollback). Mutually exclusive with popPresoKey.
 * @property {boolean} [popPresoKey]
 *           If true, pop the last key from presoStack on success
 *           (and re-push it on rollback). Only used by annullaUltima.
 *           Mutually exclusive with pushPresoKey.
 */

/**
 * @param {CommitArgs} args
 * @returns {Promise<{ok: boolean}>}
 */
export async function commitApplyResult({
  dispatch, getState, repo, domainCall,
  pushPresoKey = null, popPresoKey = false,
}) {
  // Guard: the two stack operations are mutually exclusive.
  if (pushPresoKey && popPresoKey) {
    throw new Error(
      'commitApplyResult: pushPresoKey and popPresoKey are mutually exclusive'
    );
  }

  // --- Snapshots BEFORE any dispatch (rollback source of truth). ---
  const snapshotPlan = getState().plan;
  let poppedKey = null;
  if (popPresoKey) {
    const stack = getState().presoStack;
    poppedKey = stack.length > 0 ? stack[stack.length - 1] : null;
  }

  // 1. Pure domain call — may raise DomainError.
  let result;
  try {
    result = domainCall(snapshotPlan);
  } catch (err) {
    if (err instanceof DomainError) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'domain',
          severity: err?.severity ?? 'error',
          code: err.code,
          message: err.message,
        },
      });
      // Surface the domain code in the thunk return value so UI consumers
      // (e.g. UndoModal) can branch on it directly, without reading back
      // from state.error. Sessione 7d-2 CP5 / §6.63.
      return { ok: false, code: err.code };
    }
    dispatch({
      type: 'SET_ERROR',
      payload: {
        kind: 'unknown',
        severity: err?.severity ?? 'error',
        code: err?.code,
        message: err?.message ?? String(err),
      },
    });
    return { ok: false };
  }

  // 2. Optimistic commit.
  dispatch({
    type: 'COMMIT_APPLY_RESULT',
    payload: {
      plan: result.plan,
      prompt: result.prompt,
      pushPresoKey: popPresoKey ? null : pushPresoKey,
    },
  });
  if (popPresoKey) {
    dispatch({ type: 'POP_PRESO_STACK' });
  }

  // 3. Persist atomically.
  try {
    if (result.logWrites && result.logWrites.length > 0) {
      await repo.upsertLogsBatch(result.logWrites);
    }
  } catch (err) {
    // Rollback composed from existing actions.
    dispatch({ type: 'SET_PLAN', payload: snapshotPlan });

    if (popPresoKey) {
      // Re-push the popped key. COMMIT_APPLY_RESULT with prompt:null
      // and plan:snapshot also clears any prompt raised above.
      dispatch({
        type: 'COMMIT_APPLY_RESULT',
        payload: {
          plan: snapshotPlan,
          prompt: null,
          pushPresoKey: poppedKey,
        },
      });
    } else {
      if (result.prompt) dispatch({ type: 'DISMISS_PROMPT' });
      if (pushPresoKey) dispatch({ type: 'POP_PRESO_STACK' });
    }

    dispatch({
      type: 'SET_ERROR',
      payload: {
        kind: 'repo',
        severity: err?.severity ?? 'error',
        code: err?.code,
        message: err?.message ?? 'Errore di persistenza',
      },
    });
    return { ok: false };
  }

  return { ok: true };
}
