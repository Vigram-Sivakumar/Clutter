/**
 * Enter Keymap - Pure ProseMirror structural block creation
 *
 * Apple Notes Architecture:
 * - No intents, no resolver, no engine
 * - Direct ProseMirror transaction dispatch
 * - Enter creates blocks based on cursor position and hierarchy
 *
 * Phase 2 Implementation (Complete):
 * Execution Order (strict):
 * 1. Selection collapsed check
 * 2. CodeBlock delegation
 * 3. EMPTY BLOCK rules (collapse, outdent, normalize, exit)
 * 4. START → sibling above
 * 5. END → child or sibling
 * 6. MIDDLE → split
 */

import { Editor } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Create clean block attributes for new blocks
 * Whitelists only essential attributes, preventing attr leakage (e.g., collapsed)
 * 
 * @param node - Source node to copy attrs from
 * @param indent - Indent level for the new block
 * @returns Clean attrs object with only whitelisted properties
 */
function createCleanBlockAttrs(
  node: any,
  indent: number
): Record<string, any> {
  const attrs: Record<string, any> = {
    blockId: crypto.randomUUID(),
    indent,
  };

  // Whitelist: only copy if present on source node
  if (node.attrs.listType !== undefined) {
    attrs.listType = node.attrs.listType;
  }
  
  if (node.attrs.calloutType !== undefined) {
    attrs.calloutType = node.attrs.calloutType;
  }

  return attrs;
}

/**
 * Find the position after the entire subtree of a block
 * (including all children, visible or hidden)
 * 
 * @param state - ProseMirror state
 * @param blockPos - Position before the parent block
 * @param blockIndent - Indent level of the parent block
 * @returns Position after the last descendant
 */
function getSubtreeEndPosition(
  state: Editor['state'],
  blockPos: number,
  blockIndent: number
): number {
  const doc = state.doc;
  let pos = blockPos;

  const blockNode = doc.nodeAt(blockPos);
  if (!blockNode) return blockPos + 1;

  // Start after the parent block
  pos = blockPos + blockNode.nodeSize;

  // Walk forward through document using correct boundary
  while (pos < doc.nodeSize - 2) {
    const resolved = doc.resolve(pos);
    const nextNode = resolved.nodeAfter;
    if (!nextNode) break;

    const nextIndent = nextNode.attrs?.indent ?? 0;
    
    // Stop if next block is at same level or lower (not a child)
    if (nextIndent <= blockIndent) break;

    // This node is a child, skip over it
    pos += nextNode.nodeSize;
  }

  return pos;
}

/**
 * Insert a new sibling block above the current block
 * Depth-safe for first block in document
 */
function insertSiblingAbove(editor: Editor): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  const node = $from.parent;
  const tr = state.tr;

  // Use depth-safe position calculation
  const insertPos = $from.before($from.depth);

  tr.insert(
    insertPos,
    node.type.create(createCleanBlockAttrs(node, node.attrs.indent ?? 0))
  );

  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  view.dispatch(tr);
  return true;
}

/**
 * Insert a new sibling block below the current block
 * Inserts AFTER the entire subtree (including hidden children)
 */
function insertSiblingBelow(editor: Editor, indent: number): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  const node = $from.parent;
  const tr = state.tr;

  // Find position after the entire subtree
  const blockPos = $from.before();
  const insertPos = getSubtreeEndPosition(state, blockPos, indent);

  tr.insert(
    insertPos,
    node.type.create(createCleanBlockAttrs(node, indent))
  );

  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  view.dispatch(tr);
  return true;
}

/**
 * Insert a first child block (indent + 1)
 * Inserts immediately after parent, before any existing children
 */
function insertFirstChild(editor: Editor, parentIndent: number): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  const node = $from.parent;
  const tr = state.tr;

  // Explicit: insert after parent node, before subtree
  const insertPos = $from.before() + node.nodeSize;

  tr.insert(
    insertPos,
    node.type.create(createCleanBlockAttrs(node, parentIndent + 1))
  );

  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  view.dispatch(tr);
  return true;
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════

export function handleEnter(editor: Editor): boolean {
  const { state, view } = editor;
  const { selection } = state;

  // 1️⃣ Only handle collapsed cursor
  if (!selection.empty) return false;

  // 2️⃣ Let CodeBlock handle Enter
  if (editor.isActive('codeBlock')) return false;

  const { $from } = selection;
  const node = $from.parent;

  if (!node || !node.attrs) return false;

  const indent = node.attrs.indent ?? 0;
  const isEmpty = node.content.size === 0;
  const atStart = $from.parentOffset === 0;
  const atEnd = $from.parentOffset === node.content.size;

  const nodeType = node.type.name;
  const isContainer =
    node.type.name === 'listBlock' &&
    (node.attrs.listType === 'toggle' || node.attrs.listType === 'task');
  const isExpandedContainer = isContainer && node.attrs.collapsed === false;

  // 🔍 DEBUG: Log ALL Enter presses to see what's happening
  console.log('[ENTER DEBUG]', {
    nodeType,
    isEmpty,
    atStart,
    atEnd,
    parentOffset: $from.parentOffset,
    contentSize: node.content.size,
    textContent: node.textContent,
    indent,
  });

  // 🔍 CONTEXT LEAK CHECK: Does paragraph inherit container attrs?
  console.log('[ENTER CONTEXT CHECK]', {
    currentNodeType: node.type.name,
    listType: node.attrs?.listType,
    indent: node.attrs?.indent,
    isEmpty: node.content.size === 0,
    hasCollapsedAttr: 'collapsed' in node.attrs,
    collapsedValue: node.attrs?.collapsed,
    calloutType: node.attrs?.calloutType,
    allAttrs: Object.keys(node.attrs),
  });

  // Check if this block has children (next block has higher indent)
  const hasChildren = (() => {
    const nextPos = $from.after();
    const nextNode = state.doc.nodeAt(nextPos);
    return nextNode && (nextNode.attrs?.indent ?? 0) > indent;
  })();

  // ─────────────────────────────────────────────
  // EMPTY BLOCK CHECKS (must come BEFORE start/end)
  // ─────────────────────────────────────────────

  if (isEmpty) {
    // 3️⃣ EMPTY CONTAINER → COLLAPSE
    if (isExpandedContainer) {
      console.log('[UPDATE ATTRIBUTES DEBUG] COLLAPSE CONTAINER', {
        targetType: nodeType,
        currentAttrs: node.attrs,
        updateWith: { collapsed: true },
        isContainer,
        isExpandedContainer,
      });
      editor.commands.updateAttributes(nodeType, { collapsed: true });
      return true;
    }

    // 4️⃣ EMPTY BLOCK + INDENTED → OUTDENT (only)
    if (indent > 0) {
      const tr = state.tr;
      const cleanAttrs = createCleanBlockAttrs(node, indent - 1);

      console.log('[SET NODE MARKUP DEBUG] OUTDENT', {
        targetType: node.type.name,
        currentIndent: indent,
        nextIndent: indent - 1,
        attrsBefore: node.attrs,
        attrsAfter: cleanAttrs,
        hasCollapsedBefore: 'collapsed' in node.attrs,
        hasCollapsedAfter: 'collapsed' in cleanAttrs,
      });

      tr.setNodeMarkup(
        $from.before(),
        undefined,
        cleanAttrs
      );

      view.dispatch(tr);
      return true;
    }

    // 5️⃣ EMPTY CALLOUT / BLOCKQUOTE → EXIT CONTAINER
    if (nodeType === 'callout' || nodeType === 'blockquote') {
      const tr = state.tr;
      const pos = $from.before();

      // Use node.nodeSize for exact replacement range
      tr.replaceWith(
        pos,
        pos + node.nodeSize,
        state.schema.nodes.paragraph.create({
          blockId: crypto.randomUUID(),
          indent,
        })
      );

      tr.setSelection(TextSelection.create(tr.doc, pos + 1));
      view.dispatch(tr);
      return true;
    }

    // 6️⃣ EMPTY BLOCK AT ROOT (indent 0) → CONVERT TO PARAGRAPH
    // This runs AFTER outdent, so requires a separate Enter press
    if (indent === 0 && nodeType !== 'paragraph') {
      const tr = state.tr;
      const cleanAttrs = createCleanBlockAttrs(node, 0);

      console.log('[SET NODE MARKUP DEBUG] CONVERT TO PARAGRAPH', {
        targetType: node.type.name,
        convertingTo: 'paragraph',
        currentIndent: indent,
        attrsBefore: node.attrs,
        attrsAfter: cleanAttrs,
        hasCollapsedBefore: 'collapsed' in node.attrs,
        hasCollapsedAfter: 'collapsed' in cleanAttrs,
      });

      tr.setNodeMarkup(
        $from.before(),
        state.schema.nodes.paragraph,
        cleanAttrs
      );

      view.dispatch(tr);
      return true;
    }
  }

  // ─────────────────────────────────────────────
  // 7️⃣ TOGGLE MIDDLE → PARAGRAPH CHILD WITH TEXT MOVE
  // ─────────────────────────────────────────────
  const isListBlock = nodeType === 'listBlock';
  const isToggle = isListBlock && node.attrs.listType === 'toggle';
  const inMiddle = !atStart && !atEnd;

  // 🔍 DEBUG: Now this will actually trigger for toggles!
  if (isToggle) {
    console.log('[TOGGLE ENTER DEBUG]', {
      nodeType,
      listType: node.attrs.listType,
      parentOffset: $from.parentOffset,
      contentSize: node.content.size,
      textContent: node.textContent,
      atStart,
      atEnd,
      inMiddle,
      textOffset: $from.textOffset,
      '✅ Toggle detected': 'Fix applied!',
    });
  }

  if (isToggle && inMiddle) {
    const tr = state.tr;

    // Text after cursor
    const after = node.content.cut($from.parentOffset);

    // Remove text after cursor from toggle
    const from = $from.before() + 1 + $from.parentOffset;
    const to = $from.after() - 1;
    tr.delete(from, to);

    // Insert paragraph child
    const insertPos = $from.after();
    tr.insert(
      insertPos,
      state.schema.nodes.paragraph.create(
        {
          blockId: crypto.randomUUID(),
          indent: indent + 1,
        },
        after
      )
    );

    // Cursor into paragraph
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));

    view.dispatch(tr);
    return true;
  }

  // ─────────────────────────────────────────────
  // 8️⃣ START OF BLOCK → insert sibling ABOVE
  // ─────────────────────────────────────────────
  if (atStart) {
    return insertSiblingAbove(editor);
  }

  // ─────────────────────────────────────────────
  // 9️⃣ END OF BLOCK (non-empty or after empty checks)
  // ─────────────────────────────────────────────
  if (atEnd) {
    // EXPANDED TOGGLE → ALWAYS CREATE PARAGRAPH CHILD
    // Toggles always create paragraph children at END, even without existing children
    if (isToggle && isExpandedContainer) {
      const tr = state.tr;
      const insertPos = $from.before() + node.nodeSize;

      tr.insert(
        insertPos,
        state.schema.nodes.paragraph.create({
          blockId: crypto.randomUUID(),
          indent: indent + 1,
        })
      );

      tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
      view.dispatch(tr);
      return true;
    }

    // EXPANDED CONTAINER WITH CHILDREN → CREATE CHILD
    // Only create child if children already exist
    if (isExpandedContainer && hasChildren) {
      return insertFirstChild(editor, indent);
    }

    // DEFAULT → CREATE SIBLING BELOW
    // Applies to: collapsed containers, expanded containers without children, all other blocks
    return insertSiblingBelow(editor, indent);
  }

  // ─────────────────────────────────────────────
  // 1️⃣1️⃣ MIDDLE OF BLOCK → SPLIT (generic fallback)
  // ─────────────────────────────────────────────
  console.log('[UPDATE ATTRIBUTES DEBUG] SPLIT BLOCK', {
    targetType: node.type.name,
    currentAttrs: node.attrs,
    updateWith: { indent },
    atMiddle: !atStart && !atEnd,
  });
  
  editor
    .chain()
    .splitBlock()
    .updateAttributes(node.type.name, { indent })
    .run();

  return true;
}
