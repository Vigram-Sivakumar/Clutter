import type { ResolveEmbedImage } from '../../editor/codemirror/embed/embedImageResolution';
import type { ResolveEmbedPdf } from '../../editor/codemirror/pdf/embedPdfResolution';
import { ReadImage } from './ReadImage';
import { ReadPdfEmbed } from './ReadPdfEmbed';

export interface ReadEmbedProps {
  readonly path: string;
  readonly alias: string | null;
  readonly resolveEmbedImage?: ResolveEmbedImage;
  readonly resolveEmbedPdf?: ResolveEmbedPdf;
}

function BrokenEmbed({ label }: { readonly label: string }) {
  return (
    <span className="markdown-read-embed-broken" data-embed-status="unresolved">
      {label}
    </span>
  );
}

/**
 * Dispatches an `Embed`(`![[path]]`) span to `ReadImage`/`ReadPdfEmbed`,
 * mirroring `embedLivePreview.ts`'s own resolution order exactly: try the
 * image resolver first, and only fall through to the PDF resolver when it
 * says `'non-image'` (a real resource, just not an image) or `'unresolved'`
 * (no resource at all — the PDF resolver may still recognize it as a
 * missing *PDF* via its own extension fallback). No resolver injected at
 * all (e.g. compact/inline-only callers) renders the same broken state a
 * genuinely unresolved target would.
 */
export function ReadEmbed({ path, alias, resolveEmbedImage, resolveEmbedPdf }: ReadEmbedProps) {
  const imageResolution = resolveEmbedImage?.(path, alias);

  if (imageResolution?.status === 'image') {
    return <ReadImage resolution={imageResolution} />;
  }

  if (imageResolution === undefined || imageResolution.status === 'non-image' || imageResolution.status === 'unresolved') {
    const pdfResolution = resolveEmbedPdf?.(path, alias);

    if (pdfResolution?.status === 'pdf') {
      return <ReadPdfEmbed resolution={pdfResolution} />;
    }

    if (pdfResolution?.status === 'unresolved') {
      return <BrokenEmbed label={pdfResolution.title} />;
    }
  }

  if (imageResolution?.status === 'unresolved') {
    return <BrokenEmbed label={imageResolution.alt} />;
  }

  return <BrokenEmbed label={path} />;
}
