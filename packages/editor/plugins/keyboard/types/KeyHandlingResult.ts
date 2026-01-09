/**
 * KeyHandlingResult - Explicit keyboard handling outcome
 *
 * This type enforces single ownership of keyboard events.
 * Every keyboard handler MUST return this type, never boolean.
 *
 * RULE: If an intent is emitted, the browser must never see the key.
 *
 * handled: true → preventDefault + stopPropagation
 * handled: false → let ProseMirror/browser handle it
 */
export type KeyHandlingResult =
  | {
      handled: true;
      source: 'engine';
      intent?: string; // Optional: for logging/debugging
      reason?: string; // Optional: why it was handled (success or failure)
    }
  | {
      handled: false;
      reason?: string; // Optional: why not handled
    };

/**
 * Helper: Create a "handled" result
 */
export function handled(intent?: string, reason?: string): KeyHandlingResult {
  return {
    handled: true,
    source: 'engine',
    intent,
    reason,
  };
}

/**
 * Helper: Create a "not handled" result
 */
export function notHandled(reason?: string): KeyHandlingResult {
  return {
    handled: false,
    reason,
  };
}

/**
 * Helper: Convert boolean to KeyHandlingResult (legacy compatibility)
 * TODO: Remove once all handlers use explicit result types
 */
export function fromBoolean(result: boolean): KeyHandlingResult {
  return result ? handled() : notHandled();
}
