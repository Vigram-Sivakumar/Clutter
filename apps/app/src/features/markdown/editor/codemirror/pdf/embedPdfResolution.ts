/**
 * The injected Embed-PDF resolution contract — the PDF-scoped counterpart
 * to `embed/embedImageResolution.ts`'s `EmbedImageResolution`/
 * `ResolveEmbedImage`. `embedLivePreview.ts` calls this in two cases:
 * after the image resolver has said `{ status: 'non-image' }` for a target
 * (a real `VaultResource` was found, just not of kind `'image'` — given
 * `VaultResourceKind = 'pdf' | 'image'`, `'pdf'` is the only reachable
 * outcome there), and after it has said `{ status: 'unresolved' }` (no
 * `VaultResource` at all — `resolveEmbedPdf.ts`'s own composer then falls
 * back to the target path's file extension, the only signal left once
 * Vault resolution fails, to decide whether this missing reference should
 * still render as a *missing PDF* rather than the generic missing-image
 * state). `'non-pdf'` is returned either for a resolved non-PDF resource
 * or for a missing target whose extension doesn't say `.pdf` either —
 * both mean "not this resolver's concern," and `embedLivePreview.ts`
 * falls through to the image resolver's own outcome in both cases.
 *
 * `url`/`path` are plain strings, never a `VaultResource` — the editor
 * layer must never import `Vault` types (the same boundary
 * `ImageWidget.ts`'s `OnImageClick`/`copyUrl` already respects). `path` is
 * the embed's own vault-relative target exactly as written between
 * `![[...]]`'s brackets — what the "Open" action hands back to the app
 * layer to re-resolve into the real `VaultResource` `PdfOverlay` needs.
 *
 * `resourceId` is the one exception to "never a `VaultResource`" — a plain
 * `string` id (not the resource object itself), included directly because
 * every `'pdf'` outcome already came from a real, resolved `VaultResource`
 * (unlike a standard Markdown image, which may name an external URL with
 * no resource behind it at all — see `imageResourceResolution.ts`'s own,
 * separate click-time resolver for that case). This is what lets the
 * inline embed's own floating "More actions" control dispatch against the
 * same resource `PdfOverlay`/the Sidebar row already do, without a second
 * resolution step.
 */
export type EmbedPdfResolution =
  | {
      readonly status: 'pdf';
      readonly url: string;
      readonly title: string;
      readonly path: string;
      readonly resourceId: string;
    }
  | { readonly status: 'unresolved'; readonly title: string }
  | { readonly status: 'non-pdf' };

/** `path`/`alias` are the Embed's own already-parsed target/alias (embedScanner.ts's EmbedMatch) — never re-parsed here. */
export type ResolveEmbedPdf = (path: string, alias: string | null) => EmbedPdfResolution;
