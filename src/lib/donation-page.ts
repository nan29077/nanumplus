/**
 * 후원페이지 빌더 — 설정 해석/기본값.
 * DonationPage(Prisma) 의 JSON 문자열 필드를 안전하게 파싱하고 기본값을 채운다.
 * (Prisma 생성 타입에 의존하지 않도록 입력 타입을 로컬로 정의한다.)
 */

export type DonationChannelKey =
  | "SMS"
  | "EASY_TRANSFER"
  | "RECURRING_TRANSFER"
  | "RECURRING_CARD";

export const ALL_CHANNELS: DonationChannelKey[] = [
  "SMS",
  "EASY_TRANSFER",
  "RECURRING_TRANSFER",
  "RECURRING_CARD",
];

export const CHANNEL_META: Record<
  DonationChannelKey,
  { label: string; short: string; desc: string }
> = {
  SMS: { label: "문자후원", short: "문자", desc: "#2540 번호로 문자 한 통 (모바일 전용)" },
  EASY_TRANSFER: { label: "간편 계좌이체", short: "계좌이체", desc: "핵토 내통장결제로 즉시 이체" },
  RECURRING_TRANSFER: { label: "정기 계좌후원", short: "정기이체", desc: "매월 자동이체" },
  RECURRING_CARD: { label: "신용카드 정기후원", short: "카드정기", desc: "핵토 빌링키 자동결제" },
};

export const DEFAULT_SUGGESTED_AMOUNTS = [10000, 30000, 50000, 100000];
export const DEFAULT_THEME_COLOR = "#2f8f5b";

export const DONATION_BANNER_PRESETS = [
  {
    id: "warm-care",
    label: "따뜻한 돌봄",
    style: "실사진",
    url: "/images/donation-banners/warm-care-photo.webp",
  },
  {
    id: "children-learning",
    label: "아이들의 배움",
    style: "실사진",
    url: "/images/donation-banners/children-learning-photo.webp",
  },
  {
    id: "community-meal",
    label: "이웃의 한 끼",
    style: "실사진",
    url: "/images/donation-banners/community-meal-photo.webp",
  },
  {
    id: "sharing-village",
    label: "나눔 마을",
    style: "3D 애니메이션",
    url: "/images/donation-banners/sharing-village-animation.webp",
  },
  {
    id: "community-garden",
    label: "함께 키우는 변화",
    style: "수채화 일러스트",
    url: "/images/donation-banners/community-garden-illustration.webp",
  },
] as const;

/** 기관마다 같은 배너가 몰리지 않도록 안정적인 기본 배너를 선택한다. */
export function getDefaultDonationBanner(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return DONATION_BANNER_PRESETS[hash % DONATION_BANNER_PRESETS.length].url;
}

export type StoryBlock =
  | { type: "text"; heading?: string; body: string }
  | { type: "image"; imageUrl: string; caption?: string }
  | { type: "quote"; body: string; author?: string };

export type LinkButtonType = "home" | "instagram" | "youtube" | "facebook" | "blog" | "kakao" | "x" | "link";
export type LinkButton = { label: string; url: string; type: LinkButtonType };
export const LINK_TYPES: LinkButtonType[] = ["home", "instagram", "youtube", "facebook", "blog", "kakao", "x", "link"];
export const LINK_TYPE_LABELS: Record<LinkButtonType, string> = {
  home: "홈페이지",
  instagram: "인스타그램",
  youtube: "유튜브",
  facebook: "페이스북",
  blog: "네이버 블로그",
  kakao: "카카오채널",
  x: "X(트위터)",
  link: "기타 링크",
};
export const LINK_TYPE_BUTTON_LABELS: Record<LinkButtonType, string> = {
  home: "홈페이지 바로가기",
  instagram: "인스타그램 바로가기",
  youtube: "유튜브 바로가기",
  facebook: "페이스북 바로가기",
  blog: "네이버 블로그 바로가기",
  kakao: "카카오채널 바로가기",
  x: "X 바로가기",
  link: "링크 바로가기",
};

export type DonationPageConfig = {
  themeColor: string;
  heroImageUrl: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  logoUrl: string | null;
  links: LinkButton[];
  introTitle: string | null;
  introBody: string | null;
  blocks: StoryBlock[];
  suggestedAmounts: number[];
  enabledChannels: DonationChannelKey[];
  thankYouTitle: string | null;
  thankYouMessage: string | null;
  showStats: boolean;
  showCampaigns: boolean;
  showFaq: boolean;
  showSmsFeed: boolean;
  isPublished: boolean;
};

/** DonationPage 행에서 필요한 필드만 받는 로컬 입력 타입 */
export type DonationPageRow = {
  themeColor?: string | null;
  heroImageUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  logoUrl?: string | null;
  links?: string | null;
  introTitle?: string | null;
  introBody?: string | null;
  blocks?: string | null;
  suggestedAmounts?: string | null;
  enabledChannels?: string | null;
  thankYouTitle?: string | null;
  thankYouMessage?: string | null;
  showStats?: boolean | null;
  showCampaigns?: boolean | null;
  showFaq?: boolean | null;
  showSmsFeed?: boolean | null;
  isPublished?: boolean | null;
};

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const v = JSON.parse(json);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function normalizeChannels(input: unknown): DonationChannelKey[] {
  if (!Array.isArray(input)) return [...ALL_CHANNELS];
  const set = new Set(ALL_CHANNELS as string[]);
  const out = input.filter((c): c is DonationChannelKey => typeof c === "string" && set.has(c));
  return out.length ? out : [...ALL_CHANNELS];
}

function normalizeAmounts(input: unknown): number[] {
  if (!Array.isArray(input)) return [...DEFAULT_SUGGESTED_AMOUNTS];
  const out = input
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 1000 && n <= 100_000_000)
    .slice(0, 8);
  return out.length ? out : [...DEFAULT_SUGGESTED_AMOUNTS];
}

function normalizeBlocks(input: unknown): StoryBlock[] {
  if (!Array.isArray(input)) return [];
  const out: StoryBlock[] = [];
  for (const b of input) {
    if (!b || typeof b !== "object") continue;
    const t = (b as { type?: string }).type;
    if (t === "text" && typeof (b as { body?: unknown }).body === "string") {
      out.push({ type: "text", heading: (b as { heading?: string }).heading, body: (b as { body: string }).body });
    } else if (t === "image" && typeof (b as { imageUrl?: unknown }).imageUrl === "string") {
      out.push({ type: "image", imageUrl: (b as { imageUrl: string }).imageUrl, caption: (b as { caption?: string }).caption });
    } else if (t === "quote" && typeof (b as { body?: unknown }).body === "string") {
      out.push({ type: "quote", body: (b as { body: string }).body, author: (b as { author?: string }).author });
    }
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeLinks(input: unknown): LinkButton[] {
  if (!Array.isArray(input)) return [];
  const types = new Set(LINK_TYPES as string[]);
  const out: LinkButton[] = [];
  for (const l of input) {
    if (!l || typeof l !== "object") continue;
    const url = (l as { url?: unknown }).url;
    const label = (l as { label?: unknown }).label;
    const type = (l as { type?: unknown }).type;
    if (typeof url !== "string" || !url) continue;
    out.push({
      label: typeof label === "string" && label ? label : LINK_TYPE_BUTTON_LABELS[(typeof type === "string" && types.has(type) ? type : "link") as LinkButtonType],
      url,
      type: (typeof type === "string" && types.has(type) ? type : "link") as LinkButtonType,
    });
    if (out.length >= 8) break;
  }
  return out;
}

/** 저장된 행(또는 null)을 화면/폼에서 쓰기 좋은 설정 객체로 변환 */
export function resolveDonationPage(row: DonationPageRow | null | undefined): DonationPageConfig {
  return {
    themeColor: row?.themeColor || DEFAULT_THEME_COLOR,
    heroImageUrl: row?.heroImageUrl || null,
    heroTitle: row?.heroTitle || null,
    heroSubtitle: row?.heroSubtitle || null,
    logoUrl: row?.logoUrl || null,
    links: normalizeLinks(safeParse<unknown>(row?.links, [])),
    introTitle: row?.introTitle || null,
    introBody: row?.introBody || null,
    blocks: normalizeBlocks(safeParse<unknown>(row?.blocks, [])),
    suggestedAmounts: normalizeAmounts(safeParse<unknown>(row?.suggestedAmounts, DEFAULT_SUGGESTED_AMOUNTS)),
    enabledChannels: normalizeChannels(safeParse<unknown>(row?.enabledChannels, ALL_CHANNELS)),
    thankYouTitle: row?.thankYouTitle || null,
    thankYouMessage: row?.thankYouMessage || null,
    showStats: row?.showStats ?? true,
    showCampaigns: row?.showCampaigns ?? true,
    showFaq: row?.showFaq ?? false,
    showSmsFeed: row?.showSmsFeed ?? true,
    isPublished: row?.isPublished ?? true,
  };
}

/** 테마색이 유효한 #RRGGBB 인지 */
export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}
