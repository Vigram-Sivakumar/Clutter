import { LanguageDescription } from '@codemirror/language';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * Prettier's own parser name per supported `fencedCodeLanguages.ts` entry —
 * the only new piece of registry this feature needs, deliberately kept as
 * a plain lookup beside the existing one rather than a parallel plugin
 * system. Python has no entry: Prettier has no Python parser, and per
 * product decision this stays unformattable rather than pulling in a
 * second formatting dependency (e.g. a Ruff/WASM build) for one language.
 *
 * `JSX`/`TSX` reuse the exact same parsers as `JavaScript`/`TypeScript`
 * (`babel`/`typescript`) — both already parse JSX syntax unconditionally
 * regardless of which registry entry resolved to them (confirmed against
 * Prettier's own source: `typescript-estree`, behind the `typescript`
 * parser, parses JSX the same way for `.ts`/`.tsx` alike). No new Prettier
 * plugin, no new `formatCode` branch below — JSX/TSX becoming their own
 * registry identity changes nothing about how they format.
 *
 * Uses `fencedCodeLanguageDescriptions`' own canonical `name` as the key —
 * the same registry `fencedCodeLanguageLabel.ts` reads for display, so
 * "is this language formattable" and "what does it display as" share one
 * source of truth for what a language *is*, never a second alias table.
 */
const PRETTIER_PARSER_BY_LANGUAGE: Readonly<Record<string, string>> = {
  JavaScript: 'babel',
  JSX: 'babel',
  TypeScript: 'typescript',
  TSX: 'typescript',
  JSON: 'json',
  CSS: 'css',
  HTML: 'html',
};

/**
 * Resolves a fenced code block's raw `CodeInfo` text to Prettier's parser
 * name, or `null` when the language isn't recognized or isn't formattable
 * (Python, or no language at all) — the single check both the Format
 * button's decoration (show/hide) and its click handler (which parser to
 * invoke) share, so they can never disagree about what counts as
 * formattable. Matching mirrors `fencedCodeLanguageLabel.ts`'s own
 * `friendlyLanguageLabel` exactly (same normalization, same
 * `LanguageDescription.matchLanguageName` call) rather than
 * re-implementing info-string parsing a second time.
 */
export function resolveFormatterParser(rawInfo: string): string | null {
  const normalized = /\S*/.exec(rawInfo.trim())?.[0] ?? '';
  if (!normalized) {
    return null;
  }

  const matched = LanguageDescription.matchLanguageName(
    fencedCodeLanguageDescriptions,
    normalized,
    true
  );
  if (!(matched instanceof LanguageDescription)) {
    return null;
  }

  return PRETTIER_PARSER_BY_LANGUAGE[matched.name] ?? null;
}

/**
 * Formats `code` with `prettier/standalone`, loading it and exactly the
 * plugin(s) `parserName` needs via dynamic `import()` — nothing eagerly
 * pulled into the editor's own load path, per the explicit "lazy/dynamic
 * imports only" requirement. Every parser needs `estree` alongside its own
 * parser plugin (Prettier's own browser docs: "the estree plugin should be
 * loaded when printing JavaScript, TypeScript, Flow, or JSON" — `json` is
 * parsed by the `babel` plugin, not a separate one, confirmed against the
 * installed package's own `plugins/` directory, which has no `json.js`).
 * `html` additionally needs `babel`/`estree`/`postcss` loaded alongside it
 * so embedded `<script>`/`<style>` content formats too — Prettier's own
 * browser doc example loads all four together for HTML.
 *
 * Trailing newline is trimmed from Prettier's output: Prettier always ends
 * output with one, but `CodeText` (what this replaces) never carries a
 * trailing newline of its own — `fencedCodeCopyButtonDecoration.ts`'s own
 * doc comment already established this same fact for Copy's payload.
 * Throws on a genuine syntax error (unparsable code) — the caller
 * (`FencedCodeFormatButtonWidget`) decides how to surface that; no
 * swallowed failure here.
 */
export async function formatCode(parserName: string, code: string): Promise<string> {
  const prettier = await import('prettier/standalone');

  const plugins = [];
  if (parserName === 'babel' || parserName === 'json') {
    plugins.push(await import('prettier/plugins/babel'), await import('prettier/plugins/estree'));
  } else if (parserName === 'typescript') {
    plugins.push(
      await import('prettier/plugins/typescript'),
      await import('prettier/plugins/estree')
    );
  } else if (parserName === 'css') {
    plugins.push(await import('prettier/plugins/postcss'));
  } else if (parserName === 'html') {
    plugins.push(
      await import('prettier/plugins/html'),
      await import('prettier/plugins/babel'),
      await import('prettier/plugins/estree'),
      await import('prettier/plugins/postcss')
    );
  }

  const formatted = await prettier.format(code, { parser: parserName, plugins });
  return formatted.replace(/\n+$/, '');
}
