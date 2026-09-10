// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeLanguageLabelDecoration } from './fencedCodeLanguageLabelDecoration';

function mountView(doc: string, initialAnchor: number | null = null): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    selection: initialAnchor === null ? undefined : { anchor: initialAnchor },
    extensions: [markdownLanguageExtension(), fencedCodeLanguageLabelDecoration()],
  });
  return new EditorView({ state, parent });
}

const jsFence = ['```js', 'const hello = "world";', '```'].join('\n');

describe('fencedCodeLanguageLabelDecoration', () => {
  it('shows the friendly name at rest, not the raw info string', () => {
    const text = `${jsFence}\n\nOther`;
    const view = mountView(text, text.indexOf('Other'));

    expect(view.dom.textContent).toContain('JavaScript');
    expect(view.dom.textContent).not.toContain('js');
  });

  it('reverts to raw CodeInfo text once the block is engaged', () => {
    const view = mountView(jsFence);

    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });

    expect(view.dom.textContent).toContain('js');
    expect(view.dom.textContent).not.toContain('JavaScript');
  });

  it('re-collapses to the friendly name once the selection leaves the block', () => {
    const text = `${jsFence}\n\nOther`;
    const view = mountView(text);

    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });
    expect(view.dom.textContent).toContain('js');

    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.dom.textContent).toContain('JavaScript');
  });

  it('an unknown language falls back to showing the raw info string as typed', () => {
    const text = `\`\`\`not-a-real-lang\ncode\n\`\`\`\n\nOther`;
    const view = mountView(text, text.indexOf('Other'));

    expect(view.dom.textContent).toContain('not-a-real-lang');
  });

  it('a fence with no info string renders no label at all', () => {
    const text = '```\ncode\n```\n\nOther';
    const view = mountView(text, text.indexOf('Other'));

    const labels = view.dom.querySelectorAll('.cm-code-block-language');
    expect(labels).toHaveLength(0);
  });

  it('py resolves to the Python friendly name', () => {
    const text = ['```py', 'x = 1', '```', '', 'Other'].join('\n');
    const view = mountView(text, text.indexOf('Other'));

    expect(view.dom.textContent).toContain('Python');
  });
});
