import { PageHeaderSkeleton, TableSkeleton } from "@/components/loading-skeletons"
import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <PageHeaderSkeleton />
      
      {/* Filters skeleton */}
      <div className="mb-6 flex gap-4">
        <div className="h-10 w-64 bg-white rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-white rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-white rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={8} cols={10} />
        </CardContent>
      </Card>
    </div>
  )
}

