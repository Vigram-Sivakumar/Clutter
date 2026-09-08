export interface BrokenEmbedProps {
  readonly label: string;
}

/**
 * Shared fallback presentation for any embed (image, PDF, or note) that
 * didn't resolve — one broken-state component, not a separate one per
 * embed kind, so "something was here but couldn't be shown" always looks
 * the same regardless of why.
 */
export function BrokenEmbed({ label }: BrokenEmbedProps) {
  return (
    <span className="markdown-read-embed-broken" data-embed-status="unresolved">
      {label}
    </span>
  );
}
