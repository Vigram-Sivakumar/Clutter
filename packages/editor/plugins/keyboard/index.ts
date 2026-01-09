/**
 * Keyboard Rule Engine
 *
 * Composable, testable keyboard behavior policies.
 *
 * Architecture:
 * - KeyboardContext: What rules see (immutable state)
 * - KeyboardRule: Single behavior policy (when + execute)
 * - KeyboardEngine: Rule executor (evaluates in priority order)
 *
 * Rules are:
 * - Pure (no side effects in when())
 * - Explicit (clear intent)
 * - Composable (can be ordered)
 * - Testable (easy to mock)
 */

// Core types
export type { KeyboardContext } from './types/KeyboardContext';
export { createKeyboardContext } from './types/KeyboardContext';

export type { KeyboardRule } from './types/KeyboardRule';
export { defineRule } from './types/KeyboardRule';

// Engine
export { KeyboardEngine, createKeyboardEngine } from './engine/KeyboardEngine';

// Keymaps (recommended public API)
export {
  handleBackspace,
  handleEnter,
  handleTab,
  handleArrowLeft,
  handleArrowRight,
  handleArrowUp,
  handleArrowDown,
} from './keymaps';

// Rules (for advanced usage / testing)
export * from './rules/enter';
export * from './rules/backspace';
export * from './rules/tab';
export * from './rules/navigation';
