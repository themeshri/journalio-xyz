export default function DashboardLoading() {
  return (
    <div className="pt-8 animate-pulse">
      <div className="h-6 w-32 bg-muted rounded mb-6" />
      <div className="flex gap-10 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-20 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}
