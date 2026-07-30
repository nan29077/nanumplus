import { cn } from "@/lib/utils";

export function DataTable({ headers, children, className }: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-card", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/60">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-stone-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}
