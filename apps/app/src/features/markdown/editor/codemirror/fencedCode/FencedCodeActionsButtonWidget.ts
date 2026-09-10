import { WidgetType } from '@codemirror/view';

import { MORE_ICON } from '../mediaPresentation/embedControlIcons';

export interface OpenFencedCodeMenuParams {
  readonly anchor: HTMLElement;
  readonly nodeFrom: number;
  readonly nodeTo: number;
}

export type OnOpenFencedCodeMenu = (params: OpenFencedCodeMenuParams) => void;

/**
 * The "More actions" control on a fenced code block's opening line —
 * same shape as `NoteEmbedWidget.ts`'s own `moreActionsButton`/`makeButton`
 * (real `<button>`, `.cm-media-control` chrome, `MORE_ICON` — the exact
 * same glyph, imported from the same shared `embedControlIcons.ts` rather
 * than a fenced-code-specific copy), `mousedown`/`click` both
 * `preventDefault()` + `stopPropagation()`, `ignoreEvent()` returns
 * `false`. Sits alongside Copy and Format, not replacing them — this menu
 * only ever holds secondary/destructive actions (currently just Remove;
 * Change Language once its own icon and click behavior are decided).
 *
 * Opening the menu itself is not a document mutation — clicking this
 * button only calls `getOnOpenFencedCodeMenu()`, which the app layer
 * (`MarkdownEditor.tsx`) uses to open `FencedCodeActionsMenu.tsx`'s
 * `Overlay` portal, the identical bridged-anchor pattern
 * `NoteEmbedWidget.ts`'s own more-actions button already establishes.
 * `getOnOpenFencedCodeMenu` is a live getter (not a captured value) for
 * the same "read fresh per click" reason every other injected callback in
 * this editor follows.
 */
export class FencedCodeActionsButtonWidget extends WidgetType {
  constructor(
    private readonly fencedCodeFrom: number,
    private readonly fencedCodeTo: number,
    private readonly getOnOpenFencedCodeMenu: () => OnOpenFencedCodeMenu | undefined
  ) {
    super();
  }

  override eq(other: FencedCodeActionsButtonWidget): boolean {
    return this.fencedCodeFrom === other.fencedCodeFrom && this.fencedCodeTo === other.fencedCodeTo;
  }

  override toDOM(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('cm-media-control', 'cm-code-block-actions');
    button.setAttribute('aria-label', 'More actions');
    button.title = 'More actions';
    button.innerHTML = MORE_ICON;

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.getOnOpenFencedCodeMenu()?.({
        anchor: button,
        nodeFrom: this.fencedCodeFrom,
        nodeTo: this.fencedCodeTo,
      });
    });

    return button;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}
