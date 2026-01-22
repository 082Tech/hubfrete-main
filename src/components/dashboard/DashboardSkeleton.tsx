import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-5 w-5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatsCardsSkeleton />
      <SummaryCardsSkeleton />
    </div>
  );
}
