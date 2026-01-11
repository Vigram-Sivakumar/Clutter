/**
 * Shared block replacement utility
 * Used by both Markdown Shortcuts and Slash Commands
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode, Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Replace a block with a new block in a single atomic transaction
 * Handles content preservation and cursor positioning
 *
 * @param view - ProseMirror editor view
 * @param blockStart - Start position of block to replace
 * @param blockEnd - End position of block to replace
 * @param replacement - New node(s) to insert (single node or array)
 * @param options - Optional configuration
 */
export function replaceBlock(
  view: EditorView,
  blockStart: number,
  blockEnd: number,
  replacement: PMNode | PMNode[],
  options?: {
    /** Cursor offset from start of new block content (default: 0) */
    cursorOffset?: number;
  }
): void {
  const { state } = view;
  const tr = state.tr;

  // Replace the block
  tr.replaceWith(blockStart, blockEnd, replacement);

  // Position cursor inside the new block
  const cursorOffset = options?.cursorOffset ?? 0;
  let newCursorPos: number;

  if (Array.isArray(replacement)) {
    // For arrays (like HR + paragraph), cursor goes into the second element (paragraph)
    const firstNodeSize = replacement[0]?.nodeSize || 0;
    newCursorPos = blockStart + firstNodeSize + 1 + cursorOffset;
  } else {
    // For single nodes, use TextSelection.near to find valid position
    // This handles both wrapper blocks (listBlock, blockquote) and standalone (heading)
    const $pos = tr.doc.resolve(blockStart + 1);
    const nearPos = TextSelection.near($pos);
    newCursorPos = nearPos.from + cursorOffset;
  }

  tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

  view.dispatch(tr);
}

/**
 * Helper attributes that should be preserved when converting blocks
 * 
 * 🔒 BLOCK IDENTITY LAW (Phase 2):
 * When a node type changes (paragraph → heading, paragraph → HR, etc.),
 * blockId MUST be regenerated. NEVER preserve blockId across type changes.
 * 
 * Only preserve structural attributes (indent, level, parent relationships).
 */
export interface PreservedAttrs {
  blockId?: string; // ⚠️ DEPRECATED - Do not preserve across type changes
  parentBlockId?: string | null;
  parentToggleId?: string | null;
  level?: number;
  indentLevel?: number;
}

/**
 * Helper to create block nodes with optional content preservation
 */
export interface BlockCreator {
  /** Create heading with given level */
  // eslint-disable-next-line no-unused-vars
  heading: (
    schema: any,
    level: 1 | 2 | 3,
    content?: Fragment,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create list block with given type */
  // eslint-disable-next-line no-unused-vars
  listBlock: (
    schema: any,
    listType: 'bullet' | 'numbered' | 'task',
    content?: Fragment,
    checked?: boolean,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create blockquote */
  // eslint-disable-next-line no-unused-vars
  blockquote: (
    schema: any,
    content?: Fragment,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create callout */
  // eslint-disable-next-line no-unused-vars
  callout: (
    schema: any,
    type: 'info' | 'warning' | 'error' | 'success',
    content?: Fragment,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create code block */
  // eslint-disable-next-line no-unused-vars
  codeBlock: (
    schema: any,
    content?: string,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create toggle header (standalone, flat structure) */
  // eslint-disable-next-line no-unused-vars
  toggleBlock: (
    schema: any,
    content?: Fragment,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create paragraph */
  // eslint-disable-next-line no-unused-vars
  paragraph: (
    schema: any,
    content?: Fragment,
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
  /** Create horizontal rule */
  // eslint-disable-next-line no-unused-vars
  horizontalRule: (
    schema: any,
    style: 'plain' | 'wavy',
    preservedAttrs?: PreservedAttrs
  ) => PMNode;
}

export const createBlock: BlockCreator = {
  heading: (schema, level, content, preservedAttrs) => {
    return schema.nodes.heading.create(
      {
        blockId: preservedAttrs?.blockId || crypto.randomUUID(),
        parentBlockId: preservedAttrs?.parentBlockId || null,
        headingLevel: level,
        level: preservedAttrs?.level || 0,
        parentToggleId: preservedAttrs?.parentToggleId || null,
      },
      content
    );
  },

  listBlock: (schema, listType, content, checked = false, preservedAttrs) => {
    // ListBlock now holds inline content directly (no paragraph wrapper)
    const attrs = {
      blockId: preservedAttrs?.blockId || crypto.randomUUID(),
      parentBlockId: preservedAttrs?.parentBlockId || null,
      listType,
      level: preservedAttrs?.level || 0,
      checked: listType === 'task' ? checked : null,
      parentToggleId: preservedAttrs?.parentToggleId || null,
    };

    console.log('🟢 createBlock.listBlock: Creating with attrs =', attrs);
    console.log('🟢 createBlock.listBlock: preservedAttrs =', preservedAttrs);

    return schema.nodes.listBlock.create(attrs, content);
  },

  blockquote: (schema, content, preservedAttrs) => {
    // Blockquote now holds inline content directly (no paragraph wrapper)
    return schema.nodes.blockquote.create(
      {
        blockId: preservedAttrs?.blockId || crypto.randomUUID(),
        parentBlockId: preservedAttrs?.parentBlockId || null,
        parentToggleId: preservedAttrs?.parentToggleId || null,
        level: preservedAttrs?.level || 0,
      },
      content
    );
  },

  callout: (schema, type, content, preservedAttrs) => {
    // Callout now holds inline content directly (no paragraph wrapper)
    return schema.nodes.callout.create(
      {
        blockId: preservedAttrs?.blockId || crypto.randomUUID(),
        parentBlockId: preservedAttrs?.parentBlockId || null,
        type,
        parentToggleId: preservedAttrs?.parentToggleId || null,
        level: preservedAttrs?.level || 0,
      },
      content
    );
  },

  codeBlock: (schema, content, preservedAttrs) => {
    const textNode = content ? schema.text(content) : null;
    return textNode
      ? schema.nodes.codeBlock.create(
          {
            blockId: preservedAttrs?.blockId || crypto.randomUUID(),
            parentBlockId: preservedAttrs?.parentBlockId || null,
            parentToggleId: preservedAttrs?.parentToggleId || null,
            level: preservedAttrs?.level || 0,
          },
          textNode
        )
      : schema.nodes.codeBlock.create({
          blockId: preservedAttrs?.blockId || crypto.randomUUID(),
          parentBlockId: preservedAttrs?.parentBlockId || null,
          parentToggleId: preservedAttrs?.parentToggleId || null,
          level: preservedAttrs?.level || 0,
        });
  },

  toggleBlock: (schema, content, preservedAttrs) => {
    // Create standalone toggleHeader node (flat structure like listBlock)
    // Children blocks will reference this toggle via parentToggleId
    // Note: toggleHeader itself shouldn't have parentToggleId (it's a parent, not a child)
    // Default: collapsed (expands when user presses Enter on the header)
    return schema.nodes.toggleHeader.create(
      {
        blockId: preservedAttrs?.blockId || crypto.randomUUID(),
        parentBlockId: preservedAttrs?.parentBlockId || null,
        collapsed: true,
        level: preservedAttrs?.level || 0,
        toggleId: crypto.randomUUID(),
        parentToggleId: preservedAttrs?.parentToggleId || null,
      },
      content
    );
  },

  paragraph: (schema, content, preservedAttrs) => {
    return schema.nodes.paragraph.create(
      {
        blockId: preservedAttrs?.blockId || crypto.randomUUID(),
        parentBlockId: preservedAttrs?.parentBlockId || null,
        parentToggleId: preservedAttrs?.parentToggleId || null,
        level: preservedAttrs?.level || 0,
      },
      content
    );
  },

  horizontalRule: (schema, style, preservedAttrs) => {
    // 🔒 BLOCK IDENTITY LAW: Node type change = new identity
    // NEVER preserve blockId when transforming paragraph → horizontalRule
    return schema.nodes.horizontalRule.create({
      blockId: crypto.randomUUID(), // ✅ Always generate new ID
      indent: preservedAttrs?.indent || 0, // 🔥 FLAT MODEL: Preserve indent
      style,
    });
  },
};
