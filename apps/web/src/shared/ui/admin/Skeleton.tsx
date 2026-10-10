export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={`block animate-pulse rounded-control bg-(--am-grid) ${className}`} style={style} />
}

export function SkeletonRows({ rows = 6, height = 56 }: { rows?: number; height?: number }) {
  return (
    <div role="status" aria-label="Yuklanmoqda" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4" style={{ height }}>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
