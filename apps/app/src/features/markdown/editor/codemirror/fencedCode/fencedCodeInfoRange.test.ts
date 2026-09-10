// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeBlockWrapper } from '../highlight/fencedCodeBlockWrapper';
import { fencedCodeCopyButtonDecoration } from '../highlight/fencedCodeCopyButtonDecoration';
import { fencedCodeActionsButtonDecoration } from '../highlight/fencedCodeActionsButtonDecoration';
import { resolveFencedCodeBlockWrapper, resolveFencedCodeInfoRange } from './fencedCodeInfoRange';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [
      markdownLanguageExtension(),
      fencedCodeBlockWrapper(),
      fencedCodeCopyButtonDecoration(),
      // getOnOpenFencedCodeMenu is never invoked by this test — only its
      // widget's DOM identity/teardown behavior across an edit matters
      // here, matching the real bug's mechanism (see below).
      fencedCodeActionsButtonDecoration(() => undefined),
    ],
  });
  return new EditorView({ state, parent });
}

function fencedCodeFrom(view: EditorView): number {
  let from = -1;
  syntaxTree(view.state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode' && from === -1) {
        from = node.from;
      }
    },
  });
  if (from === -1) {
    throw new Error('no FencedCode block found');
  }
  return from;
}

const jsFence = ['```js', 'const hello = "world";', '```'].join('\n');

describe('resolveFencedCodeInfoRange', () => {
  it('resolves the CodeInfo range and raw text for a fence with a language', () => {
    const view = mountView(jsFence);
    const info = resolveFencedCodeInfoRange(view.state, fencedCodeFrom(view));

    expect(info?.rawInfo).toBe('js');
    expect(view.state.sliceDoc(info!.from, info!.to)).toBe('js');
  });

  it('resolves a zero-width insertion point right after the opening fence marker when there is no info string', () => {
    const view = mountView(['```', 'plain', '```'].join('\n'));
    const info = resolveFencedCodeInfoRange(view.state, fencedCodeFrom(view));

    expect(info?.rawInfo).toBe('');
    expect(info?.from).toBe(info?.to);
  });
});

describe('resolveFencedCodeBlockWrapper — regression: Actions/Copy buttons reachable across a Change Language edit', () => {
  it('re-resolves the live wrapper by position after the info string changes length, even though the previously-observed Actions button element is torn down', () => {
    const view = mountView(jsFence);
    const from = fencedCodeFrom(view);

    const beforeWrapper = resolveFencedCodeBlockWrapper(view, from);
    const beforeActionsButton = beforeWrapper?.querySelector<HTMLElement>('.cm-code-block-actions');
    expect(beforeActionsButton).not.toBeNull();
    expect(beforeActionsButton!.isConnected).toBe(true);

    // Exactly what "Change Language" does: rewrite only the CodeInfo text,
    // to a different length ('js' -> 'typescript'). This moves CodeInfo.to
    // and, with it, the enclosing FencedCode node's own `.to` — and
    // `FencedCodeActionsButtonWidget.eq()` compares `fencedCodeTo`, so this
    // is exactly the edit that makes CM6 treat the widget as changed and
    // rebuild its DOM rather than reuse/reposition it (unlike the Copy
    // button, whose `eq()` compares only `fencedCodeFrom` and so survives
    // this same edit by being repositioned in place, not rebuilt).
    const info = resolveFencedCodeInfoRange(view.state, from)!;
    view.dispatch({ changes: { from: info.from, to: info.to, insert: 'typescript' } });

    // The button element captured before the edit is exactly the stale
    // anchor the real bug relied on (MarkdownEditor.tsx's `fencedCodeMenu
    // .anchor.current`): CM6 tore it down and built a new one at the new
    // position rather than migrating it in place.
    expect(beforeActionsButton!.isConnected).toBe(false);

    // Re-resolving fresh from the stable FencedCode.from — never trusting
    // the earlier captured element — must still find the live wrapper and
    // its live Actions/Copy buttons.
    const afterWrapper = resolveFencedCodeBlockWrapper(view, from);
    const afterActionsButton = afterWrapper?.querySelector<HTMLElement>('.cm-code-block-actions');
    const afterCopyButton = afterWrapper?.querySelector<HTMLElement>('.cm-code-block-copy');
    expect(afterWrapper).not.toBeNull();
    expect(afterActionsButton).not.toBeNull();
    expect(afterActionsButton!.isConnected).toBe(true);
    expect(afterActionsButton).not.toBe(beforeActionsButton);
    expect(afterCopyButton?.isConnected).toBe(true);
  });

  it('returns null when the given position no longer starts a FencedCode block', () => {
    const view = mountView(jsFence);
    expect(resolveFencedCodeBlockWrapper(view, 9999)).toBeNull();
  });
});
