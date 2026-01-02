/**
 * BackspaceHandler Plugin - Additional backspace handling
 * 
 * Note: Most backspace behavior is handled automatically by TipTap via
 * the `defining: true` property on nodes, or by individual node extensions.
 * 
 * This plugin only handles edge cases not covered elsewhere.
 */

import { Extension } from '@tiptap/core';

export const BackspaceHandler = Extension.create({
  name: 'backspaceHandler',

  // Currently empty - all backspace logic is handled by:
  // - ListBlock.ts (for list items)
  // - defining: true on Blockquote, CodeBlock, Heading
  // - Default TipTap behavior for paragraphs
});
