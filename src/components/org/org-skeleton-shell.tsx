/**
 * 기관 화면 로딩 스켈레톤 공통 껍데기 (상단바 + 사이드바 자리).
 * /org 하위 loading.tsx들이 동일한 레이아웃 위에 본문 스켈레톤만 바꿔 끼운다.
 */
export function OrgSkeletonShell({ children }: { children: React.ReactNode }) {
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
      <main className="px-4 py-6 lg:ml-64 lg:px-8">{children}</main>
    </div>
  );
}

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className}`} />;
}
