"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  {
    title: "작은 후원이 만드는\n가장 따뜻한 변화",
    desc: "문자 한 통, 계좌이체 한 번이 누군가의 하루를 바꿉니다. 지금 바로 우리 동네 사회복지기관을 후원해 보세요.",
    cta: { label: "캠페인 둘러보기", href: "/campaigns" },
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&auto=format&fit=crop&q=80",
    overlay: "from-brand-900/80 via-brand-800/60 to-brand-700/20",
  },
  {
    title: "사회복지기관을 위한\n투명한 모금 관리",
    desc: "모든 후원 내역이 일별·월별·캘린더로 기록됩니다. 기관과 후원자가 함께 믿을 수 있는 모금 환경을 만듭니다.",
    cta: { label: "기관 로그인", href: "/login" },
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&auto=format&fit=crop&q=80",
    overlay: "from-stone-900/80 via-stone-800/60 to-stone-700/20",
  },
  {
    title: "문자후원과 간편 계좌이체를\n한 곳에서",
    desc: "인포뱅크 문자후원(#2540)과 온기 간편 계좌이체·정기후원까지, 후원의 모든 방법을 하나의 플랫폼에서 관리하세요.",
    cta: { label: "후원 방법 알아보기", href: "/#sms" },
    image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1600&auto=format&fit=crop&q=80",
    overlay: "from-sky-900/80 via-sky-800/60 to-sky-700/20",
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
            className="relative min-w-full px-4 py-28 sm:py-40"
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
              <h1 className="whitespace-pre-line text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-5xl">
                {s.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 drop-shadow sm:text-lg">
                {s.desc}
              </p>
              <Link
                href={s.cta.href}
                className="mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-stone-900 shadow hover:bg-stone-100"
                tabIndex={i === idx ? 0 : -1}
              >
                {s.cta.label}
              </Link>
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
