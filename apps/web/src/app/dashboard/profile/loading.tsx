export default function ProfileLoading() {
  return (
    <div className="max-w-sm space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-20 rounded bg-muted" />
        <div className="h-4 w-36 rounded bg-muted" />
      </div>
      <div className="rounded-lg border p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-12 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="h-8 w-20 rounded bg-muted" />
    </div>
  );
}
