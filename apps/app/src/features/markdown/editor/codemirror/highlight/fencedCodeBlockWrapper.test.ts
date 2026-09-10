// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeBlockWrapper } from './fencedCodeBlockWrapper';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [markdownLanguageExtension(), fencedCodeBlockWrapper()],
  });
  return new EditorView({ state, parent });
}

const jsFence = ['```js', 'const a = 1;', 'const b = 2;', '```'].join('\n');

describe('fencedCodeBlockWrapper', () => {
  it('wraps every line of a FencedCode block in a real .cm-code-block DOM parent', () => {
    const view = mountView(jsFence);

    const wrappers = view.dom.querySelectorAll('.cm-code-block');
    expect(wrappers).toHaveLength(1);

    const lines = wrappers[0]!.querySelectorAll(':scope > .cm-line');
    expect(lines).toHaveLength(4);
  });

  it('the wrapper element itself never carries a line-level visual class — grouping and visual card stay on separate elements', () => {
    const view = mountView(jsFence);

    const wrapper = view.dom.querySelector('.cm-code-block')!;
    expect(wrapper.classList.contains('cm-code-block-line')).toBe(false);
    expect(wrapper.tagName).toBe('DIV');
    // No inline style of any kind — this extension only ever provides a
    // class attribute via BlockWrapper, never touches style directly (the
    // actual background/border/padding all live in MarkdownEditor.css,
    // never inline, so there's nothing here for jsdom to assert against
    // beyond "we didn't set one ourselves").
    expect(wrapper.getAttribute('style')).toBeNull();
  });

  it('gives two back-to-back blocks (no blank line between them) two independent wrappers, not one merged run', () => {
    const doc = ['```js', 'one', '```', '```py', 'two', '```'].join('\n');
    const view = mountView(doc);

    const wrappers = view.dom.querySelectorAll('.cm-code-block');
    expect(wrappers).toHaveLength(2);
    // Each wrapper owns exactly its own 3 lines — not 6 lines merged into one.
    expect(wrappers[0]!.querySelectorAll(':scope > .cm-line')).toHaveLength(3);
    expect(wrappers[1]!.querySelectorAll(':scope > .cm-line')).toHaveLength(3);
  });

  it('three separate blocks with blank lines between them each get their own wrapper', () => {
    const doc = ['```', 'a', '```', '', 'plain text', '', '```', 'b', '```'].join('\n');
    const view = mountView(doc);

    expect(view.dom.querySelectorAll('.cm-code-block')).toHaveLength(2);
  });

  it('plain text outside any fenced block is never inside a .cm-code-block wrapper', () => {
    const doc = [jsFence, '', 'plain paragraph text'].join('\n');
    const view = mountView(doc);

    const wrapper = view.dom.querySelector('.cm-code-block')!;
    expect(wrapper.textContent).not.toContain('plain paragraph text');
  });

  it('an unclosed fence at document end still gets a wrapper, without throwing', () => {
    expect(() => mountView(['```js', 'const x = 1;'].join('\n'))).not.toThrow();
    const view = mountView(['```js', 'const x = 1;'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block')).toHaveLength(1);
  });

  it('an empty fenced block still gets a wrapper containing its fence lines', () => {
    const view = mountView(['```', '```'].join('\n'));
    const wrappers = view.dom.querySelectorAll('.cm-code-block');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]!.querySelectorAll(':scope > .cm-line')).toHaveLength(2);
  });

  it('tilde fences are wrapped the same way as backtick fences', () => {
    const view = mountView(['~~~py', 'print("hi")', '~~~'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block')).toHaveLength(1);
  });
});
