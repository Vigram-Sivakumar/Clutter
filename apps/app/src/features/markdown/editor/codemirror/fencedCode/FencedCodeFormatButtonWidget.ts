import { EditorView, WidgetType } from '@codemirror/view';

import { formatCode } from './codeFormatting';

// Same glyph as `iconRegistry.ts`'s `brush` entry (`shared/icon/svg/brush.svg`)
// — hand-copied, not imported, since this button lives in raw CM6
// `WidgetType` DOM, not a React tree (see `iconRegistry.ts`'s own doc
// comment: it's the only file that imports SVGs). Keep in sync with
// `brush.svg` if that file ever changes.
const FORMAT_ICON = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.43539 7.45455C2.19835 8.16322 2 9.08416 2 10.1818C2 12.9091 3.22449 14 3.22449 14H5.61905V12.3636L8.01361 14H14C14 14 12.6716 12.7767 12.2041 11.8182C12.0271 11.4554 11.9065 11.1 11.8201 10.7273C11.7241 10.3128 11.6704 9.87705 11.6288 9.38613C11.6133 9.20419 11.5021 9.04385 11.336 8.96815L9.63223 8.19196C9.39448 8.08364 9.2802 7.81053 9.36996 7.56517L10.8477 3.52574C10.9375 3.28038 10.8232 3.00727 10.5855 2.89895L9.05542 2.2019C8.8088 2.08954 8.51755 2.19412 8.39874 2.4377L6.41514 6.5043C6.30291 6.73437 6.03504 6.84252 5.79453 6.75487L3.57348 5.94538C3.36628 5.86986 3.13566 5.94017 3.0248 6.13081C2.8655 6.40474 2.63652 6.85323 2.43539 7.45455ZM11.8201 10.7273L2.43539 7.45455" stroke="currentColor" stroke-linejoin="round"/></svg>`;
const ERROR_ICON = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.3" r="0.9" fill="currentColor"/><circle cx="8" cy="8" r="6.25" stroke="currentColor"/></svg>`;

/**
 * The explicit Format control on a fenced code block's opening line —
 * same interactive-widget shape as `FencedCodeCopyButtonWidget.ts`
 * (real `<button>`, `mousedown`/`click` both `preventDefault()` +
 * `stopPropagation()`, `ignoreEvent()` returns `false`), reusing the exact
 * same `.cm-media-control` chrome. Only ever constructed by
 * `fencedCodeFormatButtonDecoration.ts` for a block whose language
 * `codeFormatting.ts`'s `resolveFormatterParser` recognizes — this widget
 * itself doesn't re-check formattability, it trusts its caller.
 *
 * `getCode`/`view`/`fencedCodeFrom` follow the identical "re-resolve fresh
 * at click time, never trust a captured range" contract
 * `FencedCodeCopyButtonWidget.ts` already established, for the same
 * reason: `eq()` (keyed to `fencedCodeFrom` + `parserName`) lets CM6 reuse
 * this widget's DOM/closures across doc-change rebuilds whenever the
 * block's own start position hasn't moved, so the closures must always
 * re-resolve current document state rather than close over a stale range.
 *
 * Formatting is explicit-trigger only (click) and one-shot — no
 * format-on-keystroke, no debounce, nothing continuous. A single CM6
 * transaction replaces exactly the `CodeText` range with Prettier's
 * output; everything outside that range (fences, info string, surrounding
 * document) is untouched.
 */
export class FencedCodeFormatButtonWidget extends WidgetType {
  constructor(
    private readonly fencedCodeFrom: number,
    private readonly parserName: string,
    private readonly view: EditorView,
    private readonly getCodeRange: () => { from: number; to: number } | null
  ) {
    super();
  }

  override eq(other: FencedCodeFormatButtonWidget): boolean {
    return this.fencedCodeFrom === other.fencedCodeFrom && this.parserName === other.parserName;
  }

  override toDOM(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('cm-media-control', 'cm-code-block-format');
    button.setAttribute('aria-label', 'Format code');
    button.title = 'Format code';
    button.innerHTML = FORMAT_ICON;

    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const showError = () => {
      button.innerHTML = ERROR_ICON;
      button.classList.add('cm-code-block-format--error');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.innerHTML = FORMAT_ICON;
        button.classList.remove('cm-code-block-format--error');
      }, 1500);
    };

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const range = this.getCodeRange();
      if (!range) {
        return;
      }
      const code = this.view.state.sliceDoc(range.from, range.to);

      // A genuine parse/syntax error in the code being formatted (invalid
      // or incomplete code, e.g. a paste that landed as malformed content
      // for its declared language) is a legitimate, expected outcome, not
      // an app bug — the document is left completely untouched, matching
      // `FencedCodeCopyButtonWidget.ts`'s own "denial is not a bug"
      // posture for its clipboard-permission failure. Unlike Copy's
      // failure, though, this one gets a brief visible indicator (icon
      // swap, same timed-reset shape as Copy's own success checkmark) —
      // silently doing nothing here was indistinguishable from the button
      // simply not working, confirmed as a real, reported point of
      // confusion, not merely a hypothetical polish gap.
      formatCode(this.parserName, code).then(
        (formatted) => {
          if (formatted === code) {
            return;
          }
          this.view.dispatch({
            changes: { from: range.from, to: range.to, insert: formatted },
          });
        },
        () => {
          showError();
        }
      );
    });

    return button;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}
