import { WidgetType } from '@codemirror/view';

/**
 * The at-rest rendered form of a `CodeInfo` node — same shape as
 * `TagWidget`/`DateWidget` (a plain, non-interactive `<span>` standing in
 * for raw source text), but instantiated by `fencedCodeLanguageLabelDecoration.ts`
 * directly rather than through the shared `widgetReplaceRenderer`
 * participant map: this construct's engagement is keyed to its *enclosing*
 * `FencedCode` node, not its own range, which that shared mechanism
 * doesn't support (see that file's own doc comment).
 */
export class FencedCodeLanguageLabelWidget extends WidgetType {
  constructor(readonly label: string) {
    super();
  }

  override eq(other: FencedCodeLanguageLabelWidget): boolean {
    return this.label === other.label;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-code-block-language';
    span.textContent = this.label;
    return span;
  }

  /**
   * No click behavior of its own — same reasoning as `ListBulletWidget`/
   * `DividerLabelWidget`: letting `mousedown` through to CM6's own
   * click-to-position handling means a click on the label still lands the
   * caret on that line and engages it, same as clicking anywhere else on
   * an at-rest construct's line.
   */
  override ignoreEvent(): boolean {
    return false;
  }
}
