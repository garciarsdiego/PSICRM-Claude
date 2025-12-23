import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function PatientsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Loading */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex gap-4">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Table Header */}
                        <div className="flex gap-4 border-b pb-4">
                            <Skeleton className="h-6 w-8" />
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-6 w-1/5" />
                            <Skeleton className="h-6 w-1/6" />
                            <Skeleton className="h-6 w-1/6" />
                            <Skeleton className="h-6 w-1/6" />
                        </div>
                        {/* Rows */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex gap-4 py-2 border-b">
                                <Skeleton className="h-12 w-8" />
                                <div className="flex flex-col gap-2 w-1/4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-4 w-1/5 my-auto" />
                                <Skeleton className="h-6 w-1/6 rounded-full my-auto" />
                                <Skeleton className="h-4 w-1/6 my-auto" />
                                <div className="flex gap-2 w-1/6 my-auto">
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
