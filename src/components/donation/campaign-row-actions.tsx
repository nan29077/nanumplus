"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CampaignRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  const remove = async () => {
    setError("");
    try {
      const res = await fetch(`/api/org/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const b = await res.json().catch(() => null);
        setError(b?.error ?? "삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setError("네트워크 오류로 삭제에 실패했습니다.");
    }
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
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
