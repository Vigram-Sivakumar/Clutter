import { BrokenEmbed } from './BrokenEmbed';
import { NoteEmbed } from './NoteEmbed';
import { ReadImage } from './ReadImage';
import { ReadPdfEmbed } from './ReadPdfEmbed';
import type { MarkdownReadResolvers } from './renderInlineSpans';

export interface ReadEmbedProps {
  readonly path: string;
  readonly alias: string | null;
  readonly resolvers: MarkdownReadResolvers;
}

/**
 * Dispatches an `Embed` (`![[path]]`) span to `ReadImage`/`ReadPdfEmbed`/
 * `NoteEmbed`, in that order — mirroring `embedLivePreview.ts`'s own
 * image-then-pdf resolution order exactly, extended with a third,
 * note-embed fallback tried only once both have declined (an image/PDF
 * `VaultResource` and a `Page` are disjoint targets, so trying all three
 * in a fixed order is unambiguous). No resolver injected at all renders
 * the same broken state a genuinely unresolved target would.
 */
export function ReadEmbed({ path, alias, resolvers }: ReadEmbedProps) {
  const imageResolution = resolvers.resolveEmbedImage?.(path, alias);
  if (imageResolution?.status === 'image') {
    return <ReadImage resolution={imageResolution} />;
  }

  // Reaching here means the image resolver declined (or none was
  // injected) — try the PDF resolver next.
  const pdfResolution = resolvers.resolveEmbedPdf?.(path, alias);
  if (pdfResolution?.status === 'pdf') {
    return <ReadPdfEmbed resolution={pdfResolution} />;
  }

  // Both declined — try the note-embed resolver last.
  const pageResolution = resolvers.resolvePageEmbed?.(path);
  if (pageResolution?.status === 'resolved') {
    return <NoteEmbed resolution={pageResolution} resolvers={resolvers} />;
  }

  const label =
    pageResolution?.status === 'ambiguous' || pageResolution?.status === 'unresolved'
      ? pageResolution.displayLabel
      : pdfResolution?.status === 'unresolved'
        ? pdfResolution.title
        : imageResolution?.status === 'unresolved'
          ? imageResolution.alt
          : path;

  return <BrokenEmbed label={label} />;
}
