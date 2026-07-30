"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "문자후원은 어떻게 참여하나요?", a: "각 기관에 부여된 문자후원 번호(예: #25401234)로 문자를 보내면 후원이 완료됩니다. 후원금은 휴대폰 요금에 합산 청구됩니다." },
  { q: "간편 계좌이체 후원에 수수료가 있나요?", a: "후원자에게 별도 수수료가 부과되지 않습니다. 결제 처리 비용 정책은 기관별 계약에 따라 다를 수 있습니다." },
  { q: "정기후원은 언제 출금되나요?", a: "신청 시 선택한 매월 출금일(1~28일)에 자동으로 출금됩니다. 출금일은 언제든 변경할 수 있습니다." },
  { q: "후원 내역은 어디서 확인하나요?", a: "기관 관리자는 대시보드에서 일별·월별·캘린더 형태로 모든 후원 내역을 확인할 수 있습니다. 후원자는 기관에 문의해 후원 내역을 확인할 수 있습니다." },
  { q: "기관 도입은 어떻게 신청하나요?", a: "플랫폼 운영팀에 기관 정보를 제출하면 최고 관리자가 기관 계정을 생성하고 문자후원 번호와 QR 코드를 발급합니다." },
  { q: "개인정보는 안전하게 관리되나요?", a: "후원자 연락처와 이메일은 목록에서 마스킹 처리되며, 개인정보 수집 동의 여부를 기록·관리합니다. 모든 관리자 행위는 감사 로그로 남습니다." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-3">
      {faqs.map((f, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            aria-expanded={open === i}
          >
            <span className="text-sm font-semibold text-stone-900">{f.q}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-stone-400 transition-transform", open === i && "rotate-180")} strokeWidth={1.75} />
          </button>
          {open === i && (
            <p className="border-t border-stone-100 px-5 py-4 text-sm leading-relaxed text-stone-500">{f.a}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
