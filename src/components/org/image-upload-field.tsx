"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";

type Preset = { id: string; label: string; style: string; url: string };

export function ImageUploadField({
  label,
  description,
  value,
  onChange,
  kind,
  presets = [],
}: {
  label: string;
  description?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  kind: "hero" | "logo" | "story";
  presets?: readonly Preset[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const res = await fetch("/api/org/donation-page/upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error ?? "이미지 업로드에 실패했습니다.");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-stone-800">{label}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-stone-400">{description}</p>}
      </div>

      {presets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {presets.map((preset) => {
            const selected = value === preset.url;
            return (
              <button key={preset.id} type="button" onClick={() => onChange(preset.url)}
                className={`group overflow-hidden rounded-2xl border-2 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-brand-500 ring-2 ring-brand-100" : "border-stone-100"}`}>
                <span className="relative block aspect-[16/9] overflow-hidden bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  {selected && <span className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-[10px] font-bold text-white">선택됨</span>}
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block text-xs font-bold text-stone-800">{preset.label}</span>
                  <span className="mt-0.5 block text-[11px] text-stone-400">{preset.style}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <input value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}
            placeholder="이미지 URL을 입력하거나 파일을 첨부하세요"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500" />
          {value && (
            <button type="button" onClick={() => onChange(null)} aria-label="이미지 지우기"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "업로드 중" : "파일 첨부"}
        </button>
      </div>

      {value && (
        <div className={`overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 ${kind === "logo" ? "w-32" : "w-full"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="현재 선택 이미지" className={kind === "logo" ? "aspect-square w-full object-contain p-3" : "aspect-[16/5] w-full object-cover"} />
        </div>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
      <p className="flex items-center gap-1.5 text-[11px] text-stone-400"><ImagePlus className="h-3.5 w-3.5" /> JPG, PNG, WEBP, GIF · 최대 8MB</p>
    </div>
  );
}
