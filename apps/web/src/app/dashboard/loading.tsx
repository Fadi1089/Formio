export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-4 w-14 rounded bg-muted" />
        </div>
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
      <div className="divide-y rounded-lg border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="h-8 w-14 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
