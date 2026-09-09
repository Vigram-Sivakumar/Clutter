/**
 * Classifies a raw, still-unresolved `![[target]]` embed reference by its
 * own file extension alone — never by whether resolution against the
 * vault succeeded. Deliberately duplicates (rather than imports)
 * `core/vault/ingest/SupportedResourceKind.ts`'s own `IMAGE_EXTENSIONS`
 * list and `VaultPath.extension`'s own algorithm: this editor/feature-
 * layer module must never import Core Vault directly — the same
 * "editor/feature layer never imports Vault directly" boundary
 * `resolvePageEmbed.ts`'s own doc comment already documents for
 * `embedLivePreview.ts`/`NoteEmbedWidget.ts`. Classification-by-extension
 * needs no Vault access at all (it's pure string parsing on a path
 * `scanEmbed` already extracted), so duplicating this small, stable piece
 * of logic here — rather than importing across the boundary for it — is
 * the correct trade, matching the precedent `resolvePageEmbed.ts`'s own
 * doc comment sets for `splitEmbedTarget`. Keep `IMAGE_EXTENSIONS` below
 * in sync with that file's own list if it's ever extended.
 *
 * Exists to fix a real, confirmed misclassification bug: `![[statue.pngs]]`
 * (a typo'd extension) used to fall all the way through
 * `embedLivePreview.ts`'s own image → PDF → page resolution chain
 * unclassified, landing on "Note not found" simply because every other
 * resolver happened to decline it — a *failed resolution* was silently
 * deciding the *type*, not just whether it succeeded. Classifying the
 * target's own extension FIRST, independent of resolution outcome, is
 * what fixes that:
 *
 * - No extension at all (`Meeting Notes`, `Page#Heading`) — the only
 *   shape ever presumed to name a page; only this case is ever handed to
 *   `resolvePageEmbed`.
 * - A recognized image extension (`statue.png`) — presumed to name an
 *   image regardless of whether the file actually exists; a missing file
 *   renders as a broken *Image*, never a page lookup.
 * - Anything else (`statue.pngs`, `notes.docx`, `archive.zip`) — an
 *   extension is present but isn't one this editor renders inline at
 *   all (a real `.pdf` target is already fully handled by
 *   `resolveEmbedPdf`'s own extension fallback before this classifier is
 *   ever consulted — see `embedLivePreview.ts`'s own call site) — never
 *   presumed to name a page either. Renders the shared, generic
 *   "unsupported file" card (`UnknownEmbedWidget.ts`) instead of guessing.
 */

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export type EmbedTargetKind = 'image' | 'no-extension' | 'unrecognized';

export function classifyEmbedTargetExtension(path: string): EmbedTargetKind {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const dotIndex = filename.lastIndexOf('.');
  // `dotIndex > 0`, not `>= 0` — mirrors `VaultPath.extension`'s own rule
  // that a filename *starting* with a dot (`.gitignore`-shaped) has no
  // extension, not an empty-name-plus-extension.
  const extension = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : '';

  if (extension === '') {
    return 'no-extension';
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  return 'unrecognized';
}
