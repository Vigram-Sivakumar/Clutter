import type { EmbedImageResolution } from '../../editor/codemirror/embed/embedImageResolution';

export interface ReadImageProps {
  readonly resolution: Extract<EmbedImageResolution, { status: 'image' }>;
}

/**
 * Renders a resolved image embed — reuses `EmbedImageResolution`'s already-
 * resolved `url`/`alt` exactly as `ImageWidget.ts` does, but as a plain
 * `<img>` rather than a CM6 `WidgetType`: no options menu, no resize
 * handle, no cover-image/download actions — read-only presentation only.
 */
export function ReadImage({ resolution }: ReadImageProps) {
  return <img className="markdown-read-image" src={resolution.url} alt={resolution.alt} loading="lazy" />;
}
