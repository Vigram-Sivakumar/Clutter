/**
 * The single opt-in registry for `blockSeparatorDecoration.ts`: which
 * syntax node names count as a "block-like" rendered construct for the
 * purpose of visual separator spacing (fenced code, image/PDF/note
 * embeds today; a future URL embed opts in by adding its own node name
 * here — nothing else in the separator implementation should ever branch
 * on which specific kind of block it's looking at).
 *
 * `Image` and `Embed` are Markdown-*inline* nodes (an image/embed can
 * syntactically sit mid-paragraph — `markdownGrammarExtensions.ts`'s own
 * grammar composition, `embedLayout.css`'s `.cm-media-block` doc comment)
 * that are visually promoted to block layout by CSS regardless of where
 * they sit in the source. `blockSeparatorDecoration.ts` doesn't care
 * about that distinction — it only asks "does this node's name appear in
 * this set," so both node shapes (`FencedCode`'s genuine block ownership
 * and `Image`/`Embed`'s inline-promoted-to-block ownership) are handled
 * uniformly by the same registry lookup.
 */
export const BLOCK_SPACING_PARTICIPANTS: ReadonlySet<string> = new Set(['FencedCode', 'Image', 'Embed']);
