// Reusable skeleton primitives used across all loading.tsx files

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    />
  );
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md animate-pulse ${className}`}
      style={{ background: "var(--color-border)" }}
    />
  );
}

export function PageLoadingSkeleton({
  cards = 4,
  rows = 5,
  showHeader = true,
}: {
  cards?: number;
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Page header skeleton */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-6 w-40" />
            <SkeletonText className="h-3.5 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
        </div>
      )}

      {/* Stat cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(cards, 4)} gap-3`}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
