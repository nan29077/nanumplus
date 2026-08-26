"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";

export function QRCodeCard({
  imageDataUrl,
  targetUrl,
  orgName,
  regenerateEndpoint,
}: {
  imageDataUrl: string | null;
  targetUrl: string;
  orgName: string;
  /** 재발급 POST 엔드포인트. 없으면 재발급 버튼 숨김. */
  regenerateEndpoint?: string;
}) {
  const router = useRouter();
  const [img, setImg] = useState(imageDataUrl);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = `${orgName}_후원QR.png`;
    a.click();
  };

  const regenerate = async () => {
    if (!regenerateEndpoint) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(regenerateEndpoint, { method: "POST" });
      if (!res.ok) {
        setError("QR 재발급에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const b = await res.json();
      setImg(b.imageDataUrl);
      router.refresh();
    } catch {
      setError("네트워크 오류로 QR 재발급에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="mx-auto">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={`${orgName} 후원 QR 코드`}
              className="h-48 w-48 rounded-2xl border border-stone-100" />
          ) : (
            <div className="grid h-48 w-48 place-items-center rounded-2xl border border-dashed border-stone-300 px-4 text-center">
              <div>
                <p className="text-sm font-medium text-stone-500">QR코드 미등록</p>
                <p className="mt-1 text-xs text-stone-400">
                  {regenerateEndpoint
                    ? "아래 재발급 버튼을 눌러 QR 코드를 생성해 주세요."
                    : "최고 관리자에게 QR 코드 발급을 요청해 주세요."}
                </p>
              </div>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-stone-900">후원 QR 코드</h3>
          <p className="mt-1 text-sm text-stone-500">
            이 QR 코드를 인쇄물·현수막·온라인에 배치하면, 스캔 시 {orgName} 후원 페이지로 바로 연결됩니다.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
            <span className="flex-1 truncate text-sm text-stone-600">{targetUrl}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(targetUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={download} disabled={!img}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              <Download className="h-4 w-4" strokeWidth={1.75} /> PNG 다운로드
            </button>
            <a href={targetUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> 후원 페이지 열기
            </a>
            {regenerateEndpoint && (
              <button onClick={regenerate} disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} strokeWidth={1.75} /> 재발급
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
