import { Skeleton } from "@/components/ui/skeleton";

export default function AdminStaffLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

