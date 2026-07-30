import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
interface OrgData { aid: string; name: string; smsCode: string | null; }
const ORGS: OrgData[] = [
  { aid: "A0000375", name: "시온쉼터", smsCode: null },
  { aid: "A0000374", name: "동래구 장애인복지관", smsCode: null },
  { aid: "A0000373", name: "축구종합센터 펀딩 캠페인", smsCode: null },
  { aid: "A0000372", name: "갈거리사회적협동조합", smsCode: null },
  { aid: "A0000371", name: "독서당", smsCode: "4712" },
  { aid: "A0000370", name: "(재)내셔널트러스트문화유산기금", smsCode: "4711" },
  { aid: "A0000369", name: "한아름", smsCode: "4710" },
  { aid: "A0000368", name: "학장종합사회복지관", smsCode: "4709" },
  { aid: "A0000367", name: "(사)한국의사상자협회", smsCode: "4708" },
  { aid: "A0000366", name: "진해장애인인권센터", smsCode: "4707" },
  { aid: "A0000365", name: "사단법인 부산여성의전화", smsCode: "4706" },
  { aid: "A0000364", name: "수원새벽빛장애인야간학교", smsCode: "4705" },
  { aid: "A0000363", name: "(사)한국평생교육사협회 경기도안산지회", smsCode: "4704" },
  { aid: "A0000362", name: "안산나무를심는장애인야학", smsCode: "4703" },
  { aid: "A0000361", name: "사단법인 아름다운손길", smsCode: "4702" },
  { aid: "A0000360", name: "관악정다운의료복지사회적협동조합", smsCode: "4701" },
  { aid: "A0000359", name: "통일문화연합", smsCode: "4700" },
  { aid: "A0000358", name: "선한시민의힘", smsCode: "4699" },
  { aid: "A0000357", name: "사랑해", smsCode: "4698" },
  { aid: "A0000356", name: "교육공동체더하기", smsCode: "4697" },
  { aid: "A0000355", name: "도토리보호작업장", smsCode: "4696" },
  { aid: "A0000354", name: "노리울예술협회", smsCode: "4695" },
  { aid: "A0000353", name: "(사)축복의 다리", smsCode: "4694" },
  { aid: "A0000352", name: "사단법인 대구여성회", smsCode: "4693" },
  { aid: "A0000351", name: "방배노인종합복지관", smsCode: "4692" },
  { aid: "A0000350", name: "파르란도 오케스트라", smsCode: "4691" },
  { aid: "A0000349", name: "행동하는성소수자인권연대", smsCode: "4690" },
  { aid: "A0000348", name: "(사)파주여성민우회", smsCode: "4689" },
  { aid: "A0000347", name: "굿브리지", smsCode: "4688" },
  { aid: "A0000346", name: "노아선교회", smsCode: "4687" },
  { aid: "A0000345", name: "함께걷기사회적협동조합", smsCode: "4686" },
  { aid: "A0000344", name: "(사)한기장쉼터요양원", smsCode: "4685" },
  { aid: "A0000343", name: "(사)서울퀴어문화축제조직위원회", smsCode: "6550" },
  { aid: "A0000342", name: "한국지역아동센터연합회", smsCode: "4684" },
  { aid: "A0000341", name: "전국개척교회연합회", smsCode: "4683" },
  { aid: "A0000340", name: "(사)생명존엄재단", smsCode: "4682" },
  { aid: "A0000339", name: "(사)어독스", smsCode: "4681" },
  { aid: "A0000338", name: "(사)성폭력예방치료센터", smsCode: "4680" },
  { aid: "A0000337", name: "재단법인 416재단", smsCode: "4160" },
  { aid: "A0000336", name: "도로시지켜줄개", smsCode: "4679" },
  { aid: "A0000335", name: "나는부모다협회", smsCode: "4678" },
  { aid: "A0000334", name: "아세아연합신학대학교연합선교총회", smsCode: "4677" },
  { aid: "A0000333", name: "임마누엘지역아동센터", smsCode: "4676" },
  { aid: "A0000332", name: "사회복지법인 한기장복지재단", smsCode: "4675" },
  { aid: "A0000331", name: "서재지역아동센터", smsCode: "4674" },
  { aid: "A0000330", name: "사단법인 햇살마루", smsCode: "4673" },
  { aid: "A0000329", name: "로뎀사회적협동조합(오정지역아동센터)", smsCode: "4672" },
  { aid: "A0000328", name: "양지지역아동센터", smsCode: "4671" },
  { aid: "A0000327", name: "국민사랑의회", smsCode: "4670" },
  { aid: "A0000326", name: "사단법인 해피피플", smsCode: "4669" },
  { aid: "A0000325", name: "(사)이주민과함께", smsCode: "4668" },
  { aid: "A0000324", name: "구미시 반려동물구조협회", smsCode: "4667" },
  { aid: "A0000323", name: "사단법인 두드림글로벌재단", smsCode: "4666" },
  { aid: "A0000322", name: "주랑지역아동센터", smsCode: "4665" },
  { aid: "A0000321", name: "보물섬지역아동센터", smsCode: null },
  { aid: "A0000320", name: "금천장애인종합복지관", smsCode: "4663" },
  { aid: "A0000319", name: "(사)희망둥지나욧", smsCode: "4662" },
  { aid: "A0000318", name: "(사)세계평화청년학생연합", smsCode: "9650" },
  { aid: "A0000317", name: "사단법인 코인트리", smsCode: "4661" },
  { aid: "A0000316", name: "(사)아시아교류협회", smsCode: null },
  { aid: "A0000315", name: "힐링라이프선교회", smsCode: "4659" },
  { aid: "A0000314", name: "이룸지역아동센터", smsCode: "4658" },
  { aid: "A0000313", name: "사회적협동조합 보아스사회공헌재단", smsCode: "4657" },
  { aid: "A0000312", name: "온고을지역아동센터", smsCode: "4656" },
  { aid: "A0000311", name: "가온사회적협동조합(소망지역아동센터)", smsCode: "4655" },
  { aid: "A0000310", name: "응암노인복지관", smsCode: "4654" },
  { aid: "A0000309", name: "기독교대한감리회 라이트하우스교회", smsCode: "4653" },
  { aid: "A0000308", name: "윙크", smsCode: "4652" },
  { aid: "A0000307", name: "덕산지역아동센터(충남예산)", smsCode: "4651" },
  { aid: "A0000306", name: "재단법인 대한국인", smsCode: "4650" },
  { aid: "A0000305", name: "나눔종합사회복지관", smsCode: null },
  { aid: "A0000304", name: "두손애장학회", smsCode: null },
  { aid: "A0000303", name: "신애원", smsCode: null },
  { aid: "A0000302", name: "국제슬로푸드한국협회", smsCode: "3000" },
  { aid: "A0000301", name: "인천힐링센터", smsCode: "7006" },
  { aid: "A0000300", name: "희망한국", smsCode: null },
  { aid: "A0000299", name: "마포장애인주간보호센터", smsCode: "1066" },
  { aid: "A0000298", name: "울산동구종합사회복지관", smsCode: "4242" },
  { aid: "A0000297", name: "우리동물병원생명사회적협동조합", smsCode: "7575" },
  { aid: "A0000296", name: "진주시민미디어센터", smsCode: "7306" },
  { aid: "A0000295", name: "사단법인광주여성민우회", smsCode: "0383" },
  { aid: "A0000294", name: "(사)토닥토닥", smsCode: "7979" },
  { aid: "A0000293", name: "(사)피스모모", smsCode: "0904" },
  { aid: "A0000292", name: "여성환경연대", smsCode: "3355" },
  { aid: "A0000291", name: "사회복지연구소", smsCode: "2560" },
  { aid: "A0000290", name: "(사)한국뇌병변장애인인권협회", smsCode: "3161" },
  { aid: "A0000289", name: "(사)한국뇌병변장애인인권협회 서울협회", smsCode: "3162" },
  { aid: "A0000288", name: "사단법인 김포여성의전화", smsCode: "0136" },
  { aid: "A0000287", name: "한국해비타트", smsCode: "3396" },
  { aid: "A0000286", name: "사단법인인천여성민우회", smsCode: "2848" },
  { aid: "A0000285", name: "사단법인 수원여성의전화", smsCode: "0909" },
  { aid: "A0000284", name: "사단법인 서울동북여성민우회", smsCode: "1992" },
  { aid: "A0000283", name: "사단법인마포희망나눔", smsCode: "7640" },
  { aid: "A0000282", name: "인드라망생명공동체", smsCode: "0911" },
  { aid: "A0000281", name: "(사)안산여성노동자회", smsCode: "4362" },
  { aid: "A0000280", name: "서울남서여성민우회", smsCode: "1313" },
  { aid: "A0000279", name: "겨레하나", smsCode: "0427" },
  { aid: "A0000278", name: "서울환경운동연합", smsCode: "1000" },
  { aid: "A0000277", name: "서울강서양천여성의전화", smsCode: "0613" },
  { aid: "A0000276", name: "인구협회 광주성폭력상담소", smsCode: "1366" },
  { aid: "A0000275", name: "김포장애인야학", smsCode: "9420" },
  { aid: "A0000274", name: "환경운동연합", smsCode: "1515" },
  { aid: "A0000273", name: "한국여성정치네트워크", smsCode: "2030" },
  { aid: "A0000272", name: "엔젤프로젝트", smsCode: "0179" },
  { aid: "A0000271", name: "행동하는 동물사랑", smsCode: "6279" },
  { aid: "A0000270", name: "젠더정치연구소", smsCode: "1122" },
  { aid: "A0000269", name: "울산여성의전화", smsCode: "9988" },
  { aid: "A0000268", name: "다사랑공동체", smsCode: "1101" },
  { aid: "A0000267", name: "시립남부장애인종합복지관", smsCode: "010" },
  { aid: "A0000266", name: "사단법인 글로벌투게더", smsCode: "2540" },
  { aid: "A0000265", name: "사단법인 복지국가소사이어티", smsCode: "2353" },
  { aid: "A0000264", name: "유네스코 한국위원회", smsCode: "2" },
  { aid: "A0000263", name: "(사회복지법인) 대한불교조계종사회복지재단", smsCode: "5101" },
  { aid: "A0000262", name: "사단법인 복음의전함", smsCode: "7697" },
  { aid: "A0000261", name: "사단법인 푸른아시아", smsCode: "1460" },
  { aid: "A0000260", name: "(사단)한국조혈모세포은행협회", smsCode: "1004" },
  { aid: "A0000259", name: "사단법인 생명지대", smsCode: null },
  { aid: "A0000258", name: "사단법인 함께하는한숲", smsCode: "1053" },
  { aid: "A0000257", name: "바다사랑해군장학재단", smsCode: "111" },
  { aid: "A0000256", name: "한민족복지재단", smsCode: "4000" },
  { aid: "A0000255", name: "국제나눔연대", smsCode: "4201" },
  { aid: "A0000254", name: "한국성적소수자문화인권센터", smsCode: "8080" },
  { aid: "A0000253", name: "비온뒤무지개", smsCode: "1365" },
  { aid: "A0000252", name: "사단법인 희망래일", smsCode: "7788" },
  { aid: "A0000251", name: "재단법인 승일희망재단", smsCode: "7" },
  { aid: "A0000250", name: "친구사이", smsCode: "7942" },
  { aid: "A0000249", name: "뚝딱장난감", smsCode: "1510" },
  { aid: "A0000248", name: "경상남도아동보호전문기관", smsCode: "1391" },
  { aid: "A0000247", name: "유엔환경계획한국협회", smsCode: "1011" },
  { aid: "A0000246", name: "경남종합사회복지관", smsCode: "8600" },
  { aid: "A0000245", name: "재단법인 아름다운 동행", smsCode: "9595" },
  { aid: "A0000244", name: "사단법인 글로벌호프", smsCode: "5500" },
  { aid: "A0000243", name: "인터넷뉴스 신문고", smsCode: null },
  { aid: "A0000242", name: "사단법인 사랑나눔전국네트워크", smsCode: null },
  { aid: "A0000241", name: "kh TV", smsCode: "0700" },
  { aid: "A0000240", name: "(사)프렌드아시아", smsCode: "8045" },
  { aid: "A0000239", name: "사단법인 비전케어", smsCode: "2020" },
  { aid: "A0000238", name: "(사) 부스러기사랑나눔회", smsCode: "1265" },
  { aid: "A0000237", name: "사단법인 인순이와 좋은 사람들", smsCode: "5004" },
  { aid: "A0000236", name: "대한불교조계종 유지재단", smsCode: "1027" },
  { aid: "A0000235", name: "사단법인 난치병아동돕기운동본부", smsCode: "7777" },
  { aid: "A0000234", name: "한국복음서원(생명의흐름TV)", smsCode: "0881" },
  { aid: "A0000233", name: "희망을 파는 사람들(대구)", smsCode: "8" },
  { aid: "A0000232", name: "(사)한국성폭력상담소", smsCode: "1991" },
  { aid: "A0000231", name: "강릉씨네마떼끄", smsCode: "7415" },
  { aid: "A0000230", name: "대안문화연대 민들레의 꿈", smsCode: null },
  { aid: "A0000229", name: "광명여성의전화", smsCode: "1998" },
  { aid: "A0000228", name: "한국청소년보호협회", smsCode: null },
  { aid: "A0000227", name: "(사)한국여성단체연합", smsCode: "0308" },
  { aid: "A0000226", name: "대구여성의전화", smsCode: "6484" },
  { aid: "A0000225", name: "사단법인 고양파주여성민우회", smsCode: null },
  { aid: "A0000224", name: "인권교육센터 들", smsCode: "5353" },
  { aid: "A0000223", name: "강화여성의전화", smsCode: "1994" },
  { aid: "A0000222", name: "성매매문제해결을위한전국연대", smsCode: "0923" },
  { aid: "A0000221", name: "(사)광주여성의전화", smsCode: "0442" },
  { aid: "A0000220", name: "군포여성민우회", smsCode: "1999" },
  { aid: "A0000219", name: "춘천여성민우회", smsCode: "9964" },
  { aid: "A0000218", name: "재단법인 한국메이크어위시소원별재단", smsCode: "0318" },
  { aid: "A0000217", name: "경기장애인자립생활센터협의회 안산시지부", smsCode: null },
  { aid: "A0000216", name: "대학입시거부로 삶을 바꾸는 투명가방끈", smsCode: "2011" },
  { aid: "A0000215", name: "사단법인 한국나눔연맹", smsCode: "1001" },
  { aid: "A0000214", name: "한국여성민우회", smsCode: "3838" },
  { aid: "A0000213", name: "(사)한국여성의전화", smsCode: "1983" },
  { aid: "A0000212", name: "나눔과나눔", smsCode: "3412" },
  { aid: "A0000211", name: "경제정의실천시민연합", smsCode: "1989" },
  { aid: "A0000210", name: "(주)여성신문사", smsCode: "9300" },
  { aid: "A0000209", name: "NGO 엔지오", smsCode: null },
  { aid: "A0000208", name: "월드라인", smsCode: null },
  { aid: "A0000207", name: "세이브더칠드런", smsCode: null },
  { aid: "A0000206", name: "목동 천주교", smsCode: null },
  { aid: "A0000205", name: "실망이음", smsCode: null },
  { aid: "A0000203", name: "굿네이버스", smsCode: null },
  { aid: "A0000202", name: "강화도 봉은사", smsCode: null },
];


async function main() {
  console.log("modugive 전체 마이그레이션: " + ORGS.length + "개 기관");
  const passwordHash = await bcrypt.hash("123456", 12);
  let ok = 0, fail = 0;

  for (const org of ORGS) {
    const slug = org.aid.toLowerCase();
    const email = slug + "@modugive.kr";
    const { smsCode } = org;
    const smsFullNumber = smsCode ? "#2540-" + smsCode : null;

    try {
      const createdOrg = await prisma.organization.upsert({
        where: { slug },
        update: { name: org.name, ...(smsCode ? { smsCode, smsFullNumber } : {}) },
        create: { slug, name: org.name, smsCode, smsFullNumber, isActive: true },
      });

      const user = await prisma.user.upsert({
        where: { email },
        update: { name: org.name, passwordHash },
        create: { email, name: org.name, passwordHash, role: "ORG_ADMIN", isActive: true },
      });

      await prisma.organizationAdmin.upsert({
        where: { userId: user.id },
        update: { organizationId: createdOrg.id },
        create: { userId: user.id, organizationId: createdOrg.id },
      });

      if (smsCode && smsFullNumber) {
        // fullNumber는 이력 테이블이라 고유하지 않으므로
        // 현재 유효한(isActive) 배정을 찾아 갱신하고, 없으면 새로 만든다.
        const current = await prisma.smsNumberAssignment.findFirst({
          where: { fullNumber: smsFullNumber, isActive: true },
          select: { id: true },
        });
        if (current) {
          await prisma.smsNumberAssignment.update({
            where: { id: current.id },
            data: { organizationId: createdOrg.id, code: smsCode, isActive: true },
          });
        } else {
          await prisma.smsNumberAssignment.create({
            data: { organizationId: createdOrg.id, baseNumber: "#2540", code: smsCode, fullNumber: smsFullNumber, isActive: true },
          });
        }
      }

      console.log("ok: " + org.name + " (" + slug + ") " + (smsFullNumber ?? "EMMA없음"));
      ok++;
    } catch (err) {
      console.error("fail: " + org.aid + " " + org.name + ": " + (err instanceof Error ? err.message : String(err)));
      fail++;
    }
  }
  console.log("\n완료: 성공 " + ok + "개, 실패 " + fail + "개");
}

main().catch(console.error).finally(() => prisma.$disconnect());
