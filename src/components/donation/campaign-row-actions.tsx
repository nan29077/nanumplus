"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CampaignRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();

  const remove = async () => {
    const res = await fetch(`/api/org/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/org/campaigns/${id}/edit`}
        className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50">
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> 수정
      </Link>
      <ConfirmDialog
        title="캠페인 삭제"
        description={`'${title}' 캠페인을 삭제할까요? 공개 페이지에서도 내려갑니다.`}
        onConfirm={remove}
        trigger={
          <button className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> 삭제
          </button>
        }
      />
    </div>
  );
}
