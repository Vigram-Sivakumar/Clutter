/**
 * Global sentinel indicating a structural delete is in progress.
 *
 * This MUST be read-only outside the delete pipeline.
 * No logic should branch on this except DEV invariants.
 *
 * Purpose:
 * - Allows DEV-mode guards to detect mutations during structural deletes
 * - Prevents race conditions between PM updates and NodeView renders
 * - Foundation for architectural invariant enforcement
 *
 * Usage:
 * - ONLY set at delete entry points (BlockDeletion.ts, resolver calls)
 * - NEVER branch on this in production code
 * - ONLY read in DEV invariants
 */
export let STRUCTURAL_DELETE_IN_PROGRESS = false;

/**
 * Begin a structural delete operation.
 * MUST be paired with endStructuralDelete() in a finally block.
 */
export function beginStructuralDelete() {
  STRUCTURAL_DELETE_IN_PROGRESS = true;
}

/**
 * End a structural delete operation.
 * MUST be called in a finally block to guarantee cleanup.
 */
export function endStructuralDelete() {
  STRUCTURAL_DELETE_IN_PROGRESS = false;
}

/**
 * Check if a structural delete is currently in progress.
 * ONLY use this in DEV invariants, never in production logic.
 */
export function isStructuralDeleteInProgress(): boolean {
  return STRUCTURAL_DELETE_IN_PROGRESS;
}
