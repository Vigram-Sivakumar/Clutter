/**
 * getEngine - Centralized accessor for EditorEngine
 *
 * 🔒 CRITICAL: Single choke point for engine access
 *
 * WHY THIS EXISTS:
 * - Prevents silent engine forks from stale references
 * - Provides single point for debugging/breakpoints
 * - Enforces canonical editor usage
 * - Makes engine access auditable
 *
 * USAGE:
 * ```ts
 * const engine = getEngine(editor);
 * if (!engine) return; // Always guard
 *
 * // Use engine...
 * ```
 *
 * DO NOT:
 * - Access `editor._engine` directly
 * - Cache engine references across async boundaries
 * - Assume engine exists without checking
 */

import type { Editor } from '@tiptap/core';
import type { EditorEngine } from './EditorEngine';

/**
 * Get EditorEngine from canonical TipTap editor instance
 *
 * @param editor - TipTap editor instance (or null)
 * @returns EditorEngine if attached, null otherwise
 *
 * 🔒 ALWAYS reads from window.__editor to avoid stale references
 */
export function getEngine(_editor: Editor | null): EditorEngine | null {
  const canonicalEditor = (window as any).__editor;
  return canonicalEditor?._engine ?? null;
}

/**
 * Get FlatIntentResolver from canonical TipTap editor instance
 *
 * @param _editor - TipTap editor instance (or null, unused - always reads from window.__editor)
 * @returns FlatIntentResolver if attached, null otherwise
 *
 * 🔒 ALWAYS reads from window.__editor to avoid stale references
 */
export function getResolver(_editor: Editor | null): any | null {
  const canonicalEditor = (window as any).__editor;
  return canonicalEditor?._resolver ?? null;
}
