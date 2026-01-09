/**
 * Tab Keymap - Structural indentation control
 *
 * Tab changes structure, never content.
 *
 * Canonical Decision Tables:
 * - Tab → indent-block intent
 * - Shift+Tab → outdent-block intent
 *
 * All logic lives in rules and resolver.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import type { IntentResolver } from '../../../core/engine';
import { indentBlock, outdentBlock } from '../rules/tab';

const tabRules = [indentBlock, outdentBlock];

const tabEngine = createKeyboardEngine(tabRules);

export function handleTab(editor: Editor): boolean {
  // Get resolver from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;

  if (resolver) {
    tabEngine.setResolver(resolver);
  }

  const handled = tabEngine.handle(editor, 'Tab');
  return handled;
}
