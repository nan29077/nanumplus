export default function OrgLoading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 flex h-14 items-center border-b border-stone-200 bg-white px-4 lg:hidden">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
      </div>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white lg:block">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-stone-200" />
            <div className="space-y-1">
              <div className="h-3 w-16 animate-pulse rounded bg-stone-200" />
              <div className="h-2 w-12 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
        </div>
      </aside>
      <main className="px-4 py-6 lg:ml-64 lg:px-8">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-stone-200" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="h-[320px] animate-pulse rounded-2xl bg-stone-200 lg:col-span-2" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-stone-200" />
        </div>
        <div className="mt-4 h-[320px] animate-pulse rounded-2xl bg-stone-200" />
      </main>
    </div>
  );
}
