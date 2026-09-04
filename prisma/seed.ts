import { randomBytes } from "crypto";
import { PrismaClient, type DonationChannel, type DonationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

/**
 * 데모 계정 비밀번호.
 * ★ 평문 상수를 저장소에 두지 않는다. 환경변수로 주입하거나,
 *   미설정이면 실행할 때마다 임의 생성해서 마지막에 1회만 출력한다.
 *     SEED_ADMIN_PASSWORD / SEED_ORG_PASSWORD
 */
function seedPassword(envName: string): { value: string; generated: boolean } {
  const v = process.env[envName]?.trim();
  if (v && v.length >= 8) return { value: v, generated: false };
  return { value: randomBytes(9).toString("base64url"), generated: true };
}

const SEED_ADMIN_PW = seedPassword("SEED_ADMIN_PASSWORD");
const SEED_ORG_PW = seedPassword("SEED_ORG_PASSWORD");

/** QR 코드 data URL 생성 */
function makeQr(slug: string) {
  return QRCode.toDataURL(`${APP_URL}/donate/${slug}`, {
    errorCorrectionLevel: "M", margin: 2, width: 512,
    color: { dark: "#114032", light: "#FFFFFF" },
  });
}

/** Picsum 더미 이미지 URL (seed 기반 → 동일 seed = 동일 이미지) */
const img = (seed: string, w = 1200, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const SURNAMES = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","류","남","전","허","유","홍","고","문","양","손","배","백","노","주","곽"];
const GIVEN   = ["민준","서연","도윤","지우","예준","하은","주원","지호","수아","지훈","다은","현우","예린","건우","유진","성민","은서","지안","하준","채원","지현","민서","준혁","서준","수빈","예슬","성준","보람","지선","태양","민지","준서","소연","현서","지영","태민","유나","건희","혜린","동현"];
const randomName  = () => `${pick(SURNAMES)}${pick(GIVEN)}`;
const randomPhone = () => `010-${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
const randomEmail = (i: number) => `donor${i}_${randInt(10, 99)}@example.com`;

const CHANNELS: DonationChannel[] = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
const TRANSFER_AMOUNTS = [5000, 10000, 20000, 30000, 50000, 100000, 200000, 500000];

const SMS_BODIES = [
  "후원합니다",
  "응원합니다",
  "화이팅",
  "도움이 되길 바랍니다",
  "이웃에게 따뜻한 손을",
  "사랑합니다",
  "힘내세요",
  "작은 정성이지만 도움이 되길 바랍니다",
  "항상 응원합니다",
  "좋은 일 하세요",
  "오늘도 수고하십니다",
  "행복한 하루 되세요",
  "도움이 필요한 분들을 위해",
  "나눔에 참여합니다",
  "아이들을 응원합니다",
  "어르신들 건강하세요",
  "",
];

/** 최근 N일 중 랜덤 시각 */
function recentDate(daysBack = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

/** 정산 기간 문자열 (예: "2026-04") */
function settlementPeriod(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 해당 기간의 정산 예정일 (16일) */
function scheduledDate(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 16, 0, 0, 0);
}

async function main() {
  console.log("🌱 시드 데이터 확인 중 (기존 데이터 유지)...");
  console.log("ℹ️  이미 존재하는 데이터는 삭제하지 않습니다.\n");

  // ─────────────────────────── 최고 관리자 (upsert) ───────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@onjung.kr" },
    update: {},
    create: {
      name: "나눔플러스 최고관리자",
      email: "admin@onjung.kr",
      passwordHash: await bcrypt.hash(SEED_ADMIN_PW.value, 12),
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ 최고 관리자: admin@onjung.kr");

  // ─────────────────────────── 기관 6개 ───────────────────────────
  const orgDefs = [
    {
      name: "따뜻한손길복지재단", slug: "warmhands", smsCode: "1234",
      description: "결식이웃과 위기가정에 따뜻한 한 끼와 생활을 지원합니다.",
      address: "서울특별시 종로구 자선로 12", phone: "02-123-4567", email: "hello@warmhands.kr",
      bankName: "국민은행", bankAccount: "123-456-789012", bankHolder: "따뜻한손길복지재단",
      admin: { name: "김복지", email: "manager1@onjung.kr" },
    },
    {
      name: "푸른희망아동센터", slug: "bluehope", smsCode: "2580",
      description: "보호가 필요한 아동·청소년의 자립과 교육을 돕습니다.",
      address: "부산광역시 해운대구 희망대로 88", phone: "051-234-5678", email: "info@bluehope.kr",
      bankName: "신한은행", bankAccount: "234-567-890123", bankHolder: "푸른희망아동센터",
      admin: { name: "이희망", email: "manager2@onjung.kr" },
    },
    {
      name: "한울타리노인복지회", slug: "hanultari", smsCode: "7942",
      description: "독거 어르신의 건강과 정서적 돌봄을 위해 함께합니다.",
      address: "대구광역시 중구 돌봄길 25", phone: "053-345-6789", email: "care@hanultari.kr",
      bankName: "우리은행", bankAccount: "345-678-901234", bankHolder: "한울타리노인복지회",
      admin: { name: "박돌봄", email: "manager3@onjung.kr" },
    },
    {
      name: "빛나는미래장애인센터", slug: "brightfuture", smsCode: "3310",
      description: "장애인의 재활과 사회 참여를 지원하여 더 나은 내일을 함께 만듭니다.",
      address: "광주광역시 서구 미래로 55", phone: "062-456-7890", email: "support@brightfuture.kr",
      bankName: "하나은행", bankAccount: "456-789-012345", bankHolder: "빛나는미래장애인센터",
      admin: { name: "최밝음", email: "manager4@onjung.kr" },
    },
    {
      name: "새벽이슬청소년쉼터", slug: "dawndew", smsCode: "5621",
      description: "가출 및 위기 청소년에게 안전한 쉼터와 자립 지원을 제공합니다.",
      address: "인천광역시 남동구 청소년로 31", phone: "032-567-8901", email: "youth@dawndew.kr",
      bankName: "농협은행", bankAccount: "567-890-123456", bankHolder: "새벽이슬청소년쉼터",
      admin: { name: "정새벽", email: "manager5@onjung.kr" },
    },
    {
      name: "행복나눔다문화센터", slug: "happymulti", smsCode: "8834",
      description: "다문화 가정의 언어·생활 지원과 지역사회 통합을 이끕니다.",
      address: "경기도 안산시 다문화로 77", phone: "031-678-9012", email: "hello@happymulti.kr",
      bankName: "기업은행", bankAccount: "678-901-234567", bankHolder: "행복나눔다문화센터",
      admin: { name: "류나눔", email: "manager6@onjung.kr" },
    },
  ];

  const orgs = [];
  for (const def of orgDefs) {
    const qrDataUrl = await makeQr(def.slug);

    // 기관 upsert (slug 고유)
    const org = await prisma.organization.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        name: def.name, slug: def.slug,
        description: def.description, address: def.address,
        phone: def.phone, email: def.email,
        smsBaseNumber: "#2540", smsCode: def.smsCode,
        smsFullNumber: `#2540-${def.smsCode}`,
        bankName: def.bankName, bankAccount: def.bankAccount, bankHolder: def.bankHolder,
        qrCodeUrl: qrDataUrl,
      },
    });

    // 기관 관리자 upsert (email 고유)
    const adminUser = await prisma.user.upsert({
      where: { email: def.admin.email },
      update: {},
      create: {
        name: def.admin.name, email: def.admin.email,
        passwordHash: await bcrypt.hash(SEED_ORG_PW.value, 12), role: "ORG_ADMIN",
      },
    });

    // OrganizationAdmin upsert (userId 고유)
    await prisma.organizationAdmin.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: { userId: adminUser.id, organizationId: org.id },
    });

    // SMS 번호 배정 — fullNumber는 이력 테이블이라 고유하지 않으므로
    // 현재 유효한(isActive) 배정이 없을 때만 생성한다.
    const existingAssignment = await prisma.smsNumberAssignment.findFirst({
      where: { fullNumber: `#2540-${def.smsCode}`, isActive: true },
    });
    if (!existingAssignment) {
      await prisma.smsNumberAssignment.create({
        data: {
          organizationId: org.id, baseNumber: "#2540",
          code: def.smsCode, fullNumber: `#2540-${def.smsCode}`,
          assignedById: superAdmin.id,
        },
      });
    }

    // QR 코드 - 고유 제약 없음 → 없을 때만 생성
    const existingQr = await prisma.qrCode.findFirst({ where: { organizationId: org.id } });
    if (!existingQr) {
      await prisma.qrCode.create({
        data: {
          organizationId: org.id,
          targetUrl: `${APP_URL}/donate/${def.slug}`,
          imageDataUrl: qrDataUrl,
        },
      });
    }

    orgs.push(org);
    console.log(`✅ 기관: ${def.name} (#2540-${def.smsCode}) · ${def.admin.email}`);
  }

  // ─────────────────────────── 캠페인 12개 + 이미지 ───────────────────────────
  const campaignDefs = [
    {
      org: 0, title: "결식아동 따뜻한 한 끼 나눔",
      goal: 10_000_000, current: 7_850_000,
      summary: "끼니를 거르는 아이들에게 든든한 한 끼를 선물해 주세요.",
      beneficiary: "지역 결식아동 200명",
      coverImage: img("child-meal-cover"),
      images: [
        { url: img("child-meal-1", 800, 600), caption: "급식 봉사 현장" },
        { url: img("child-meal-2", 800, 600), caption: "따뜻한 한 끼를 받는 아이들" },
        { url: img("community-kitchen-1", 800, 600), caption: "복지재단 급식실" },
      ],
      story: "끼니를 거르는 아이들에게 든든한 한 끼를 선물해 주세요.\n\n우리 지역에는 하루 한 끼도 제대로 먹지 못하는 아이들이 있습니다. 방과 후 아무도 없는 집에 돌아와 텅 빈 냉장고를 마주하는 아이들의 이야기는 멀리 있지 않습니다.\n\n따뜻한손길복지재단은 지역 결식아동 200명에게 매일 점심·저녁 급식을 제공합니다. 여러분의 작은 정성이 모여 아이들의 배를 채우고, 내일을 향한 에너지가 됩니다.",
      reason: "현장의 필요는 늘 예산을 앞섭니다.\n\n정부 지원만으로는 늘어나는 결식 아동 수요를 감당하기 어렵습니다. 방학 기간에는 학교 급식마저 끊겨 더 많은 아이들이 위기에 처합니다. 안정적인 민간 후원이 반드시 필요합니다.",
      usagePlan: "후원금의 90% 이상을 직접 서비스에 활용합니다.\n• 65%: 식재료 구매 및 급식 제공\n• 25%: 급식 봉사자 교육·관리\n• 10%: 행정·운영비\n\n사용 내역은 매월 홈페이지와 SNS를 통해 투명하게 공개됩니다.",
    },
    {
      org: 0, title: "위기가정 긴급 생계비 지원",
      goal: 8_000_000, current: 5_230_000,
      summary: "갑작스러운 위기에 처한 가정의 자립을 응원합니다.",
      beneficiary: "위기가정 30세대",
      coverImage: img("crisis-family-cover"),
      images: [
        { url: img("crisis-family-1", 800, 600), caption: "생계비 지원 상담 현장" },
        { url: img("crisis-family-2", 800, 600), caption: "희망을 나누는 이웃들" },
        { url: img("crisis-worker-1", 800, 600), caption: "담당 복지사와 면담" },
        { url: img("crisis-supply-1", 800, 600), caption: "생필품 꾸러미 전달" },
      ],
      story: "갑작스러운 위기에 처한 가정의 자립을 응원합니다.\n\n갑작스러운 실직, 질병, 사고로 인해 하루아침에 생계가 막막해지는 가정들이 있습니다. 이들에게 필요한 것은 단순한 물질적 지원을 넘어, 다시 일어설 수 있다는 희망입니다.\n\n긴급 생계비 지원을 통해 월세·공과금·식비 등 기본 생활을 유지할 수 있도록 돕고, 자립 상담과 취업 연계 서비스도 함께 제공합니다.",
      reason: "위기는 예고 없이 찾아옵니다.\n\n갑작스러운 경제적 위기 상황에서 공식 복지 지원이 연결되기까지 걸리는 시간 동안 가정은 무너질 수 있습니다. 빠른 민간 지원이 가정을 지키는 마지막 안전망이 됩니다.",
      usagePlan: "후원금의 92%가 수혜 가정에 직접 전달됩니다.\n• 70%: 긴급 생계비 (월세, 식비, 공과금)\n• 22%: 자립 상담·취업 연계 프로그램\n• 8%: 행정·운영비",
    },
    {
      org: 1, title: "보호종료아동 자립 응원 프로젝트",
      goal: 15_000_000, current: 12_100_000,
      summary: "홀로서기를 준비하는 청년들의 첫걸음을 함께해요.",
      beneficiary: "보호종료청년 25명",
      coverImage: img("youth-independent-cover"),
      images: [
        { url: img("youth-independent-1", 800, 600), caption: "자립 준비 교육 프로그램" },
        { url: img("youth-independent-2", 800, 600), caption: "직업 훈련 수업 현장" },
        { url: img("youth-housing-1", 800, 600), caption: "자립 주거 지원" },
        { url: img("youth-mentoring", 800, 600), caption: "멘토링 프로그램" },
      ],
      story: "홀로서기를 준비하는 청년들의 첫걸음을 함께해요.\n\n보호시설에서 나온 청년들은 갑자기 홀로서기를 해야 합니다. 주거, 취업, 생활 기술 등 아무것도 준비되지 않은 상태에서 사회에 던져지는 것입니다.\n\n푸른희망아동센터는 보호종료 청년들에게 자립 주거 지원, 직업 훈련, 생활 기술 교육, 심리 상담을 함께 제공합니다. 이들이 당당한 사회 구성원으로 성장할 수 있도록 응원해 주세요.",
      reason: "보호종료 후 5년이 가장 위험한 시기입니다.\n\n시설 퇴소 후 많은 청년이 빈곤, 주거 불안, 범죄 피해에 노출됩니다. 조기에 충분한 자립 지원을 받은 청년은 사회적 비용을 크게 줄입니다.",
      usagePlan: "• 50%: 자립 주거 지원 (보증금, 월세)\n• 30%: 직업 훈련 및 취업 연계\n• 12%: 심리 상담·생활 기술 교육\n• 8%: 행정·운영비",
    },
    {
      org: 1, title: "아동센터 겨울나기 난방비 모금",
      goal: 5_000_000, current: 5_200_000,
      summary: "추운 겨울, 아이들의 공간을 따뜻하게 지켜주세요.",
      beneficiary: "지역아동센터 4곳",
      coverImage: img("winter-kids-cover"),
      images: [
        { url: img("winter-kids-1", 800, 600), caption: "따뜻한 겨울을 보내는 아이들" },
        { url: img("heating-facility-1", 800, 600), caption: "난방 설비 점검" },
        { url: img("winter-study-1", 800, 600), caption: "따뜻한 공간에서 공부하는 아이들" },
      ],
      story: "추운 겨울, 아이들의 공간을 따뜻하게 지켜주세요.\n\n지역아동센터는 방과 후 돌봄이 필요한 아이들의 두 번째 집입니다. 그러나 노후화된 건물과 높은 난방비로 인해 겨울마다 아이들이 추위에 떨고 있습니다.\n\n이번 모금은 지역 내 4개 아동센터의 겨울철 난방비를 지원합니다. 목표를 이미 달성했지만, 추가 후원은 내년 겨울을 대비하는 데 사용됩니다.",
      reason: "에너지 취약계층 아동들의 겨울이 위험합니다.\n\n난방이 제대로 되지 않는 환경에서 장시간 생활하는 아이들은 건강과 학습에 심각한 영향을 받습니다.",
      usagePlan: "• 100%: 4개 아동센터 겨울철 난방비 직접 지원\n(초과 달성분은 내년도 난방비 적립)",
    },
    {
      org: 2, title: "독거어르신 안부와 도시락 배달",
      goal: 6_000_000, current: 4_410_000,
      summary: "매일의 안부와 따뜻한 도시락으로 곁을 지킵니다.",
      beneficiary: "독거 어르신 150명",
      coverImage: img("elder-lunch-cover"),
      images: [
        { url: img("elder-lunch-1", 800, 600), caption: "도시락 배달 봉사자" },
        { url: img("elder-care-1", 800, 600), caption: "어르신과 대화하는 봉사자" },
        { url: img("elder-meal-1", 800, 600), caption: "따뜻한 한 끼 식사" },
        { url: img("elder-smile-1", 800, 600), caption: "환하게 웃으시는 어르신" },
      ],
      story: "매일의 안부와 따뜻한 도시락으로 곁을 지킵니다.\n\n하루 종일 말 한마디 나누지 못하고 홀로 지내시는 어르신들이 있습니다. 우리의 도시락 배달은 단순한 식사 제공을 넘어, 어르신과 사회를 연결하는 끈이 됩니다.\n\n매일 오전 어르신 댁을 방문하여 안부를 확인하고 따뜻한 도시락을 전달합니다. 한 번의 방문이 어르신의 하루를 환하게 밝힙니다.",
      reason: "고독사 위험에 처한 독거 어르신 수가 증가하고 있습니다.\n\n정기적인 안부 방문은 건강 이상 조기 발견과 고독사 예방에 직접적으로 기여합니다.",
      usagePlan: "• 70%: 도시락 식재료·제조\n• 20%: 배달 봉사자 교통비·교육비\n• 10%: 행정·운영비",
    },
    {
      org: 2, title: "어르신 건강 돌봄 프로그램",
      goal: 4_000_000, current: 1_850_000,
      summary: "정기적인 건강 체크와 운동 프로그램으로 어르신 건강을 지킵니다.",
      beneficiary: "복지회 이용 어르신 100명",
      coverImage: img("elder-health-cover"),
      images: [
        { url: img("elder-exercise-1", 800, 600), caption: "어르신 체조 교실" },
        { url: img("health-check-1", 800, 600), caption: "혈압·혈당 측정 봉사" },
        { url: img("elder-group-1", 800, 600), caption: "건강 교육 프로그램" },
      ],
      story: "정기적인 건강 체크와 운동 프로그램으로 어르신 건강을 지킵니다.\n\n노인성 질환은 조기 발견과 꾸준한 관리가 핵심입니다. 한울타리노인복지회는 매주 혈압·혈당 측정, 건강 강좌, 체조 프로그램을 운영합니다.\n\n건강한 어르신은 더 오래 행복하게 사실 수 있습니다. 여러분의 후원으로 어르신들의 건강한 일상을 지켜주세요.",
      reason: "예방적 건강 관리가 의료비를 획기적으로 줄입니다.\n\n정기 건강 모니터링을 받는 어르신은 응급 입원율이 현저히 낮아집니다.",
      usagePlan: "• 55%: 의료 봉사·건강 검진\n• 30%: 운동·프로그램 용품\n• 15%: 행정·운영비",
    },
    {
      org: 3, title: "장애인 보조기기 지원 캠페인",
      goal: 12_000_000, current: 8_900_000,
      summary: "장애인 분들이 더 자유롭고 독립적인 삶을 살 수 있도록 보조기기를 지원합니다.",
      beneficiary: "장애인 40명",
      coverImage: img("disability-assist-cover"),
      images: [
        { url: img("disability-assist-1", 800, 600), caption: "보조기기 지원 전달식" },
        { url: img("wheelchair-user-1", 800, 600), caption: "일상에서 활용하는 보조기기" },
        { url: img("rehab-session-1", 800, 600), caption: "재활 프로그램 참여" },
        { url: img("disability-smile-1", 800, 600), caption: "새로운 가능성을 발견하는 순간" },
      ],
      story: "장애인 분들이 더 자유롭고 독립적인 삶을 살 수 있도록 보조기기를 지원합니다.\n\n전동 휠체어, 보청기, 시각 보조 기기 등 보조기기 하나가 장애인의 삶을 완전히 바꿀 수 있습니다. 그러나 고가의 비용 때문에 필요한 기기를 갖추지 못하는 분들이 많습니다.\n\n이번 캠페인을 통해 40명의 장애인에게 맞춤형 보조기기를 지원합니다.",
      reason: "보조기기는 사치품이 아닌 필수품입니다.\n\n적절한 보조기기를 갖추면 장애인의 경제 활동 참여율이 높아지고, 사회 전체의 복지 비용도 줄어듭니다.",
      usagePlan: "• 85%: 보조기기 구매 지원\n• 10%: 사용 교육·사후 관리\n• 5%: 행정·운영비",
    },
    {
      org: 3, title: "장애인 재활 프로그램 운영 지원",
      goal: 7_000_000, current: 2_100_000,
      summary: "신체 재활과 사회 적응 훈련을 통해 장애인의 자립을 돕습니다.",
      beneficiary: "장애인 센터 이용자 60명",
      coverImage: img("rehab-program-cover"),
      images: [
        { url: img("rehab-program-1", 800, 600), caption: "재활 치료 세션" },
        { url: img("rehab-class-1", 800, 600), caption: "사회 적응 훈련" },
      ],
      story: "신체 재활과 사회 적응 훈련을 통해 장애인의 자립을 돕습니다.\n\n장애를 갖게 된 이후 다시 일상으로 돌아오는 여정은 쉽지 않습니다. 전문 재활 프로그램과 심리 지원이 함께할 때 회복의 속도는 훨씬 빨라집니다.\n\n빛나는미래장애인센터는 물리 치료, 작업 치료, 사회 기술 훈련, 취업 지원을 통합적으로 제공합니다.",
      reason: "조기 재활 지원이 장기 의존도를 낮춥니다.\n\n전문 재활 프로그램에 참여한 장애인은 자립 생활 능력이 평균 40% 향상됩니다.",
      usagePlan: "• 60%: 재활 치료 프로그램 운영\n• 25%: 전문 강사·치료사 지원\n• 15%: 행정·운영비",
    },
    {
      org: 4, title: "가출청소년 쉼터 운영비 지원",
      goal: 9_000_000, current: 6_720_000,
      summary: "위기 청소년들이 안전하게 쉬고 자립을 준비할 수 있는 공간을 유지합니다.",
      beneficiary: "쉼터 이용 청소년 80명",
      coverImage: img("youth-shelter-cover"),
      images: [
        { url: img("youth-shelter-1", 800, 600), caption: "청소년 쉼터 내부" },
        { url: img("counseling-1", 800, 600), caption: "상담실 운영" },
        { url: img("youth-meal-1", 800, 600), caption: "청소년 급식 지원" },
        { url: img("youth-study-1", 800, 600), caption: "학습 지원 프로그램" },
      ],
      story: "위기 청소년들이 안전하게 쉬고 자립을 준비할 수 있는 공간을 유지합니다.\n\n집을 떠나 거리를 떠도는 청소년들은 다양한 위험에 노출되어 있습니다. 새벽이슬청소년쉼터는 365일 24시간 문을 열고 위기 청소년을 맞이합니다.\n\n안전한 쉼터에서 숙식을 제공하고, 학업 복귀와 가정 회복을 위한 상담 및 지원 서비스를 운영합니다.",
      reason: "거리 청소년은 범죄와 착취의 주요 피해자입니다.\n\n안전한 쉼터는 청소년들의 2차 피해를 예방하고 사회 복귀를 돕는 가장 효과적인 수단입니다.",
      usagePlan: "• 60%: 쉼터 운영 (숙식, 시설 관리)\n• 30%: 상담·자립 지원 프로그램\n• 10%: 행정·운영비",
    },
    {
      org: 4, title: "청소년 급식 및 의류 지원",
      goal: 3_500_000, current: 3_500_000,
      summary: "취약계층 청소년의 기본 생활을 지원합니다.",
      beneficiary: "결식 위기 청소년 120명",
      coverImage: img("youth-food-cover"),
      images: [
        { url: img("youth-clothing-1", 800, 600), caption: "겨울 의류 나눔 행사" },
        { url: img("youth-food-1", 800, 600), caption: "청소년 급식 현장" },
      ],
      story: "취약계층 청소년의 기본 생활을 지원합니다.\n\n배고픈 채로 학교에 가는 청소년은 공부에 집중할 수 없습니다. 계절이 바뀌어도 새 옷을 살 수 없는 아이들도 있습니다.\n\n이번 캠페인은 목표를 달성했습니다. 추가 후원은 다음 분기 급식과 의류 지원에 사용됩니다.",
      reason: "기본 생활이 보장되어야 교육이 가능합니다.\n\n결식과 의류 부족은 학업 중단의 주요 원인 중 하나입니다.",
      usagePlan: "• 70%: 급식 제공 (재료비·조리비)\n• 20%: 계절별 의류 지원\n• 10%: 행정·운영비",
    },
    {
      org: 5, title: "다문화 가정 생활 정착 지원",
      goal: 6_500_000, current: 3_200_000,
      summary: "다문화 가정이 안정적으로 지역에 정착할 수 있도록 생활 전반을 지원합니다.",
      beneficiary: "다문화 가정 50세대",
      coverImage: img("multicultural-cover"),
      images: [
        { url: img("multicultural-1", 800, 600), caption: "다문화 가정 지원 행사" },
        { url: img("language-class-1", 800, 600), caption: "한국어 교육 클래스" },
        { url: img("cultural-event-1", 800, 600), caption: "문화 교류 행사" },
        { url: img("multicultural-kids-1", 800, 600), caption: "다문화 아동 지원" },
      ],
      story: "다문화 가정이 안정적으로 지역에 정착할 수 있도록 생활 전반을 지원합니다.\n\n언어 장벽, 문화 차이, 경제적 어려움으로 힘들어하는 다문화 가정에게 실질적인 도움을 드립니다.\n\n한국어 교육, 생활 정보 제공, 취업 연계, 아동 교육 지원 등을 통해 다문화 가정이 지역 공동체의 소중한 일원으로 자리잡을 수 있도록 돕겠습니다.",
      reason: "다문화 가정의 안정적 정착이 지역 공동체를 강화합니다.\n\n언어 교육과 생활 지원을 받은 다문화 가정은 지역사회 참여도가 크게 높아집니다.",
      usagePlan: "• 50%: 한국어 및 생활 교육 프로그램\n• 30%: 생활 정착 지원 (생필품, 행정 지원)\n• 20%: 아동 교육·문화 활동",
    },
    {
      org: 5, title: "이주민 한국어·생활교육 프로그램",
      goal: 4_000_000, current: 980_000,
      summary: "한국 생활에 필요한 언어와 문화를 배울 수 있는 교육 프로그램을 운영합니다.",
      beneficiary: "이주민·결혼이민자 100명",
      coverImage: img("korean-class-cover"),
      images: [
        { url: img("korean-class-1", 800, 600), caption: "한국어 수업 현장" },
        { url: img("korean-culture-1", 800, 600), caption: "한국 문화 체험" },
      ],
      story: "한국 생활에 필요한 언어와 문화를 배울 수 있는 교육 프로그램을 운영합니다.\n\n이주민과 결혼이민자들이 한국에서 자립적인 생활을 영위하기 위해서는 언어 능력이 가장 중요합니다.\n\n생활 한국어부터 공문서 읽기, 직장 생활 표현까지 실용적인 교육을 제공합니다. 교육을 통해 더 넓은 사회로 나아가는 첫걸음을 지원합니다.",
      reason: "언어 교육은 자립의 시작입니다.\n\n한국어 능력이 향상된 이주민은 취업률이 2배 이상 높아지고 사회적 고립도 줄어듭니다.",
      usagePlan: "• 60%: 강사 인건비 및 교재 제작\n• 25%: 교육 공간 운영\n• 15%: 행정·운영비",
    },
  ];

  const campaigns = [];
  let newCampaignCount = 0;
  for (let ci = 0; ci < campaignDefs.length; ci++) {
    const def = campaignDefs[ci];
    const org = orgs[def.org];
    const slugKey = `${org.slug}-camp-${ci + 1}`;

    // 이미 존재하는 캠페인이면 재사용
    const existing = await prisma.campaign.findUnique({ where: { slug: slugKey } });
    if (existing) {
      campaigns.push(existing);
      continue;
    }

    // 새 캠페인 생성
    const start = new Date(); start.setDate(start.getDate() - randInt(15, 60));
    const end = new Date(); end.setDate(end.getDate() + randInt(10, 60));

    const c = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        title: def.title, slug: slugKey,
        coverImageUrl: def.coverImage,
        goalAmount: def.goal, currentAmount: def.current,
        startDate: start, endDate: end,
        summary: def.summary,
        story: def.story,
        reason: def.reason,
        usagePlan: def.usagePlan,
        beneficiary: def.beneficiary,
        messageToDonors: `함께해 주셔서 진심으로 감사합니다.\n${def.beneficiary}에게 여러분의 따뜻한 마음이 전달됩니다.\n더 나은 내일을 위해 최선을 다하겠습니다.\n\n— ${org.name} 드림`,
        allowedChannels: JSON.stringify(["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"]),
        status: "ACTIVE",
        isPublished: true,
      },
    });

    // 캠페인 이미지 (새 캠페인에만)
    for (let ii = 0; ii < def.images.length; ii++) {
      await prisma.campaignImage.create({
        data: {
          campaignId: c.id,
          url: def.images[ii].url,
          caption: def.images[ii].caption,
          sortOrder: ii,
        },
      });
    }
    campaigns.push(c);
    newCampaignCount++;
  }
  console.log(`✅ 캠페인 ${campaigns.length}개 확인 (신규 ${newCampaignCount}개 생성)`);

  // ─────────────────────────── 더미 데이터 (후원자 없을 때만) ───────────────────────────
  const existingDonorCount = await prisma.donor.count();

  if (existingDonorCount > 0) {
    console.log(`ℹ️  후원자 ${existingDonorCount}명 이미 존재 → 후원자·후원·정기후원 더미 데이터 생략`);
  } else {
    // 후원자 60명
    const donors = [];
    for (let i = 0; i < 60; i++) {
      const org = orgs[i % orgs.length];
      const isRecurring = Math.random() < 0.35;
      const d = await prisma.donor.create({
        data: {
          organizationId: org.id,
          name: randomName(), phone: randomPhone(),
          email: Math.random() < 0.75 ? randomEmail(i) : null,
          privacyConsent: true, isRecurring,
          memo: Math.random() < 0.2
            ? pick(["정기 소식지 발송 동의", "SNS 공유 동의", "행사 안내 동의", "특이사항 없음"])
            : null,
        },
      });
      donors.push(d);
    }
    console.log(`✅ 후원자 ${donors.length}명 생성`);

    // 후원 265건
    let donationCount = 0;
    for (let i = 0; i < 250; i++) {
      const donor = pick(donors);
      const channel = pick(CHANNELS);
      const amount = channel === "SMS" ? 3000 : pick(TRANSFER_AMOUNTS);
      const r = Math.random();
      const status: DonationStatus =
        r < 0.88 ? "COMPLETED" : r < 0.93 ? "PENDING" : r < 0.97 ? "FAILED" : "CANCELLED";
      const orgCamps = campaigns.filter((c) => c.organizationId === donor.organizationId);
      const campaign = Math.random() < 0.55 && orgCamps.length ? pick(orgCamps) : null;
      const donatedAt = recentDate(90);

      await prisma.donation.create({
        data: {
          organizationId: donor.organizationId, donorId: donor.id,
          campaignId: campaign?.id ?? null,
          channel, amount, status, donatedAt,
          providerName: channel === "SMS" ? "infobank" : "onki",
          ...(channel === "SMS" ? {
            senderPhone: randomPhone(),
            smsBody: pick(SMS_BODIES),
            providerTransactionId: `IFB-SEED-${i}-${Date.now()}`,
          } : {
            providerTransactionId: `ONKI-SEED-${i}-${Date.now()}`,
          }),
        },
      });
      donationCount++;
    }

    // 오늘·최근 3일 보장 (대시보드 지표 확인용)
    for (let i = 0; i < 15; i++) {
      const donor = pick(donors);
      const channel = pick(CHANNELS);
      const amount = channel === "SMS" ? 3000 : pick(TRANSFER_AMOUNTS);
      const d2 = new Date();
      d2.setDate(d2.getDate() - randInt(0, 2));
      d2.setHours(randInt(9, 21), randInt(0, 59), 0, 0);

      await prisma.donation.create({
        data: {
          organizationId: donor.organizationId, donorId: donor.id,
          channel, amount, status: "COMPLETED", donatedAt: d2,
          providerName: channel === "SMS" ? "infobank" : "onki",
          ...(channel === "SMS" ? {
            senderPhone: randomPhone(),
            smsBody: pick(SMS_BODIES),
            providerTransactionId: `IFB-TODAY-${i}-${Date.now()}`,
          } : {
            providerTransactionId: `ONKI-TODAY-${i}-${Date.now()}`,
          }),
        },
      });
      donationCount++;
    }
    console.log(`✅ 후원 ${donationCount}건 생성 (SMS senderPhone/smsBody 포함)`);

    // 정기후원
    let recurringCount = 0;
    for (const donor of donors.filter((d) => d.isRecurring)) {
      await prisma.recurringDonation.create({
        data: {
          organizationId: donor.organizationId, donorId: donor.id,
          amount: pick([10000, 20000, 30000, 50000]),
          dayOfMonth: pick([1, 5, 10, 15, 20, 25]),
          status: "ACTIVE",
          providerContractId: `ONKI-RC-${donor.id.slice(-8)}`,
        },
      });
      recurringCount++;
    }
    console.log(`✅ 정기후원 ${recurringCount}건 생성`);
  }

  // ─────────────────────────── 정산 (upsert - 항상 적용) ───────────────────────────
  try {
    let settlementCount = 0;
    for (const org of orgs) {
      for (let mo = 1; mo <= 3; mo++) {
        const period = settlementPeriod(mo);
        const totalAmt = randInt(800_000, 6_000_000);
        const feeAmt   = Math.round(totalAmt * 0.05);
        const netAmt   = totalAmt - feeAmt;
        const sDate    = scheduledDate(period);
        const isDone   = mo >= 2;

        // upsert: [organizationId, period] 복합 고유 키
        await (prisma as any).settlement.upsert({
          where: { organizationId_period: { organizationId: org.id, period } },
          update: {},
          create: {
            organizationId: org.id, period,
            scheduledDate: sDate,
            totalAmount: totalAmt, feeAmount: feeAmt, netAmount: netAmt,
            status: isDone ? "COMPLETED" : "PENDING",
            processedAt: isDone ? new Date(sDate.getTime() + 86_400_000) : null,
            bankName: org.bankName, bankAccount: org.bankAccount, bankHolder: org.bankHolder,
            note: isDone ? "정산 완료" : null,
          },
        });
        settlementCount++;
      }
    }
    console.log(`✅ 정산 데이터 ${settlementCount}건 확인/생성`);
  } catch {
    console.log("⚠️  정산 테이블 없음 (npx prisma db push 후 재실행)");
  }

  // ─────────────────────────── 웹훅 이벤트 (부족할 때만 보충) ───────────────────────────
  const existingWebhookCount = await prisma.webhookEvent.count();
  if (existingWebhookCount < 12) {
    const toCreate = 12 - existingWebhookCount;
    for (let i = 0; i < toCreate; i++) {
      const org = pick(orgs);
      await prisma.webhookEvent.create({
        data: {
          provider: "infobank", eventType: "sms.mo",
          payload: {
            providerTransactionId: `IFB-WH-${i}-${Date.now()}`,
            status: "COMPLETED",
            smsFullNumber: org.smsFullNumber,
            senderPhone: randomPhone(),
            smsBody: pick(SMS_BODIES),
            amount: 3000,
          },
          processed: true, processedAt: recentDate(10),
        },
      });
    }
    if (toCreate > 0) console.log(`✅ 웹훅 이벤트 ${toCreate}건 생성`);
  }

  // ─────────────────────────── 감사 로그 (없을 때만) ───────────────────────────
  for (const org of orgs) {
    const existingLog = await prisma.auditLog.findFirst({
      where: { entityType: "Organization", entityId: org.id, action: "ORGANIZATION_CREATE" },
    });
    if (!existingLog) {
      await prisma.auditLog.create({
        data: {
          userId: superAdmin.id, action: "ORGANIZATION_CREATE",
          entityType: "Organization", entityId: org.id,
          detail: { name: org.name },
        },
      });
    }
  }

  console.log("\n✅ 시드 완료! (기존 데이터 유지됨)");
  console.log("═══════════════════════════════════════════════════");
  console.log("최고 관리자  : admin@onjung.kr");
  console.log(
    SEED_ADMIN_PW.generated
      ? `             비밀번호(자동생성, 지금 저장하세요): ${SEED_ADMIN_PW.value}`
      : "             비밀번호: 환경변수 SEED_ADMIN_PASSWORD 값"
  );
  console.log("───────────────────────────────────────────────────");
  console.log("기관 관리자  : manager1~6@onjung.kr");
  console.log(
    SEED_ORG_PW.generated
      ? `             비밀번호(자동생성, 지금 저장하세요): ${SEED_ORG_PW.value}`
      : "             비밀번호: 환경변수 SEED_ORG_PASSWORD 값"
  );
  console.log("             manager1 따뜻한손길복지재단 / manager2 푸른희망아동센터");
  console.log("             manager3 한울타리노인복지회 / manager4 빛나는미래장애인센터");
  console.log("             manager5 새벽이슬청소년쉼터 / manager6 행복나눔다문화센터");
  console.log("═══════════════════════════════════════════════════");
  console.log("※ 기존 계정이 이미 있으면 upsert update 가 비어 있어 비밀번호는 바뀌지 않습니다.");
  console.log("QR코드 → /donate/[slug] 후원 페이지로 연결됩니다.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
