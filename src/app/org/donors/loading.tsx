import { OrgSkeletonShell, SkeletonBar } from "@/components/org/org-skeleton-shell";

export default function OrgDonorsLoading() {
  return (
    <OrgSkeletonShell>
      <div className="mb-6 space-y-2">
        <SkeletonBar className="h-6 w-32" />
        <SkeletonBar className="h-3 w-72 bg-stone-100" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-[86px] rounded-2xl" />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SkeletonBar className="h-10 w-full rounded-xl sm:w-72" />
        <SkeletonBar className="h-10 w-28 rounded-xl" />
        <SkeletonBar className="h-10 w-28 rounded-xl" />
        <SkeletonBar className="h-10 w-32 rounded-xl" />
      </div>

      <div className="space-y-2 sm:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBar key={i} className="h-36 rounded-2xl" />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white sm:block">
        <div className="h-11 border-b border-stone-100 bg-stone-50/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-stone-100 px-4 py-3.5">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-4 w-36 bg-stone-100" />
            <SkeletonBar className="h-4 w-20 bg-stone-100" />
            <SkeletonBar className="ml-auto h-4 w-24" />
            <SkeletonBar className="h-6 w-16 rounded-full bg-stone-100" />
          </div>
        ))}
      </div>
    </OrgSkeletonShell>
  );
}
