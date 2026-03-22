export default function AnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
