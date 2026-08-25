const AVATARS = {
  community: "/images/avatars/community-bear.jpg",
  children: "/images/avatars/children-bird.jpg",
  senior: "/images/avatars/senior-owl.jpg",
  inclusive: "/images/avatars/inclusive-capybara.jpg",
  culture: "/images/avatars/culture-fox.jpg",
  nature: "/images/avatars/nature-deer.jpg",
} as const;

/**
 * 기관명에 드러난 활동 분야를 기준으로 프로필 캐릭터를 선택한다.
 * DB 필드를 추가하지 않아도 같은 기관은 모든 화면에서 항상 같은 캐릭터를 사용한다.
 */
export function getOrganizationAvatar(organizationName: string): string {
  const name = organizationName.replace(/\s+/g, "");

  if (/아동|어린이|청소년|보육|유치|학교|교육|공부|독서|꿈나무/.test(name)) {
    return AVATARS.children;
  }
  if (/노인|어르신|시니어|실버|요양|경로|치매/.test(name)) {
    return AVATARS.senior;
  }
  if (/장애|재활|자립생활|특수/.test(name)) {
    return AVATARS.inclusive;
  }
  if (/환경|생태|자연|숲|녹색|동물|유기견|유기묘|트러스트/.test(name)) {
    return AVATARS.nature;
  }
  if (/문화|예술|체육|스포츠|축구|야구|음악|미술|극단|공연/.test(name)) {
    return AVATARS.culture;
  }
  return AVATARS.community;
}
