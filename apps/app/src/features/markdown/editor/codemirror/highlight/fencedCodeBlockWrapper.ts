import { syntaxTree } from '@codemirror/language';
import type { Extension, Range } from '@codemirror/state';
import { BlockWrapper, EditorView } from '@codemirror/view';

/**
 * Per-block visual container for fenced code — background, border, rounded
 * corners, and external margin — built on `EditorView.blockWrappers`, CM6's
 * native mechanism (confirmed against the installed `@codemirror/view@6.43.9`
 * source and its own changelog, introduced 6.39.0, nesting-rank support
 * added 6.43.0) for wrapping a range of real, editable lines in a genuine
 * DOM parent that CM6 itself creates and manages.
 *
 * **Supersedes `fencedCodeBlockLineDecoration.ts`'s `Decoration.line`
 * approach entirely — not a refinement of it.** That version applied
 * `cm-code-block-line`/`--first`/`--last` classes, background, border, and
 * (briefly) `margin` directly to `.cm-line` elements. `margin` on `.cm-line`
 * was confirmed to corrupt CM6's own vertical line-geometry bookkeeping
 * (`offsetHeight`-style measurement excludes margin, so CM6's internal
 * position↔pixel mapping and the actual rendered layout silently
 * disagreed), breaking cross-line keyboard/mouse selection — see
 * `docs/editor-architecture-decisions.md`'s investigation entries. The
 * corrected architectural rule this file follows: `.cm-line` is
 * CodeMirror-owned layout/selection infrastructure and must never carry
 * `margin`, custom container geometry, or fenced-code-specific classes at
 * all — not even background/border, now that a real alternative exists.
 * `EditorView.blockWrappers` is that alternative: for a `FencedCode`
 * node's own `[from, to)` range, it makes CM6 render every `.cm-line` (and
 * block widget) that starts inside that range as the actual DOM children
 * of a real wrapper element — `.cm-code-block` — that CM6 itself builds,
 * during the exact same tile-building pass that builds `.cm-line`s. The
 * lines inside are completely untouched: no class, no attribute, no
 * layout-affecting CSS of any kind added to them by this file. `.cm-code-block`
 * is a genuine, separate DOM node, so it can safely carry `margin` (for the
 * external gap between adjacent cards), `background`, `border`,
 * `border-radius`, and `box-shadow` — the same freedom `.cm-invalid-embed`'s
 * own container already has — without touching anything CM6 measures for
 * cursor/selection geometry.
 *
 * **No `ViewPlugin` needed.** `EditorView.blockWrappers`'s facet input type
 * accepts either a `RangeSet<BlockWrapper>` or a `(view: EditorView) =>
 * RangeSet<BlockWrapper>` function (confirmed directly against the
 * installed source: `DocView.updateDeco()` calls `state.facet(blockWrappers)
 * .map(v => typeof v == "function" ? v(this.view) : v)`, and this runs from
 * both `DocView`'s constructor *and* its `update()` method — i.e. on every
 * relevant view update, not just once). Providing the function form
 * directly via `EditorView.blockWrappers.of(...)` is therefore sufficient
 * on its own; CM6 re-invokes it exactly when it needs the current wrapper
 * set, the same recomputation guarantee a `ViewPlugin`'s own `update()`
 * would otherwise have to reimplement by hand.
 *
 * Two independent, back-to-back `FencedCode` blocks (no blank line between
 * them — legal CommonMark) each contribute their own `BlockWrapper.range(from, to)`
 * from their own node's boundaries, so they render as two structurally
 * separate `.cm-code-block` elements with no adjacency logic of any kind —
 * unlike the superseded `Decoration.line` version, which needed a whole
 * `--first`/`--last` mechanism specifically to avoid two adjacent same-class
 * lines reading as one merged run. That entire class of bug does not exist
 * here: a `BlockWrapper` range's own boundaries, not a neighboring line's
 * class, are what CM6 uses to decide where one wrapper ends and the next
 * begins.
 */
const FENCED_CODE_BLOCK_WRAPPER = BlockWrapper.create({
  tagName: 'div',
  attributes: { class: 'cm-code-block' },
});

function buildFencedCodeBlockWrappers(view: EditorView): Range<BlockWrapper>[] {
  const ranges: Range<BlockWrapper>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'FencedCode') {
          return;
        }
        ranges.push(FENCED_CODE_BLOCK_WRAPPER.range(node.from, node.to));
      },
    });
  }

  return ranges;
}

export function fencedCodeBlockWrapper(): Extension {
  return EditorView.blockWrappers.of((view) =>
    BlockWrapper.set(buildFencedCodeBlockWrappers(view), true)
  );
}
