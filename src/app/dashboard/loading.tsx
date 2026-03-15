export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-5 w-80 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="aspect-video w-full animate-pulse bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
