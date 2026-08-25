"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  {
    eyebrow: "나눔이 일상이 되는 곳",
    title: "마음을 나누면,\n내일은 더 따뜻해집니다",
    desc: "가까운 이웃을 향한 작은 마음이 한 사람의 든든한 오늘이 됩니다. 나눔플러스와 함께 따뜻한 변화를 시작해 보세요.",
    cta: { label: "우리 동네 기관 만나기", href: "/#organizations" },
    secondaryCta: { label: "캠페인 둘러보기", href: "/#campaigns" },
    image: "/images/hero/nanum-community-care.jpg",
    overlay: "from-[#302015]/95 via-[#493323]/72 to-[#493323]/10",
  },
  {
    eyebrow: "함께 키우는 좋은 변화",
    title: "한 사람의 마음이 모여\n우리 동네의 희망이 됩니다",
    desc: "아이부터 어르신까지, 도움이 필요한 이웃 곁을 지키는 기관들의 이야기를 만나고 응원해 주세요.",
    cta: { label: "참여 기관 살펴보기", href: "/#organizations" },
    secondaryCta: { label: "나눔 방법 알아보기", href: "/#sms" },
    image: "/images/hero/nanum-growing-together.jpg",
    overlay: "from-[#553828]/90 via-[#70513b]/55 to-transparent",
  },
  {
    eyebrow: "투명하게 잇는 마음",
    title: "당신의 따뜻한 마음,\n꼭 필요한 곳에 닿도록",
    desc: "문자후원부터 간편 계좌이체, 정기후원까지. 나눔의 모든 순간을 쉽고 투명하게 연결합니다.",
    cta: { label: "진행 중인 캠페인", href: "/campaigns" },
    secondaryCta: { label: "기관 로그인", href: "/login" },
    image: "/images/hero/nanum-heart-hands.jpg",
    overlay: "from-[#2e2118]/95 via-[#49382b]/66 to-[#49382b]/10",
  },
];

export function HeroSlider() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const move = (d: number) => setIdx((i) => (i + d + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden" aria-roledescription="carousel" aria-label="메인 배너">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className="relative min-w-full px-4 py-24 sm:py-36 lg:py-40"
            style={{
              backgroundImage: `url(${s.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden={i !== idx}
          >
            {/* 텍스트 가독성을 위한 어두운 오버레이 */}
            <div className={cn("absolute inset-0 bg-gradient-to-r", s.overlay)} />
            <div className="relative mx-auto max-w-6xl">
              <p className="mb-4 text-sm font-semibold tracking-[0.18em] text-amber-100 sm:text-base">
                {s.eyebrow}
              </p>
              <h1 className="whitespace-pre-line text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-5xl">
                {s.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 drop-shadow sm:text-lg">
                {s.desc}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={s.cta.href}
                  className="rounded-full bg-[#f7eee1] px-6 py-3 text-sm font-semibold text-[#4b3525] shadow-lg transition hover:-translate-y-0.5 hover:bg-white"
                  tabIndex={i === idx ? 0 : -1}
                >
                  {s.cta.label}
                </Link>
                <Link
                  href={s.secondaryCta.href}
                  className="rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                  tabIndex={i === idx ? 0 : -1}
                >
                  {s.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => move(-1)}
        aria-label="이전 배너"
        className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30 sm:grid"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <button
        onClick={() => move(1)}
        aria-label="다음 배너"
        className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30 sm:grid"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === idx ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
            )}
          />
        ))}
      </div>
    </section>
  );
}
