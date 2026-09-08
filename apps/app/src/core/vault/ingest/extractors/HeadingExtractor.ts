import { extractHeadingOccurrences } from './headingSemantics';

export interface ScannedHeading {
  readonly level: number;
  readonly title: string;
}

/**
 * ADR-032: delegates to the shared `extractHeadingOccurrences` grammar-based
 * implementation rather than owning its own parsing logic. `ScannedHeading`'s
 * shape is unchanged — parser-specific position data (`HeadingOccurrence.from`)
 * is dropped here and never leaks into durable analysis.
 */
export class HeadingExtractor {
  extract(content: string): readonly ScannedHeading[] {
    return extractHeadingOccurrences(content).map(({ level, text }) => ({
      level,
      title: text,
    }));
  }
}
