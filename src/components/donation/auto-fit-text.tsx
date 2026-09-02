"use client";

import { useLayoutEffect, useRef } from "react";

type AutoFitTextProps = {
  as: "h1" | "p";
  children: string;
  className?: string;
  mobileMaxSize: number;
  desktopMaxSize: number;
  minSize?: number;
};

export function AutoFitText({
  as: Tag,
  children,
  className = "",
  mobileMaxSize,
  desktopMaxSize,
  minSize = 8,
}: AutoFitTextProps) {
  const textRef = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const fitText = () => {
      const maxSize = window.matchMedia("(min-width: 640px)").matches
        ? desktopMaxSize
        : mobileMaxSize;
      const availableWidth = element.clientWidth;

      if (!availableWidth) return;

      element.style.fontSize = `${maxSize}px`;

      if (element.scrollWidth <= availableWidth) return;

      let low = minSize;
      let high = maxSize;

      for (let i = 0; i < 12; i += 1) {
        const middle = (low + high) / 2;
        element.style.fontSize = `${middle}px`;

        if (element.scrollWidth <= availableWidth) low = middle;
        else high = middle;
      }

      element.style.fontSize = `${Math.max(minSize, low - 0.2)}px`;
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(element);
    window.addEventListener("resize", fitText);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitText);
    };
  }, [children, desktopMaxSize, minSize, mobileMaxSize]);

  return (
    <Tag ref={textRef} className={`w-full overflow-hidden whitespace-nowrap ${className}`}>
      {children}
    </Tag>
  );
}
