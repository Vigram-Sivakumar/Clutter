import { useEffect, useRef, useState } from 'react';

import { PdfPageCanvas } from '@features/pdf/PdfPageCanvas';
import { getAvailableViewerWidth } from '@features/pdf/pdfFitWidth';
import { computeFitScale } from '@features/pdf/pdfZoom';
import { usePdfDocument } from '@features/pdf/usePdfDocument';

import type { EmbedPdfResolution } from '../../editor/codemirror/pdf/embedPdfResolution';

export interface ReadPdfEmbedProps {
  readonly resolution: Extract<EmbedPdfResolution, { status: 'pdf' }>;
}

/**
 * Renders a resolved PDF embed's first page — reuses the exact same
 * document-loading (`usePdfDocument`) and page-rendering (`PdfPageCanvas`,
 * and underneath it `renderPdfPage`) primitives `PdfViewer` and
 * `PdfEmbedWidget` already share, rather than a third implementation. No
 * pagination, zoom control, or "More actions" menu — this milestone's
 * scope is static, read-only presentation, matching `ImageWidget`'s
 * omission from `ReadImage` for the same reason. A `PdfEmbedWidget`-style
 * multi-page/zoom-aware embed can build on this later without touching
 * `usePdfDocument`/`PdfPageCanvas` themselves.
 */
export function ReadPdfEmbed({ resolution }: ReadPdfEmbedProps) {
  const state = usePdfDocument(resolution.url);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [pageBaseWidth, setPageBaseWidth] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const measure = () => setAvailableWidth(getAvailableViewerWidth(container));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (state.status !== 'ready') {
      setPageBaseWidth(null);
      return;
    }
    let cancelled = false;
    void state.doc.getPage(1).then((page) => {
      if (!cancelled) {
        setPageBaseWidth(page.getViewport({ scale: 1 }).width);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <div ref={containerRef} className="markdown-read-pdf pdf-viewer__scroll" data-pdf-title={resolution.title}>
      {state.status === 'ready' && pageBaseWidth ? (
        <PdfPageCanvas
          doc={state.doc}
          pageNumber={1}
          scale={computeFitScale(availableWidth, pageBaseWidth)}
          onVisible={() => {}}
        />
      ) : (
        <div className="markdown-read-pdf-loading">{resolution.title}</div>
      )}
    </div>
  );
}
