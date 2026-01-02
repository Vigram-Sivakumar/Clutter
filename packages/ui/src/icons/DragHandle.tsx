export function DragHandle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Two horizontal lines with rounded ends for a softer, cuter look */}
      <rect x="4" y="5" width="8" height="2" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="4" y="9" width="8" height="2" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

