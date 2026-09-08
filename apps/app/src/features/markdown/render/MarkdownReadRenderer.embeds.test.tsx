// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Same wholesale pdfjs-dist mock PdfViewer.test.tsx already establishes —
// this suite is about ReadEmbed/ReadPdfEmbed's own dispatch/rendering
// behavior, not pdfjs-dist's real rendering pipeline.
function makeFakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    getTextContent: () => Promise.resolve({ items: [{ str: 'fake text' }], styles: {} }),
  };
}

function makeFakeDoc(numPages: number) {
  return { numPages, getPage: vi.fn(() => Promise.resolve(makeFakePage())) };
}

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.mjs' }));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn((url: string) => ({
    promise: url.includes('missing') ? Promise.reject(new Error('not found')) : Promise.resolve(makeFakeDoc(1)),
    destroy: vi.fn(),
  })),
  OutputScale: class {
    sx = 1;
    sy = 1;
    get scaled() {
      return false;
    }
  },
}));

vi.mock('pdfjs-dist/web/pdf_viewer.mjs', () => ({
  TextLayerBuilder: class {
    div = document.createElement('div');
    async render() {}
    cancel() {}
  },
}));

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
}

class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: IntersectionObserverCallback) {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Imported after the mocks above so `usePdfDocument`/`PdfPageCanvas` pick
// up the mocked `pdfjs-dist`.
const { MarkdownReadRenderer } = await import('./MarkdownReadRenderer');

describe('MarkdownReadRenderer — image/PDF embeds', () => {
  it('renders a resolved image embed as an <img>', () => {
    const { container } = render(
      <MarkdownReadRenderer
        markdown="![[photo.png]]"
        resolvers={{
          resolveEmbedImage: () => ({ status: 'image', url: 'app:///vault/photo.png', copyUrl: 'photo.png', alt: 'photo.png' }),
        }}
      />
    );

    const img = container.querySelector('img.markdown-read-image');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'app:///vault/photo.png');
    expect(img).toHaveAttribute('alt', 'photo.png');
  });

  it('falls through to the PDF resolver when the image resolver says non-image, and renders the PDF page', async () => {
    let container!: HTMLElement;

    await act(async () => {
      ({ container } = render(
        <MarkdownReadRenderer
          markdown="![[contract.pdf]]"
          resolvers={{
            resolveEmbedImage: () => ({ status: 'non-image' }),
            resolveEmbedPdf: () => ({
              status: 'pdf',
              url: 'app:///vault/contract.pdf',
              title: 'contract.pdf',
              path: 'contract.pdf',
              resourceId: 'res-1',
            }),
          }}
        />
      ));
    });

    expect(container.querySelector('.markdown-read-pdf')).not.toBeNull();
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders a broken-embed placeholder when neither resolver resolves the target', () => {
    const { container } = render(
      <MarkdownReadRenderer
        markdown="![[missing-file.png]]"
        resolvers={{
          resolveEmbedImage: () => ({ status: 'unresolved', alt: 'missing-file' }),
          resolveEmbedPdf: () => ({ status: 'non-pdf' }),
        }}
      />
    );

    const broken = container.querySelector('.markdown-read-embed-broken');
    expect(broken).not.toBeNull();
    expect(broken).toHaveTextContent('missing-file');
  });

  it('renders a broken-embed placeholder when no resolvers are injected at all', () => {
    const { container } = render(<MarkdownReadRenderer markdown="![[some-file.png]]" />);
    expect(container.querySelector('.markdown-read-embed-broken')).toHaveTextContent('some-file.png');
  });
});
