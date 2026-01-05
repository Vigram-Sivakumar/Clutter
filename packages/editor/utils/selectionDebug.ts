/**
 * Selection Debugging Utilities
 * 
 * Safe, read-only logging to compare browser DOM selection vs ProseMirror selection
 * Used to diagnose selection desync issues (e.g., "sticky halo" after delete)
 */

import { Editor } from '@tiptap/react';

/**
 * Log browser DOM selection (what the user sees)
 * 100% read-only, no side effects
 */
export function logDomSelection(label: string): void {
  const sel = window.getSelection();

  if (!sel) {
    console.log(`[SEL][DOM][${label}] no selection`);
    return;
  }

  if (sel.rangeCount === 0) {
    console.log(`[SEL][DOM][${label}] rangeCount = 0`);
    return;
  }

  const range = sel.getRangeAt(0);

  console.log(`[SEL][DOM][${label}]`, {
    isCollapsed: sel.isCollapsed,
    rangeCount: sel.rangeCount,
    startNode: range.startContainer.nodeName,
    startType: range.startContainer.nodeType === Node.TEXT_NODE ? 'TEXT' : 'ELEMENT',
    startOffset: range.startOffset,
    endNode: range.endContainer.nodeName,
    endType: range.endContainer.nodeType === Node.TEXT_NODE ? 'TEXT' : 'ELEMENT',
    endOffset: range.endOffset,
    text: range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.textContent?.substring(0, 50) 
      : null,
  });
}

/**
 * Log ProseMirror selection (what the editor thinks)
 * 100% read-only, no side effects
 */
export function logPmSelection(label: string, editor: Editor): void {
  const { state } = editor;
  const sel = state.selection;

  console.log(`[SEL][PM][${label}]`, {
    type: sel.constructor.name,
    from: sel.from,
    to: sel.to,
    empty: sel.empty,
    $fromParent: sel.$from.parent.type.name,
    $fromIsText: sel.$from.parent.isTextblock,
    $fromDepth: sel.$from.depth,
  });
}

/**
 * Log both DOM and PM selections side-by-side
 * Use this at critical moments to detect desync
 */
export function logSelectionPair(label: string, editor: Editor): void {
  logDomSelection(label);
  logPmSelection(label, editor);
}

