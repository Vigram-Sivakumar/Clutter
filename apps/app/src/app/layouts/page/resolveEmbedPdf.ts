import type { Vault } from '@core/vault/models/Vault';
import { VaultPath } from '@core/vault/ingest/VaultPath';
import { getResourceDisplayName } from '@core/presentation/getResourceDisplayName';
import type { ResolveEmbedPdf } from '@features/markdown/editor/codemirror/pdf/embedPdfResolution';
import { resolveEmbedAliasFields } from '@features/markdown/editor/codemirror/mediaPresentation/mediaPresentationUpdate';

import { resolveResourceEmbed } from './resolveResourceEmbed';

/**
 * Composes `resolveResourceEmbed()` + a resolved file URL into the editor's
 * injected `ResolveEmbedPdf` boundary — the PDF-scoped counterpart to
 * `resolveEmbedImage.ts`'s `createEmbedImageResolver`, same narrow-composer
 * shape. `embedLivePreview.ts` calls this in two cases: after the image
 * resolver has said `{ status: 'non-image' }` (a real `VaultResource` was
 * found, just not of kind `'image'`), and after it has said
 * `{ status: 'unresolved' }` (no `VaultResource` at all) — this function
 * never re-implements that lookup, only reacts to it a second time for the
 * PDF-specific question.
 */
export function createEmbedPdfResolver(
  vault: Vault,
  resolveResourceUrl: (path: string) => string
): ResolveEmbedPdf {
  return (path, alias) => {
    // A metadata-shaped alias (`|6,center`, per mediaPresentationUpdate.ts's
    // `resolveEmbedAliasFields` — Obsidian-style pipe presentation syntax)
    // is never a real title, the same way `resolveEmbedImage.ts` already
    // treats it for embedded images — only a genuine, non-metadata-shaped
    // alias ever reaches `title` below.
    const displayAlias = resolveEmbedAliasFields(alias).displayAlias;
    const resource = resolveResourceEmbed(vault, path);

    if (!resource) {
      // No `VaultResource` exists for this path at all (missing, renamed,
      // or never existed) — `resource.kind` can't answer "was this meant
      // to be a PDF," so the file extension is the only signal left.
      // `'unresolved'` here means "yes, treat as a missing *PDF* embed" —
      // `embedLivePreview.ts` uses it to route to `PdfEmbedWidget`'s own
      // broken state instead of the generic image one. A non-`.pdf`
      // extension means this reference was never a PDF to begin with, so
      // it declines the same way an existing-but-wrong-kind resource
      // already does below (`'non-pdf'`), leaving the image resolver's
      // own `'unresolved'` outcome as the only one that applies.
      if (VaultPath.extension(path) !== '.pdf') {
        return { status: 'non-pdf' };
      }
      // Mirrors resolveEmbedImage.ts's own unresolved-display-label rule.
      return { status: 'unresolved', title: displayAlias ?? VaultPath.stemName(path) };
    }

    if (resource.kind !== 'pdf') {
      return { status: 'non-pdf' };
    }

    return {
      status: 'pdf',
      url: resolveResourceUrl(resource.path),
      title: displayAlias ?? getResourceDisplayName(resource),
      // The vault-relative path exactly as written between the embed's own
      // `![[...]]` brackets — what the "Open" action hands back to the app
      // layer to re-resolve into the real `VaultResource` `PdfOverlay` needs
      // (see PageHost.tsx's onPdfEmbedClick composition).
      path,
      // Already resolved right above — the inline embed's own "More
      // actions" control dispatches against this directly, no separate
      // click-time resolution step (unlike ImageOverlay's resourceId gate).
      resourceId: resource.id,
    };
  };
}
