/**
 * The single opt-in registry for `blockSeparatorDecoration.ts`: which
 * syntax node names can sit *mid-line*, sharing a physical line with
 * other inline content, while still rendering as their own visual block
 * (`.cm-media-block`'s CSS block-in-inline split). `blockSeparatorDecoration.ts`
 * only ever handles *same-physical-line* spacing around a node in this
 * set — every *cross-line* boundary (including this node's own, when it
 * sits alone on its own line) belongs to `lineSeparatorDecoration.ts`'s
 * physical-line system instead. A future URL embed opts in by adding its
 * own node name here.
 *
 * `FencedCode` is deliberately absent — it never shares a physical line
 * with other content (a fence marker line's content is always the whole
 * line), so it never needed this mechanism; it opts out of the line
 * system too, on its own terms — see `lineSeparatorDecoration.ts`'s doc
 * comment.
 */
export const BLOCK_SPACING_PARTICIPANTS: ReadonlySet<string> = new Set(['Image', 'Embed']);
