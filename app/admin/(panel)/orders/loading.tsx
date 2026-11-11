import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      <div className="hidden gap-4 overflow-hidden lg:flex">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="w-72 shrink-0 space-y-3 rounded-2xl border p-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="space-y-3 lg:hidden">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}

