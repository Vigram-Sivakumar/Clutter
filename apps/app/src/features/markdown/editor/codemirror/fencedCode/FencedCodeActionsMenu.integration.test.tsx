// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownEditor } from '../../MarkdownEditor';

// jsdom has no real ResizeObserver — needed by Overlay's own positioning
// hook, same stub `NoteEmbedMoreActions.integration.test.tsx` already
// establishes for exactly this gap.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
});

afterEach(() => {
  cleanup();
});

function openFencedCodeMenu() {
  const button = document.querySelector<HTMLButtonElement>('.cm-code-block-actions')!;
  fireEvent.mouseDown(button);
  fireEvent.click(button);
}

function openChangeLanguageSubmenu() {
  openFencedCodeMenu();
  fireEvent.click(screen.getByText('Change Language'));
}

function menuItemFor(label: string): HTMLElement {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (el) => el.textContent === label
  )!;
}

describe('Fenced code "More actions" — Change Language', () => {
  it('lists every registered language, including JSX and TSX as their own selectable entries', () => {
    render(<MarkdownEditor pageId="test-page" markdown={['```js', 'const x = 1;', '```'].join('\n')} />);
    openChangeLanguageSubmenu();

    const labels = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(
      expect.arrayContaining(['JavaScript', 'JSX', 'TypeScript', 'TSX', 'JSON', 'CSS', 'HTML', 'Python'])
    );
  });

  it('also lists the first expansion batch (YAML, XML, SQL, Shell, C, C++, Java, Go, Rust) — menu listing needs no loaded parser', () => {
    // The submenu is built purely from registry metadata
    // (`fencedCodeLanguageDescriptions.map(...)`) — it must list every
    // lazy entry exactly like the eager ones, without triggering or
    // waiting on `.load()` for any of them.
    render(<MarkdownEditor pageId="test-page" markdown={['```js', 'const x = 1;', '```'].join('\n')} />);
    openChangeLanguageSubmenu();

    const labels = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(
      expect.arrayContaining(['YAML', 'XML', 'SQL', 'Shell', 'C', 'C++', 'Java', 'Go', 'Rust'])
    );
  });

  it('a `rust` fence shows Rust as the checked entry, and selecting Go rewrites the fence to `go`', () => {
    const onEdit = vi.fn();
    render(
      <MarkdownEditor
        pageId="test-page"
        markdown={['```rust', 'fn main() {}', '```'].join('\n')}
        onEdit={onEdit}
      />
    );
    openChangeLanguageSubmenu();

    expect(menuItemFor('Rust').classList.contains('entry-selected')).toBe(true);

    fireEvent.click(menuItemFor('Go'));

    expect(onEdit).toHaveBeenCalledWith(['```go', 'fn main() {}', '```'].join('\n'));
  });

  it('a fence manually written as `jsx` shows JSX (not JavaScript) as the checked entry', () => {
    render(<MarkdownEditor pageId="test-page" markdown={['```jsx', 'const x = <div />;', '```'].join('\n')} />);
    openChangeLanguageSubmenu();

    expect(menuItemFor('JSX').classList.contains('entry-selected')).toBe(true);
    expect(menuItemFor('JavaScript').classList.contains('entry-selected')).toBe(false);
  });

  it('a fence manually written as `tsx` shows TSX (not TypeScript) as the checked entry', () => {
    render(<MarkdownEditor pageId="test-page" markdown={['```tsx', 'const x = <div />;', '```'].join('\n')} />);
    openChangeLanguageSubmenu();

    expect(menuItemFor('TSX').classList.contains('entry-selected')).toBe(true);
    expect(menuItemFor('TypeScript').classList.contains('entry-selected')).toBe(false);
  });

  it('re-selecting the already-checked JSX entry keeps the fence as `jsx` — no silent rewrite to `javascript`', () => {
    const onEdit = vi.fn();
    render(
      <MarkdownEditor
        pageId="test-page"
        markdown={['```jsx', 'const x = <div />;', '```'].join('\n')}
        onEdit={onEdit}
      />
    );
    openChangeLanguageSubmenu();

    fireEvent.click(menuItemFor('JSX'));

    expect(onEdit).toHaveBeenCalledWith(['```jsx', 'const x = <div />;', '```'].join('\n'));
  });

  it('selecting JSX from a plain `js` block rewrites the fence to `jsx`', () => {
    const onEdit = vi.fn();
    render(
      <MarkdownEditor
        pageId="test-page"
        markdown={['```js', 'const x = 1;', '```'].join('\n')}
        onEdit={onEdit}
      />
    );
    openChangeLanguageSubmenu();

    fireEvent.click(menuItemFor('JSX'));

    expect(onEdit).toHaveBeenCalledWith(['```jsx', 'const x = 1;', '```'].join('\n'));
  });

  it('selecting TSX from a plain `ts` block rewrites the fence to `tsx`', () => {
    const onEdit = vi.fn();
    render(
      <MarkdownEditor
        pageId="test-page"
        markdown={['```ts', 'const x: number = 1;', '```'].join('\n')}
        onEdit={onEdit}
      />
    );
    openChangeLanguageSubmenu();

    fireEvent.click(menuItemFor('TSX'));

    expect(onEdit).toHaveBeenCalledWith(['```tsx', 'const x: number = 1;', '```'].join('\n'));
  });

  it('selecting JavaScript from a `jsx` block rewrites the fence to plain `javascript`', () => {
    const onEdit = vi.fn();
    render(
      <MarkdownEditor
        pageId="test-page"
        markdown={['```jsx', 'const x = <div />;', '```'].join('\n')}
        onEdit={onEdit}
      />
    );
    openChangeLanguageSubmenu();

    fireEvent.click(menuItemFor('JavaScript'));

    expect(onEdit).toHaveBeenCalledWith(['```javascript', 'const x = <div />;', '```'].join('\n'));
  });
});
