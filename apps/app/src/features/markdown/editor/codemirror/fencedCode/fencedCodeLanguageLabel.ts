import { LanguageDescription } from '@codemirror/language';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * Friendly display name per registered language's canonical `name` — `js`/
 * `javascript` both resolve to the same `LanguageDescription` (`name:
 * 'javascript'`), so this maps from *that* canonical name, not from
 * whatever alias the user actually typed. `LanguageDescription` has no
 * separate "display name" field of its own (confirmed against
 * `@codemirror/language`'s installed types — `name`/`alias`/`extensions`/
 * `filename`/`load`/`support`, nothing else), so this is a small, local
 * lookup table alongside the existing registry, not a gap CM6 already
 * fills.
 */
const FRIENDLY_NAME_BY_CANONICAL_NAME: ReadonlyMap<string, string> = new Map([
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['json', 'JSON'],
  ['css', 'CSS'],
  ['html', 'HTML'],
  ['python', 'Python'],
]);

/**
 * Resolves a fenced code block's raw `CodeInfo` text to a friendly display
 * label — `js` → `JavaScript`, `py` → `Python`, etc. Matched via
 * `LanguageDescription.matchLanguageName`, the exact same lookup
 * `@codemirror/lang-markdown`'s own `getCodeParser` uses internally to
 * resolve `codeLanguages` (confirmed against its installed source) — never
 * a second, independently-derived alias table.
 *
 * `rawInfo` is normalized the same way CM6 itself normalizes it before
 * matching (`getCodeParser`: "strip anything after whitespace") — an info
 * string like `js title="x"` (a convention some Markdown flavors use for
 * extra metadata) matches on `js` alone, not the full string.
 *
 * An unrecognized language (edge case: unknown info string) falls back to
 * the raw, as-typed text itself (trimmed of the same leading/trailing
 * whitespace CM6's own normalization strips) rather than `null` — the
 * label still shows *something* meaningful the user actually wrote, per
 * "unknown language fails gracefully" rather than disappearing. Only a
 * genuinely empty info string (no language at all) returns `null` — the
 * caller's signal to render no label.
 */
export function friendlyLanguageLabel(rawInfo: string): string | null {
  const normalized = /\S*/.exec(rawInfo.trim())?.[0] ?? '';
  if (!normalized) {
    return null;
  }

  const matched = LanguageDescription.matchLanguageName(
    fencedCodeLanguageDescriptions,
    normalized,
    true
  );

  if (matched instanceof LanguageDescription) {
    return FRIENDLY_NAME_BY_CANONICAL_NAME.get(matched.name) ?? matched.name;
  }

  return normalized;
}
