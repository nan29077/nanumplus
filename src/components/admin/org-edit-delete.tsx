"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface OrgEditDeleteProps {
  orgId: string;
  initialName: string;
  initialEmail: string | null;
  initialPhone: string | null;
  initialAddress: string | null;
  initialDescription: string | null;
  initialIsActive: boolean;
}

export function OrgEditDelete({
  orgId,
  initialName,
  initialEmail,
  initialPhone,
  initialAddress,
  initialDescription,
  initialIsActive,
}: OrgEditDeleteProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isActive, setIsActive] = useState(initialIsActive);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          description: description.trim() || null,
          isActive,
        }),
      });
      // 서버가 JSON이 아닌 오류 페이지를 반환해도 안전하게 처리
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "수정 실패"); return; }
      setEditOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return; // 더블클릭으로 DELETE가 중복 호출되지 않도록
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/organizations");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "삭제 실패");
      }
    } catch {
      alert("네트워크 오류로 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6 flex gap-2">
      <button
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} /> 기관 정보 수정
      </button>

      <ConfirmDialog
        title="기관 삭제"
        description={`'${initialName}' 기관을 삭제할까요? 삭제 후에는 복구할 수 없습니다.`}
        onConfirm={handleDelete}
        trigger={
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" strokeWidth={1.75} /> 기관 삭제
          </button>
        }
      />

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">기관 정보 수정</h2>
              <button onClick={() => setEditOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="기관명 *">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="이메일">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" />
              </Field>
              <Field label="전화번호">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </Field>
              <Field label="주소">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </Field>
              <Field label="설명">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-brand-600" />
                운영 중 (활성화)
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Check className="h-4 w-4" strokeWidth={2} />
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:border-brand-400 focus:outline-none";
