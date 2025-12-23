import { PageHeaderSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

