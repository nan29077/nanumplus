import Link from "next/link";
import {
  MessageSquare, Landmark, RefreshCw, QrCode, CalendarDays, BarChart3,
  ShieldCheck, Eye, Megaphone, HeartHandshake, CheckCircle2,
  Smartphone, FileSpreadsheet, Users, TrendingUp, Award, Globe,
  Trophy, Target, Lock, Zap, ArrowRight, Phone, Mail, MapPin,
  CheckCheck, Star, LayoutDashboard, PieChart, Download,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { HeroSlider } from "@/components/donation/hero-slider";
import { Faq } from "@/components/donation/faq";

const features = [
  { icon: MessageSquare, title: "문자후원", desc: "인포뱅크 문자후원 번호(#2540 + 기관 고유번호)로 문자 한 통이면 후원이 완료됩니다.", color: "bg-sky-50 text-sky-600" },
  { icon: Landmark, title: "간편 계좌이체", desc: "온기 간편 계좌이체로 복잡한 절차 없이 원하는 금액을 바로 후원할 수 있습니다.", color: "bg-brand-50 text-brand-600" },
  { icon: RefreshCw, title: "정기 계좌후원", desc: "매월 정해진 날짜에 자동 출금되는 정기후원으로 꾸준한 나눔을 이어갑니다.", color: "bg-amber-50 text-amber-600" },
  { icon: QrCode, title: "QR 코드 후원", desc: "기관별 전용 QR 코드를 스캔하면 후원 페이지로 바로 연결됩니다.", color: "bg-emerald-50 text-emerald-600" },
];

const reasons = [
  { icon: Eye, title: "투명한 후원금 관리", desc: "모든 후원 내역이 채널별·날짜별로 기록되어 언제든 확인할 수 있습니다." },
  { icon: BarChart3, title: "일별 · 월별 · 캘린더 통계", desc: "대시보드와 캘린더에서 모금 흐름을 한눈에 파악합니다." },
  { icon: Megaphone, title: "크라우드 모금 캠페인", desc: "기관이 직접 캠페인 페이지를 만들어 목표 금액을 향해 모금합니다." },
  { icon: ShieldCheck, title: "안전한 권한 관리", desc: "기관 관리자는 본인 기관 데이터만 접근하는 엄격한 권한 분리." },
  { icon: Users, title: "후원자 관리", desc: "후원자별 이력과 정기후원 여부를 관리하고 개인정보는 마스킹 처리합니다." },
  { icon: FileSpreadsheet, title: "리포트 다운로드", desc: "기간별 후원 내역을 CSV로 내려받아 회계·보고에 활용합니다." },
];

const impactStats = [
  { num: "120+", label: "등록 기관 (목표)", icon: Globe },
  { num: "8.5억+", label: "누적 모금액 (목표)", icon: TrendingUp },
  { num: "15,000+", label: "누적 후원자 (목표)", icon: Users },
  { num: "99.9%", label: "서비스 안정성 (목표)", icon: Award },
];

const testimonials = [
  {
    quote: "엑셀로 정리하던 후원 내역을 이제 대시보드 하나로 확인합니다. 특히 캘린더 통계가 너무 편해서 매일 아침 가장 먼저 봅니다.",
    name: "이정민",
    org: "서울시 은평구 종합사회복지관",
    role: "모금 담당자",
    initials: "이",
    color: "bg-brand-100 text-brand-700",
  },
  {
    quote: "문자후원 번호 하나로 지역 어르신들도 쉽게 참여하게 됐어요. 60~70대 후원자 비율이 눈에 띄게 늘었습니다.",
    name: "김수진",
    org: "경기도 수원시 노인복지센터",
    role: "복지 담당자",
    initials: "김",
    color: "bg-amber-100 text-amber-700",
  },
  {
    quote: "크라우드 캠페인으로 겨울 나눔 행사를 진행했는데 목표 금액의 120%를 달성했습니다. 공유 URL 하나로 SNS 확산이 정말 쉬웠어요.",
    name: "박준호",
    org: "부산 동구 지역자활센터",
    role: "센터장",
    initials: "박",
    color: "bg-sky-100 text-sky-700",
  },
  {
    quote: "이전에는 정기후원자를 스프레드시트로 관리했는데 누락이 잦았어요. 나눔플러스으로 바꾼 후 정기후원 유지율이 20% 이상 올랐습니다.",
    name: "최은영",
    org: "대전 중구 아동가족지원센터",
    role: "팀장",
    initials: "최",
    color: "bg-rose-100 text-rose-700",
  },
];

const channelCompare = [
  { feature: "후원자 편의성", sms: "매우 높음 (문자 한 통)", easy: "높음 (금액 입력만)", recurring: "높음 (최초 설정 후 자동)" },
  { feature: "참여 장벽", sms: "없음", easy: "매우 낮음", recurring: "낮음 (초기 설정 필요)" },
  { feature: "금액 유연성", sms: "고정 금액", easy: "자유 금액", recurring: "고정 금액" },
  { feature: "연속 기부", sms: "불가 (1회성)", easy: "불가 (1회성)", recurring: "가능 (자동 월납)" },
  { feature: "기관 통계 제공", sms: "실시간 자동", easy: "실시간 자동", recurring: "실시간 자동" },
];

const donateSteps = [
  { title: "후원 방법 선택", desc: "문자후원, 간편 계좌이체, 정기후원 중 원하는 방법을 고릅니다." },
  { title: "후원 진행", desc: "문자 한 통 또는 간단한 정보 입력으로 후원이 완료됩니다." },
  { title: "후원 기록 확인", desc: "후원 내역이 기관 대시보드에 실시간으로 기록됩니다." },
  { title: "변화 함께 보기", desc: "캠페인 페이지에서 모금 달성률과 사용 계획을 확인합니다." },
];

const onboardSteps = [
  { title: "기관 등록 신청", desc: "기관 정보를 제출하면 최고 관리자가 계정을 생성합니다." },
  { title: "문자후원 번호 부여", desc: "#2540 뒤 4자리 고유 번호가 기관에 부여됩니다." },
  { title: "QR 코드 발급", desc: "기관 전용 후원 QR 코드가 자동 발급됩니다." },
  { title: "모금 시작", desc: "후원 페이지와 캠페인으로 바로 모금을 시작합니다." },
];

const trustBadges = [
  { icon: Lock, label: "SSL 암호화", sub: "전 구간 보안 통신" },
  { icon: ShieldCheck, label: "개인정보 보호", sub: "마스킹·최소 수집" },
  { icon: CheckCheck, label: "실시간 집계", sub: "지연 없는 후원 반영" },
  { icon: Zap, label: "99.9% 업타임", sub: "연중무휴 안정 운영" },
  { icon: FileSpreadsheet, label: "회계 연동", sub: "CSV 리포트 제공" },
  { icon: Star, label: "전담 CS", sub: "기관 전용 고객 지원" },
];

const dashboardStats = [
  { label: "이번 달 모금액", value: "₩12,450,000", change: "+18%", positive: true },
  { label: "오늘 후원 건수", value: "47건", change: "+5건", positive: true },
  { label: "정기후원자", value: "312명", change: "+12명", positive: true },
  { label: "진행 중 캠페인", value: "3개", change: null, positive: null },
];

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{title}</h2>
      {desc && <p className="mt-3 text-stone-500">{desc}</p>}
    </div>
  );
}

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <PublicHeader />
      <main>
        {/* 상단 메인 배너 슬라이더 */}
        <HeroSlider />

        {/* 임팩트 숫자 */}
        <section className="bg-brand-700 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
              {impactStats.map((s) => (
                <div key={s.label}>
                  <s.icon className="mx-auto mb-2 h-6 w-6 text-brand-300" strokeWidth={1.5} />
                  <p className="text-3xl font-extrabold text-white sm:text-4xl">{s.num}</p>
                  <p className="mt-1 text-sm font-medium text-brand-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 신뢰 지표 배지 */}
        <section className="border-b border-stone-100 bg-white py-8">
          <div className="mx-auto max-w-6xl px-4">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
              전국 120여 사회복지기관이 신뢰하는 플랫폼 (목표)
            </p>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex flex-col items-center text-center">
                  <span className="mb-1.5 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <b.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <p className="text-xs font-semibold text-stone-800">{b.label}</p>
                  <p className="text-[11px] text-stone-400">{b.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 서비스 소개 */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionTitle
            eyebrow="후원 채널"
            title="후원의 시작부터 보고까지, 한 곳에서"
            desc="나눔플러스은 사회복지기관이 온라인으로 후원금을 모금하고 투명하게 관리할 수 있도록 돕는 플랫폼입니다."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                id={f.title === "문자후원" ? "sms" : undefined}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card transition-shadow hover:shadow-lg"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-semibold text-stone-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 채널 비교 표 */}
        <section className="bg-warm-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="채널 비교"
              title="후원 채널별 특징 한눈에 비교"
              desc="기관 특성과 후원자 구성에 맞는 채널을 선택하거나 모두 함께 운영할 수 있습니다."
            />
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[600px] rounded-2xl border border-stone-200 bg-white shadow-card">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-stone-500">항목</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-sky-600">
                      <MessageSquare className="mx-auto mb-0.5 h-4 w-4" strokeWidth={2} />문자후원
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-brand-600">
                      <Landmark className="mx-auto mb-0.5 h-4 w-4" strokeWidth={2} />간편 계좌이체
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-amber-600">
                      <RefreshCw className="mx-auto mb-0.5 h-4 w-4" strokeWidth={2} />정기후원
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelCompare.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-stone-50/50" : ""}>
                      <td className="px-5 py-3 text-xs font-medium text-stone-700">{row.feature}</td>
                      <td className="px-5 py-3 text-center text-xs text-stone-600">{row.sms}</td>
                      <td className="px-5 py-3 text-center text-xs text-stone-600">{row.easy}</td>
                      <td className="px-5 py-3 text-center text-xs text-stone-600">{row.recurring}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 문자후원 안내 */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-brand-600">문자후원</p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
                문자 한 통이 만드는<br />가장 가까운 나눔
              </h2>
              <p className="mt-4 leading-relaxed text-stone-500">
                기관마다 <strong className="text-stone-800">#2540 + 고유 4자리</strong> 문자후원 번호가 부여됩니다.
                후원자는 해당 번호로 문자를 보내는 것만으로 후원에 참여할 수 있고,
                모든 문자후원 내역은 기관 대시보드에 자동으로 기록됩니다.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-stone-600">
                {[
                  "기관별 고유 번호로 후원금이 정확히 전달",
                  "휴대폰 요금에 합산되어 간편하게 참여",
                  "일별 · 월별 문자후원 통계 자동 집계",
                  "스마트폰 없이 피처폰으로도 후원 가능",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={1.75} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-3xl border border-stone-200 bg-white p-6 shadow-card">
              <div className="flex items-center gap-2 text-stone-400">
                <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs">새 메시지</span>
              </div>
              <div className="mt-4 rounded-2xl bg-stone-50 p-4">
                <p className="text-xs text-stone-400">받는 사람</p>
                <p className="mt-1 text-lg font-bold tracking-wide text-brand-700">#2540 1234</p>
              </div>
              <div className="mt-3 rounded-2xl rounded-br-sm bg-brand-600 p-4 text-sm text-white">
                후원합니다 ♥
              </div>
              <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                <p className="text-xs font-semibold text-emerald-700">✓ 후원이 완료되었습니다</p>
                <p className="mt-0.5 text-[11px] text-emerald-600">대시보드에 실시간 반영</p>
              </div>
            </div>
          </div>
        </section>

        {/* 간편 계좌이체 / 정기후원 안내 */}
        <section className="bg-warm-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="계좌 후원"
              title="간편 계좌이체와 정기후원"
              desc="온기 간편 계좌이체로 일시 후원을, 정기 계좌후원으로 꾸준한 나눔을 이어갈 수 있습니다."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Landmark className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">간편 계좌이체</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  복잡한 가입 절차 없이 이름과 금액만 입력하면 계좌이체 후원이 완료됩니다.
                  금액 제한 없이 원하는 만큼 후원할 수 있습니다.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-stone-500">
                  {["가입 없이 즉시 후원", "1천원~수백만원 자유 금액", "이체 즉시 기관에 통보"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />{t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <RefreshCw className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">정기 계좌후원</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  매월 원하는 날짜에 자동으로 출금되는 정기후원입니다.
                  기관은 정기후원자 현황을 한눈에 관리할 수 있습니다.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-stone-500">
                  {["한 번 설정으로 매월 자동 기부", "출금일·금액 유연하게 설정", "정기후원자 전용 관리 현황"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 대시보드 미리보기 */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionTitle
            eyebrow="대시보드 미리보기"
            title="모든 후원 현황을 한 화면에서"
            desc="기관 관리자는 로그인 직후 핵심 지표와 통계를 한눈에 확인할 수 있습니다."
          />
          <div className="mt-12 overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-xl sm:p-6">
            {/* 가짜 대시보드 UI */}
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600">
                <HeartHandshake className="h-4 w-4 text-white" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-bold text-stone-900">나눔플러스 관리자</span>
              <span className="ml-auto text-xs text-stone-400">서울 은평구 종합사회복지관</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {dashboardStats.map((s) => (
                <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-medium text-stone-500">{s.label}</p>
                  <p className="mt-1.5 text-lg font-bold text-stone-900">{s.value}</p>
                  {s.change && (
                    <p className={`mt-0.5 text-[11px] font-semibold ${s.positive ? "text-emerald-600" : "text-rose-500"}`}>
                      {s.change}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {/* 가짜 라인 차트 */}
              <div className="col-span-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold text-stone-700">최근 30일 일별 모금액</p>
                <svg viewBox="0 0 320 80" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f8ef7" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,60 C20,55 40,50 60,40 C80,30 100,45 120,35 C140,25 160,30 180,20 C200,10 220,25 240,15 C260,5 280,20 320,10" stroke="#4f8ef7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M0,60 C20,55 40,50 60,40 C80,30 100,45 120,35 C140,25 160,30 180,20 C200,10 220,25 240,15 C260,5 280,20 320,10 L320,80 L0,80 Z" fill="url(#chartGrad)" />
                </svg>
              </div>
              {/* 가짜 도넛 */}
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold text-stone-700">채널별 비중</p>
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="h-20 w-20">
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#e7efff" strokeWidth="14" />
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#4f8ef7" strokeWidth="14" strokeDasharray="88 88" strokeDashoffset="0" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#f59e0b" strokeWidth="14" strokeDasharray="44 132" strokeDashoffset="-88" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#38bdf8" strokeWidth="14" strokeDasharray="44 132" strokeDashoffset="-132" transform="rotate(-90 40 40)" />
                  </svg>
                </div>
                <div className="mt-1 space-y-1">
                  {[
                    { label: "문자후원", color: "bg-sky-400" },
                    { label: "계좌이체", color: "bg-brand-500" },
                    { label: "정기후원", color: "bg-amber-400" },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5 text-[11px] text-stone-500">
                      <span className={`h-2 w-2 rounded-sm ${c.color}`} />{c.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 사회복지기관이 사용하는 이유 */}
        <section className="bg-warm-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="기관을 위한 기능"
              title="사회복지기관이 나눔플러스을 사용하는 이유"
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reasons.map((r) => (
                <div key={r.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <r.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-3 font-semibold text-stone-900">{r.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 크라우드 캠페인 기능 소개 */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-brand-600">캠페인 모금</p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
                목표를 세우고,<br />함께 달성하는 크라우드 모금
              </h2>
              <p className="mt-4 leading-relaxed text-stone-500">
                기관이 직접 모금 캠페인을 개설하고 목표 금액을 설정할 수 있습니다.
                캠페인 URL을 SNS에 공유하면 누구나 참여 현황을 확인하고
                후원 방법을 선택해 기여할 수 있습니다.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-stone-600">
                {[
                  "캠페인별 목표 금액 설정 및 달성률 표시",
                  "SNS 공유용 전용 URL 자동 생성",
                  "캠페인 종료 후 실적 리포트 제공",
                  "다수 캠페인 동시 운영 가능",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={1.75} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/campaigns"
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                진행 중인 캠페인 보기 <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
            {/* 가짜 캠페인 카드 */}
            <div className="space-y-4">
              {[
                { title: "겨울 나눔 따뜻한 한 끼", goal: 5000000, current: 4250000, pct: 85, days: 3 },
                { title: "독거노인 방한용품 지원", goal: 3000000, current: 3120000, pct: 104, days: 0 },
                { title: "아동 장학 지원 캠페인", goal: 8000000, current: 2640000, pct: 33, days: 21 },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-stone-900">{c.title}</p>
                    {c.pct >= 100 ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">달성 ✓</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">D-{c.days}</span>
                    )}
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${c.pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                      style={{ width: `${Math.min(c.pct, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-stone-800">
                      {c.current.toLocaleString("ko-KR")}원
                    </span>
                    <span>{c.pct}% · 목표 {(c.goal / 10000).toLocaleString("ko-KR")}만원</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 기관 담당자 후기 */}
        <section className="bg-warm-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="현장의 목소리"
              title="기관 담당자가 직접 전하는 나눔플러스 이야기"
              desc="전국 사회복지기관 담당자들이 나눔플러스으로 변화된 모금 경험을 나눕니다."
            />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {testimonials.map((t) => (
                <div key={t.name} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
                  <StarRating />
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-stone-600">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${t.color}`}>
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {t.name}{" "}
                        <span className="font-normal text-stone-500">· {t.role}</span>
                      </p>
                      <p className="text-xs text-stone-400">{t.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QR + 캘린더 소개 */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-900">6월 후원 캘린더</p>
                  <div className="flex gap-2 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />문자</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-400" />이체</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />정기</span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["일","월","화","수","목","금","토"].map((w, i) => (
                    <div key={w} className={`py-1 text-[10px] font-semibold ${i===0?"text-rose-400":i===6?"text-sky-500":"text-stone-400"}`}>{w}</div>
                  ))}
                  {Array.from({ length: 6 }, () => null).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: 30 }).map((_, i) => {
                    const heat = [3, 7, 10, 14, 17, 20, 24, 27].includes(i) ? "bg-brand-500 text-white" :
                                 [2, 8, 15, 22].includes(i) ? "bg-brand-200 text-brand-800" :
                                 [5, 11, 18, 25].includes(i) ? "bg-brand-100 text-brand-700" : "bg-stone-50 text-stone-300";
                    return (
                      <div key={i} className={`grid aspect-square place-items-center rounded-lg text-[10px] font-medium ${heat}`}>
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold text-brand-600">통계와 캘린더</p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
                날짜를 누르면 보이는<br />그날의 모든 후원
              </h2>
              <p className="mt-4 leading-relaxed text-stone-500">
                월간 캘린더에서 날짜별 모금액을 확인하고, 날짜를 클릭하면
                문자후원·계좌이체·정기후원이 구분된 상세 내역이 펼쳐집니다.
                오늘, 최근 7일, 이번 달, 직접 선택한 기간까지 자유롭게 통계를 조회하세요.
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  { icon: CalendarDays, text: "월별 히트맵으로 모금 흐름 한눈에 파악" },
                  { icon: BarChart3, text: "채널별·기간별 비교 통계 제공" },
                  { icon: Download, text: "조회 기간 후원 내역 CSV 다운로드" },
                  { icon: PieChart, text: "채널 비중 도넛 차트 실시간 반영" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5 text-sm text-stone-600">
                    <item.icon className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={1.75} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 후원 진행 프로세스 / 기관 도입 프로세스 */}
        <section id="process" className="bg-warm-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold text-stone-900">후원 진행 프로세스</h2>
                <p className="mt-1 text-sm text-stone-500">후원자가 후원을 결정한 순간부터 기록까지</p>
                <ol className="mt-6 space-y-4">
                  {donateSteps.map((s, i) => (
                    <li key={s.title} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-900">{s.title}</p>
                        <p className="mt-0.5 text-sm text-stone-500">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">기관 도입 프로세스</h2>
                <p className="mt-1 text-sm text-stone-500">신청부터 모금 시작까지 최소 1영업일</p>
                <ol className="mt-6 space-y-4">
                  {onboardSteps.map((s, i) => (
                    <li key={s.title} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-800 text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-900">{s.title}</p>
                        <p className="mt-0.5 text-sm text-stone-500">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20">
          <div className="mx-auto max-w-3xl px-4">
            <SectionTitle eyebrow="FAQ" title="자주 묻는 질문" />
            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>

        {/* 도입 문의 연락처 */}
        <section className="bg-warm-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="도입 문의"
              title="우리 기관에도 나눔플러스을 도입하고 싶으신가요?"
              desc="담당자가 직접 연락드려 무료 데모와 도입 절차를 안내해 드립니다."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Phone, label: "전화 문의", value: "문의처 업데이트 예정", sub: "평일 09:00~18:00" },
                { icon: Mail, label: "이메일 문의", value: "hello@onjeong.kr", sub: "24시간 접수 가능" },
                { icon: MapPin, label: "소재지", value: "서울특별시 마포구", sub: "방문 상담 가능" },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <c.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-stone-500">{c.label}</p>
                    <p className="mt-0.5 font-semibold text-stone-900">{c.value}</p>
                    <p className="text-xs text-stone-400">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 하단 CTA */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-700">
            <div className="grid items-center gap-0 lg:grid-cols-5">
              <div className="px-8 py-14 text-center lg:col-span-3 lg:text-left">
                <HeartHandshake className="mx-auto mb-4 h-10 w-10 text-brand-200 lg:mx-0" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  우리 기관의 모금, 오늘부터 투명하게
                </h2>
                <p className="mt-3 text-brand-100">
                  문자후원 번호 부여부터 QR 코드 발급, 캠페인 운영까지 나눔플러스이 함께합니다.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link
                    href="/login"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    기관 로그인
                  </Link>
                  <Link
                    href="/campaigns"
                    className="rounded-xl border border-brand-400 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    진행 중인 캠페인 보기
                  </Link>
                </div>
              </div>
              <div className="hidden border-l border-brand-600 px-8 py-14 lg:col-span-2 lg:block">
                <p className="text-sm font-semibold text-brand-200">나눔플러스 도입 기관 현황 (예시)</p>
                <ul className="mt-4 space-y-3">
                  {[
                    { region: "서울·경기", count: "48개 기관" },
                    { region: "부산·경남", count: "22개 기관" },
                    { region: "대전·충청", count: "18개 기관" },
                    { region: "광주·전라", count: "17개 기관" },
                    { region: "기타 지역", count: "15개 기관" },
                  ].map((r) => (
                    <li key={r.region} className="flex items-center justify-between">
                      <span className="text-sm text-brand-200">{r.region}</span>
                      <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
