export default function FormBuilderLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-px w-full bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
