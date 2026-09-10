import type { EditorState } from '@codemirror/state';
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common';

import {
  findAtRestTokenAt,
  findTokenAt,
  type TokenNodeRange,
} from '../semanticToken/tokenEngagement';

export type TaskMarkerNodeRange = TokenNodeRange;

/** The one Task-specific fact the generic semantic-token mechanisms need: which Lezer node names count as a task checkbox marker. */
export const isTaskMarkerNode = (nodeName: string): boolean => nodeName === 'TaskMarker';

export function findTaskMarkerAt(state: EditorState, pos: number): TaskMarkerNodeRange | null {
  return findTokenAt(state, pos, isTaskMarkerNode);
}

/** Same as {@link findTaskMarkerAt}, but only returns a node that is currently at rest (not engaged). */
export function findAtRestTaskMarkerAt(
  state: EditorState,
  pos: number
): TaskMarkerNodeRange | null {
  return findAtRestTokenAt(state, pos, isTaskMarkerNode);
}

/**
 * `TaskMarker` is always exactly 3 characters — `[`, one state character,
 * `]` — confirmed directly against the installed `@lezer/markdown@1.7.2`'s
 * `TaskList` extension. Read leniently (`x` or `X`, matching
 * `TaskExtractor.ts`'s own `TASK_LINE_PATTERN`), so an existing `[X]` in a
 * vault is recognized as checked without ever being rewritten just because
 * it was read (docs/editor-architecture-decisions.md's "lenient reader,
 * strict writer").
 */
export function isTaskMarkerChecked(raw: string): boolean {
  return raw[1]?.toLowerCase() === 'x';
}

/**
 * The `TaskMarker` child of a `ListItem`, if it has one — `ListItem`'s
 * `firstChild` is `ListMark`, and a task item's `ListMark.nextSibling` is
 * a `Task` node whose own `firstChild` is `TaskMarker` (confirmed against
 * the installed `@lezer/markdown@1.7.2` grammar, which registers
 * `TaskList` in `markdownGrammarExtensions.ts`: `ListItem[ListMark,
 * Task[TaskMarker, ...raw content...]]`, identical shape for bullet and
 * ordered markers alike). Returns `null` for every other `ListItem` shape
 * (plain paragraph content, or a malformed `[ ]`/`[x]` the parser never
 * recognized as `TaskMarker` at all).
 *
 * Moved here (2026-08-31, task visual-rendering slice) from its original
 * home in `enter/markdownEnterKeymap.ts` — this file is the designated
 * shared owner of "which node is a task's checkbox" facts
 * (`isTaskMarkerNode`/`findTaskMarkerAt`/`isTaskMarkerChecked` already
 * live here), and the new checkbox-decoration ViewPlugin needs the exact
 * same structural walk the Enter/Backspace commands already established,
 * not a second, independently-maintained copy of it — both call sites
 * import this one definition, logic unchanged.
 */
export function taskMarkerOfListItem(listItem: SyntaxNode): SyntaxNode | null {
  const marker = listItem.firstChild;
  if (!marker || marker.name !== 'ListMark') {
    return null;
  }
  const taskNode = marker.nextSibling;
  if (!taskNode || taskNode.name !== 'Task') {
    return null;
  }
  const taskMarker = taskNode.firstChild;
  return taskMarker && isTaskMarkerNode(taskMarker.name) ? taskMarker : null;
}

/**
 * The CSS class a completed task's rendered inline content composes onto
 * itself — the `cm-*` (editor/task state), not `tok-*` (Markdown syntax
 * identity), naming convention, matching `cm-task-checkbox`. One shared
 * constant so `taskCompletedContentDecoration.ts` (which paints it) and
 * every widget-family renderer that composes it directly (see
 * `isNodeOnCompletedTask` below) never risk drifting to two different
 * literal strings.
 */
export const TASK_COMPLETED_CLASS = 'cm-task-completed';

/**
 * Whether `node` sits inside a *checked* task's rendered content —
 * derived entirely from the syntax tree and document text, never from
 * rendered DOM state. This is possible because of a source fact worth
 * being explicit about: `@lezer/markdown`'s own `TaskList` extension
 * parses a task's entire remaining line content as `Task`'s own inline
 * children (`Task[TaskMarker, ...cx.parser.parseInline(...)]`, confirmed
 * directly against the installed `@lezer/markdown` source) — so a
 * WikiLink/Tag/Date/Strikethrough/etc. sitting on a task line is a real
 * syntax-tree *descendant* of that line's `Task` node, not merely
 * co-located with it on the same rendered line. Task-completion is
 * therefore exactly as tree-derivable as the inline-formatting ancestry
 * `collectActiveInlineClasses` (`inlineLivePreviewParticipants.ts`) already
 * walks — it just needs one more thing besides the tree: the `TaskMarker`
 * child's own raw text (`state.sliceDoc`), to distinguish `[x]` from `[ ]`,
 * which is why this function takes `state` and `collectActiveInlineClasses`
 * deliberately doesn't (see that function's own doc comment on staying
 * tree-only) — composed at each call site, never merged into one function,
 * since they are independent state sources per
 * docs/editor-architecture-decisions.md's "Inline formatting composition
 * at the token level".
 *
 * Walks every ancestor (not stopping at the first non-`Task` one, unlike
 * `collectActiveInlineClasses`'s `isDelimitedMarkConstruct` walk) because
 * a task's inline content can sit arbitrarily deep under ordinary
 * delimited-mark constructs (`- [x] ~~**[[Note]]**~~`) before reaching
 * `Task` itself — the walk simply keeps going until it finds `Task` or
 * runs out of ancestors (not on any task line at all).
 */
export function isNodeOnCompletedTask(node: SyntaxNodeRef, state: EditorState): boolean {
  let ancestor: SyntaxNode | null = node.node.parent;
  while (ancestor) {
    if (ancestor.name === 'Task') {
      const marker = ancestor.firstChild;
      if (!marker || !isTaskMarkerNode(marker.name)) {
        return false;
      }
      return isTaskMarkerChecked(state.sliceDoc(marker.from, marker.to));
    }
    ancestor = ancestor.parent;
  }
  return false;
}
