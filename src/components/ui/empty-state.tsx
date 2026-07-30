import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
        <Inbox className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-sm font-medium text-stone-700">{title}</p>
      {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
    </div>
  );
}

export function LoadingState({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-stone-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
