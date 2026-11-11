import { Suspense } from "react";

import { LandingHero } from "@/components/customer/landing-hero";
import { Skeleton } from "@/components/ui/skeleton";

function LandingSkeleton() {
  return (
    <section className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-72 sm:w-96" />
          <Skeleton className="h-5 w-80 sm:w-[30rem]" />
        </div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

export default function CustomerLandingPage() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <LandingHero />
    </Suspense>
  );
}

