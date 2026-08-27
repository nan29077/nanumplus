import { OrgSkeletonShell, SkeletonBar } from "@/components/org/org-skeleton-shell";

export default function OrgDonorDetailLoading() {
  return (
    <OrgSkeletonShell>
      <SkeletonBar className="mb-4 h-4 w-28 bg-stone-100" />

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBar className="h-6 w-32" />
          <SkeletonBar className="h-6 w-20 rounded-full bg-stone-100" />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <SkeletonBar className="h-4 w-40 bg-stone-100" />
          <SkeletonBar className="h-4 w-48 bg-stone-100" />
          <SkeletonBar className="h-4 w-32 bg-stone-100" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-[86px] rounded-2xl" />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SkeletonBar className="h-[340px] rounded-2xl lg:col-span-2" />
        <SkeletonBar className="h-[340px] rounded-2xl" />
      </div>

      <SkeletonBar className="mt-4 h-40 rounded-2xl" />
      <SkeletonBar className="mt-4 h-52 rounded-2xl" />

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="h-11 border-b border-stone-100 bg-stone-50/60" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-stone-100 px-4 py-3.5">
            <SkeletonBar className="h-4 w-32 bg-stone-100" />
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-6 w-24 rounded-full bg-stone-100" />
            <SkeletonBar className="ml-auto h-6 w-16 rounded-full bg-stone-100" />
          </div>
        ))}
      </div>
    </OrgSkeletonShell>
  );
}
