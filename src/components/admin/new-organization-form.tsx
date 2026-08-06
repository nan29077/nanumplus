"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { sanitizeSlug } from "@/lib/sanitize";

const field = "mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500";
const labelCls = "text-sm font-medium text-stone-700";

export function NewOrganizationForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", slug: "", description: "", address: "", phone: "", email: "",
    adminName: "", adminEmail: "", adminPassword: "", smsCode: "",
    bankName: "", bankAccount: "", bankHolder: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, smsCode: form.smsCode || undefined }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(b?.error ?? "등록 중 문제가 발생했습니다.");
        return;
      }
      const b = await res.json();
      router.push(`/admin/organizations/${b.organizationId}`);
      router.refresh();
    } catch {
      setError("네트워크 오류로 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900">기관 정보</h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="org-name" className={labelCls}>기관명 *</label>
              <input id="org-name" required value={form.name}
                onChange={(e) => { set("name", e.target.value); if (!form.slug) set("slug", sanitizeSlug(e.target.value)); }}
                placeholder="예: 따뜻한손길복지재단" className={field} />
            </div>
            <div>
              <label htmlFor="org-slug" className={labelCls}>후원 페이지 주소(slug) *</label>
              <div className="mt-1.5 flex items-center rounded-xl border border-stone-200 px-3 focus-within:border-brand-500">
                <span className="text-sm text-stone-400">/donate/</span>
                <input id="org-slug" required value={form.slug}
                  onChange={(e) => set("slug", sanitizeSlug(e.target.value))}
                  placeholder="warmhands" className="flex-1 bg-transparent py-2.5 pl-1 text-sm outline-none" />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="org-description" className={labelCls}>기관 소개</label>
            <textarea id="org-description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} className={field} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="org-address" className={labelCls}>주소</label>
              <input id="org-address" value={form.address} onChange={(e) => set("address", e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="org-phone" className={labelCls}>대표 전화</label>
              <input id="org-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="02-000-0000" className={field} />
            </div>
            <div>
              <label htmlFor="org-email" className={labelCls}>기관 이메일</label>
              <input id="org-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900">문자후원 번호 (선택)</h2>
        <p className="mt-1 text-sm text-stone-500">기본 번호 <b className="text-stone-700">#2540</b> 뒤에 붙는 4자리 숫자입니다. 나중에 부여할 수도 있습니다.</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600">#2540</span>
          <input value={form.smsCode}
            onChange={(e) => set("smsCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234" inputMode="numeric"
            className="w-32 rounded-xl border border-stone-200 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-brand-500" />
          {form.smsCode.length === 4 && (
            <span className="text-sm text-stone-500">→ 전체 번호 <b className="text-brand-700">#2540{form.smsCode}</b></span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900">정산 계좌 (선택)</h2>
        <p className="mt-1 text-sm text-stone-500">매월 16일 후원금 정산 시 사용할 계좌입니다. 나중에 기관 설정에서 입력할 수도 있습니다.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>은행명</label>
            <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
              placeholder="예: 국민은행" className={field} />
          </div>
          <div>
            <label className={labelCls}>계좌번호</label>
            <input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)}
              placeholder="000-00-000000" className={field} />
          </div>
          <div>
            <label className={labelCls}>예금주</label>
            <input value={form.bankHolder} onChange={(e) => set("bankHolder", e.target.value)}
              placeholder="기관명 또는 대표자명" className={field} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900">기관 관리자 계정</h2>
        <p className="mt-1 text-sm text-stone-500">이 계정으로 기관 관리자가 로그인하여 본인 기관 데이터를 관리합니다.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="admin-name" className={labelCls}>이름 *</label>
            <input id="admin-name" required value={form.adminName} onChange={(e) => set("adminName", e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="admin-email" className={labelCls}>이메일 *</label>
            <input id="admin-email" type="email" required value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="admin-password" className={labelCls}>초기 비밀번호 *</label>
            <input id="admin-password" type="password" required minLength={8} value={form.adminPassword}
              onChange={(e) => set("adminPassword", e.target.value)} placeholder="8자 이상" className={field} />
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()}
          className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">취소</button>
        <button type="submit" disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
          기관 등록
        </button>
      </div>
    </form>
  );
}
