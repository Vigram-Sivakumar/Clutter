/**
 * Text Node - Inline text content
 * 
 * The basic text node that holds actual text content.
 * Marks (bold, italic, etc.) are applied to text nodes.
 */

import { Node } from '@tiptap/core';

export const Text = Node.create({
  name: 'text',

  // Inline node (not a block)
  group: 'inline',

  // This is an inline node, not a block
  inline: true,
});
