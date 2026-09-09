// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression coverage for docs/editor-architecture-decisions.md's "Atomic
 * inline widgets and text-decoration composition" entry: `.tok-wikilink`
 * is `display: inline-flex` (needed for its icon+title layout), which
 * makes it an atomic inline-level box that an ancestor's
 * `text-decoration-line` does not paint through by default. Two
 * independent decorating ancestors were found to hit this:
 *   - `~~[[Page]]~~` (Strikethrough's `.tok-strike`) struck through
 *     surrounding text but never the WikiLink widget itself;
 *   - `- [x] text [[Page]]` (a completed task's own line-level
 *     strikethrough, `.cm-line:has(.cm-task-checkbox
 *     [aria-checked='true'])` — a separate mechanism from `~~~~`, not
 *     routed through `.tok-strike` at all) had the identical gap.
 *
 * jsdom cannot compute real paint/layout, so this cannot assert the fix
 * renders correctly on screen (that was verified live in the real webapp
 * during investigation — see the doc entry). What's provable at the
 * source level, and what would regress silently otherwise:
 *   - both fix rules exist with the right selector and property, scoped
 *     to `.tok-wikilink` alone;
 *   - the rejected alternative (chaining `text-decoration-line: inherit`
 *     onto the unrelated `.tok-strong`/`.tok-emphasis`/`.tok-highlight`
 *     content-mark classes) was never reintroduced.
 *
 * The DOM-ancestry precondition each selector depends on — that
 * `.tok-wikilink` is a genuine descendant of `.tok-strike` at any nesting
 * depth/order (`~~**[[Page]]**~~`, `~~==**[[Page]]**==~~`,
 * `**~~[[Page]]~~**`, ...), and that it shares a `.cm-line` with a
 * checked `.cm-task-checkbox` inside a completed task — is covered by
 * `wikilink/wikiLinkLivePreview.test.ts`'s "regression: WikiLink widget
 * nests inside enclosing formatting marks" and "regression: WikiLink
 * inside a completed task shares the checked task line" describe blocks;
 * not duplicated here.
 */
describe('MarkdownEditor.css — WikiLink text-decoration composition', () => {
  const css = readFileSync(join(__dirname, 'MarkdownEditor.css'), 'utf8');

  it('declares text-decoration-line: line-through for .tok-wikilink under a .tok-strike ancestor, at the widget boundary only', () => {
    const match = css.match(/\.cm-editor\s+\.tok-strike\s+\.tok-wikilink\s*\{([^}]*)\}/);
    expect(match, '.cm-editor .tok-strike .tok-wikilink rule not found').not.toBeNull();
    expect(match![1]).toMatch(/text-decoration-line\s*:\s*line-through\s*;/);
  });

  it('declares text-decoration-line: line-through for .tok-wikilink under a completed-task-line ancestor, at the widget boundary only', () => {
    const match = css.match(
      /\.cm-editor\s+\.cm-line:has\(\.cm-task-checkbox\[aria-checked='true'\]\)\s+\.tok-wikilink\s*\{([^}]*)\}/
    );
    expect(
      match,
      ".cm-editor .cm-line:has(.cm-task-checkbox[aria-checked='true']) .tok-wikilink rule not found"
    ).not.toBeNull();
    expect(match![1]).toMatch(/text-decoration-line\s*:\s*line-through\s*;/);
  });

  it('does not reintroduce the rejected inherit-chain fix on unrelated formatting-mark classes', () => {
    for (const selector of ['\\.tok-strong', '\\.tok-emphasis', '\\.tok-highlight']) {
      const ruleRegex = new RegExp(`\\.cm-editor\\s+${selector}\\s*\\{([^}]*)\\}`, 'g');
      let ruleMatch: RegExpExecArray | null;
      while ((ruleMatch = ruleRegex.exec(css))) {
        expect(
          ruleMatch[1],
          `${selector.replace(/\\/g, '')}'s rule must not declare text-decoration-line — the fix is scoped to .tok-wikilink`
        ).not.toMatch(/text-decoration-line/);
      }
    }
  });
});
