import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrderDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="mx-auto h-96 max-w-[320px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

