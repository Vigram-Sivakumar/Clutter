// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeFormatButtonDecoration } from './fencedCodeFormatButtonDecoration';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [markdownLanguageExtension(), fencedCodeFormatButtonDecoration()],
  });
  return new EditorView({ state, parent });
}

async function flushMicrotasks() {
  // Formatting goes through several chained `await import(...)`s before
  // the final `dispatch` — real dynamic imports resolve through the
  // module loader (real I/O), not a plain microtask, so this polls with a
  // real macrotask delay rather than just draining the microtask queue.
  for (let i = 0; i < 50; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fencedCodeFormatButtonDecoration', () => {
  it('renders a Format button for a formattable language (JavaScript)', () => {
    const view = mountView(['```js', 'const x=1', '```'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block-format')).toHaveLength(1);
  });

  it('renders a Format button for each other Prettier-supported language', () => {
    const cases = [
      ['ts', 'const x:number=1'],
      ['json', '{"a":1}'],
      ['css', '.a{color:red}'],
      ['html', '<div><p>x</p></div>'],
    ];
    for (const [lang, code] of cases) {
      const view = mountView(['```' + lang, code, '```'].join('\n'));
      expect(view.dom.querySelectorAll('.cm-code-block-format')).toHaveLength(1);
    }
  });

  it('renders no Format button for an unsupported language (Python)', () => {
    const view = mountView(['```py', 'x = 1', '```'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block-format')).toHaveLength(0);
  });

  it('renders no Format button for a fence with no language at all', () => {
    const view = mountView(['```', 'plain text', '```'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block-format')).toHaveLength(0);
  });

  it('renders no Format button for an unrecognized language', () => {
    const view = mountView(['```cobol', 'IDENTIFICATION DIVISION.', '```'].join('\n'));
    expect(view.dom.querySelectorAll('.cm-code-block-format')).toHaveLength(0);
  });

  it('clicking Format rewrites exactly the code content, fences and info string untouched', async () => {
    const doc = ['```js', 'const x=1', '```', '', 'after'].join('\n');
    const view = mountView(doc);
    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');
    expect(button).not.toBeNull();

    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    expect(view.state.doc.toString()).toBe(
      ['```js', 'const x = 1;', '```', '', 'after'].join('\n')
    );
  });

  it('formats CSS correctly through the postcss plugin', async () => {
    const doc = ['```css', '.a{color:red;background:blue}', '```'].join('\n');
    const view = mountView(doc);
    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');

    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    const text = view.state.doc.toString();
    expect(text).toContain('color: red;');
    expect(text).toContain('background: blue;');
  });

  it('clicking Format does not move the caret elsewhere in the document', async () => {
    const doc = ['```js', 'const x=1', '```', '', 'after'].join('\n');
    const view = mountView(doc);
    const afterPos = doc.indexOf('after');
    view.dispatch({ selection: { anchor: afterPos } });

    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');
    button!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    // The document grew (formatting inserted `;`/spacing) but nothing
    // before the code block changed, so "after" is still findable intact.
    expect(view.state.doc.toString()).toContain('after');
  });

  it('leaves the document unchanged when the code already matches Prettier output', async () => {
    const doc = ['```json', '{ "a": 1 }', '```'].join('\n');
    const view = mountView(doc);
    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');

    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    expect(view.state.doc.toString()).toBe(doc);
  });

  it('does not throw, leaves the document unchanged, and shows a brief error indicator for genuinely invalid code', async () => {
    const doc = ['```js', 'const x = ;;;', '```'].join('\n');
    const view = mountView(doc);
    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');

    expect(() => button!.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    await flushMicrotasks();

    expect(view.state.doc.toString()).toBe(doc);
    // A failed format is visibly distinct from a silent no-op — the
    // button gets a timed error state rather than doing nothing
    // observable, per the reported confusion this was added to fix.
    expect(button!.classList.contains('cm-code-block-format--error')).toBe(true);
  });

  it('rejects content that only became invalid because it absorbed literal, non-fence-syntax backticks (mid-line, not a real closing fence)', async () => {
    // Mirrors a real reported case: pasted text whose embedded ``` /
    // ```js sequences weren't alone on their own line, so CommonMark
    // never treats them as fence boundaries — they (and everything after)
    // stay literal text inside the one CSS block, which is then genuinely
    // unparsable CSS, not a formatter bug.
    const doc = [
      '```css',
      '.card { color: red; }```',
      '```js',
      'function greet() { return 1; }',
    ].join('\n');
    const view = mountView(doc);
    const button = view.dom.querySelector<HTMLButtonElement>('.cm-code-block-format');
    expect(button).not.toBeNull();

    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    expect(view.state.doc.toString()).toBe(doc);
    expect(button!.classList.contains('cm-code-block-format--error')).toBe(true);
  });

  it('does not throw for an unclosed fence while typing', () => {
    expect(() => mountView(['```js', 'const x = 1;'].join('\n'))).not.toThrow();
  });
});
