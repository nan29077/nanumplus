from pathlib import Path
from math import cos, sin, pi

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "나눔플러스_기관홍보용_서비스소개서.pdf"
ASSET = ROOT / "public" / "images" / "hero"
W, H = landscape(A4)

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))

CREAM = "#FFF9EE"
PAPER = "#FFFCF6"
VANILLA = "#F7E8C7"
GREEN = "#214B3D"
GREEN_2 = "#3D725F"
SAGE = "#B8D0BB"
SAGE_LIGHT = "#E4EEE4"
PEACH = "#F9DDC9"
ROSE = "#EFA99F"
YELLOW = "#F4CC5B"
INK = "#26362F"
MUTED = "#717A72"
LINE = "#E7DAC5"
WHITE = "#FFFFFF"


def hx(value):
    from reportlab.lib.colors import HexColor
    return HexColor(value)


def rr(c, x, y, w, h, r=18, fill=PAPER, stroke=None, sw=1):
    c.setFillColor(hx(fill))
    if stroke:
        c.setStrokeColor(hx(stroke)); c.setLineWidth(sw)
        c.roundRect(x, y, w, h, r, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, r, fill=1, stroke=0)


def txt(c, value, x, y, size=11, color=INK, bold=False, anchor="start"):
    c.setFont("MalgunBold" if bold else "Malgun", size)
    c.setFillColor(hx(color))
    if anchor == "middle":
        c.drawCentredString(x, y, value)
    elif anchor == "end":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap(value, max_width, size, bold=False):
    font = "MalgunBold" if bold else "Malgun"
    lines, line = [], ""
    for ch in value:
        test = line + ch
        if pdfmetrics.stringWidth(test, font, size) <= max_width or not line:
            line = test
        else:
            lines.append(line.rstrip())
            line = ch.lstrip()
    if line:
        lines.append(line.rstrip())
    return lines


def para(c, value, x, y, max_width, size=10, leading=17, color=MUTED, bold=False, max_lines=None):
    lines = wrap(value, max_width, size, bold)
    if max_lines:
        lines = lines[:max_lines]
    for i, line in enumerate(lines):
        txt(c, line, x, y - i * leading, size, color, bold)
    return y - len(lines) * leading


def crop(c, path, x, y, w, h, radius=0):
    img = ImageReader(str(path)); iw, ih = img.getSize()
    scale = max(w / iw, h / ih); dw, dh = iw * scale, ih * scale
    c.saveState()
    p = c.beginPath()
    if radius:
        p.roundRect(x, y, w, h, radius)
    else:
        p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def logo(c, cx, cy, size=40, with_name=False, light_name=False):
    rr(c, cx - size / 2, cy - size / 2, size, size, size * 0.24, GREEN)
    for i in range(5):
        a = pi / 2 + i * 2 * pi / 5
        c.setFillColor(hx(VANILLA))
        c.circle(cx + cos(a) * size * 0.17, cy + sin(a) * size * 0.17, size * 0.115, fill=1, stroke=0)
    c.setFillColor(hx(YELLOW)); c.circle(cx, cy, size * 0.075, fill=1, stroke=0)
    if with_name:
        txt(c, "나눔플러스", cx + size * 0.7, cy - size * 0.13, size * 0.38, WHITE if light_name else GREEN, True)


def pill(c, label, x, y, fill=SAGE_LIGHT, color=GREEN, width=None):
    fs = 9
    width = width or pdfmetrics.stringWidth(label, "MalgunBold", fs) + 24
    rr(c, x, y, width, 24, 12, fill)
    txt(c, label, x + width / 2, y + 7, fs, color, True, "middle")
    return width


def h_arrow(c, x1, y, x2, color=SAGE, width=2.2, head=7):
    c.saveState(); c.setStrokeColor(hx(color)); c.setFillColor(hx(color)); c.setLineWidth(width); c.setLineCap(1)
    c.line(x1, y, x2 - head, y)
    p = c.beginPath(); p.moveTo(x2, y); p.lineTo(x2 - head, y + head * 0.62); p.lineTo(x2 - head, y - head * 0.62); p.close()
    c.drawPath(p, fill=1, stroke=0); c.restoreState()


def icon(c, cx, cy, label, fill=GREEN, color=WHITE, size=36):
    c.setFillColor(hx(fill)); c.circle(cx, cy, size / 2, fill=1, stroke=0)
    txt(c, label, cx, cy - 4, 10, color, True, "middle")


def page(c, no, section):
    c.setFillColor(hx(CREAM)); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(hx(VANILLA)); c.circle(W + 5, H + 5, 82, fill=1, stroke=0)
    c.setFillColor(hx(PEACH)); c.circle(-16, -12, 60, fill=1, stroke=0)
    logo(c, 53, H - 35, 28)
    txt(c, section, 77, H - 40, 9, GREEN, True)
    txt(c, "나눔플러스 기관 홍보용 서비스 소개서", 46, 24, 8, MUTED)
    txt(c, f"{no:02d}", W - 46, 24, 8, MUTED, True, "end")


def title(c, eyebrow, heading, sub=None, y=517):
    txt(c, eyebrow, 48, y, 9.5, GREEN_2, True)
    txt(c, heading, 48, y - 39, 25, INK, True)
    if sub:
        para(c, sub, 48, y - 70, 720, 10.5, 17, MUTED)


def bullet(c, x, y, value, width=230, color=GREEN_2, size=9.5):
    c.setFillColor(hx(color)); c.circle(x + 4, y + 4, 4, fill=1, stroke=0)
    para(c, value, x + 18, y + 7, width - 18, size, 16, MUTED)


def metric(c, x, y, w, label, value, note, accent=GREEN):
    rr(c, x, y, w, 112, 18, PAPER, LINE)
    c.setFillColor(hx(accent)); c.roundRect(x, y + 105, w, 7, 3.5, fill=1, stroke=0)
    txt(c, label, x + 18, y + 78, 9.5, MUTED, True)
    txt(c, value, x + 18, y + 39, 24, accent, True)
    txt(c, note, x + 18, y + 17, 8.3, MUTED)


def cover(c):
    c.setFillColor(hx(CREAM)); c.rect(0, 0, W, H, fill=1, stroke=0)
    crop(c, ASSET / "nanum-growing-together.jpg", 485, 0, W - 485, H)
    c.saveState(); c.setFillColor(hx(GREEN)); c.setFillAlpha(0.18); c.rect(485, 0, W - 485, H, fill=1, stroke=0); c.restoreState()
    c.setFillColor(hx(PEACH)); c.circle(425, H + 5, 90, fill=1, stroke=0)
    c.setFillColor(hx(VANILLA)); c.circle(44, 30, 96, fill=1, stroke=0)
    logo(c, 72, H - 68, 46, True)
    pill(c, "기관을 위한 통합 후원 운영 플랫폼", 54, H - 145, PEACH, GREEN)
    txt(c, "후원은 더 쉽게,", 54, H - 214, 34, INK, True)
    txt(c, "기관 운영은 더 따뜻하게", 54, H - 257, 34, GREEN, True)
    para(c, "문자 한 통의 후원부터 캠페인, 후원자 관리, 성과 확인과 정산까지. 나눔플러스가 기관의 후원 업무를 하나로 이어드립니다.", 54, H - 302, 370, 12, 21, MUTED)
    rr(c, 54, 88, 364, 88, 18, PAPER, LINE)
    txt(c, "현재 나눔플러스 후원기관", 74, 145, 10, GREEN, True)
    txt(c, "173곳", 74, 113, 23, INK, True)
    txt(c, "함께 만드는 지속 가능한 나눔", 176, 118, 10, MUTED)
    txt(c, "INSTITUTIONAL SERVICE GUIDE · 2026.08", 54, 43, 8, MUTED, True)
    c.showPage()


def at_a_glance(c):
    page(c, 2, "01  나눔플러스란")
    title(c, "AT A GLANCE", "기관의 후원 업무를 한곳에서 이어주는 서비스", "후원자가 쉽게 참여하고, 기관은 후원 내역과 관계를 편리하게 관리할 수 있도록 돕습니다.")
    items = [
        ("쉬운 참여", "문자·QR·캠페인", "후원자는 익숙한 방법으로 빠르게 마음을 전할 수 있습니다.", SAGE_LIGHT, GREEN),
        ("빠른 감사", "후원 직후 MT 문자", "후원 확인과 감사 인사를 바로 전달해 좋은 경험을 만듭니다.", PEACH, ROSE),
        ("한눈에 관리", "후원자·성과·정산", "흩어진 운영 정보를 기관 대시보드에서 체계적으로 확인합니다.", VANILLA, GREEN_2),
    ]
    for i, (head, key, body, fill, accent) in enumerate(items):
        x = 48 + i * 253
        rr(c, x, 235, 229, 178, 22, fill)
        icon(c, x + 32, 375, str(i + 1), accent, WHITE, 34)
        txt(c, head, x + 18, 335, 14, INK, True)
        txt(c, key, x + 18, 307, 10, GREEN_2, True)
        para(c, body, x + 18, 278, 190, 9.6, 17, MUTED)
    rr(c, 48, 84, 735, 108, 20, GREEN)
    txt(c, "한 문장으로 말하면", 70, 152, 10, VANILLA, True)
    txt(c, "후원 참여부터 감사, 관리, 성과 확인까지", 70, 121, 17, WHITE, True)
    txt(c, "기관이 놓치기 쉬운 후원 흐름을 하나로 연결하는 운영 플랫폼입니다.", 70, 96, 10.5, SAGE)
    c.showPage()


def before_after(c):
    page(c, 3, "02  기관의 변화")
    title(c, "BEFORE & AFTER", "복잡했던 후원 업무가 한결 단순해집니다", "기관 담당자가 반복 확인에 쓰던 시간을 줄이고, 후원자와의 관계에 더 집중할 수 있습니다.")
    rr(c, 48, 125, 330, 286, 22, PAPER, LINE)
    pill(c, "기존의 어려움", 70, 369, PEACH, GREEN)
    problems = ["후원 채널마다 내역이 따로 흩어짐", "후원 확인과 감사 안내를 반복 처리", "캠페인 진행률을 실시간으로 보기 어려움", "보고와 정산을 위해 자료를 다시 정리"]
    for i, item in enumerate(problems):
        y = 321 - i * 54
        icon(c, 81, y + 4, "!", ROSE, WHITE, 25)
        txt(c, item, 103, y, 10, MUTED)
    h_arrow(c, 394, 268, 446, GREEN_2, 3, 10)
    rr(c, 463, 125, 320, 286, 22, GREEN)
    pill(c, "나눔플러스와 함께", 485, 369, GREEN_2, VANILLA)
    gains = ["후원 내역을 기관별로 한곳에 정리", "후원 직후 감사문자로 마음을 연결", "캠페인 목표와 성과를 한눈에 확인", "통계와 정산 흐름을 바탕으로 보고"]
    for i, item in enumerate(gains):
        y = 321 - i * 54
        icon(c, 496, y + 4, "✓", SAGE, GREEN, 25)
        txt(c, item, 518, y, 10, WHITE)
    rr(c, 48, 75, 735, 34, 12, VANILLA)
    txt(c, "핵심 변화 · 후원 건을 처리하는 서비스에서, 후원 관계를 이어가는 서비스로", 68, 87, 9.2, GREEN, True)
    c.showPage()


def journey(c):
    page(c, 4, "03  전체 이용 흐름")
    title(c, "ONE CONNECTED JOURNEY", "후원자의 마음이 기관의 성과로 이어지는 과정", "각 단계는 자연스럽게 연결되고, 기관 담당자는 결과를 한 화면에서 확인합니다.")
    steps = [
        ("1", "후원 참여", "문자·QR·캠페인", GREEN),
        ("2", "후원 확인", "기관·금액·채널 확인", GREEN_2),
        ("3", "감사 전달", "MT 확인·감사문자", ROSE),
        ("4", "관계 관리", "후원자·이력 관리", YELLOW),
        ("5", "성과 활용", "통계·보고·정산", GREEN),
    ]
    for i, (n, head, sub, accent) in enumerate(steps):
        x = 48 + i * 151
        rr(c, x, 245, 125, 164, 20, PAPER, LINE)
        icon(c, x + 26, 373, n, accent, WHITE if accent != YELLOW else GREEN, 34)
        txt(c, head, x + 16, 330, 11, INK, True)
        para(c, sub, x + 16, 298, 94, 9, 16, MUTED)
        if i < 4:
            h_arrow(c, x + 130, 327, x + 146, SAGE, 2, 5)
    rr(c, 48, 84, 735, 112, 20, SAGE_LIGHT)
    txt(c, "기관 담당자는", 70, 155, 10, GREEN, True)
    txt(c, "누가 · 언제 · 어떤 채널로 · 얼마나 후원했는지", 70, 126, 16, INK, True)
    txt(c, "그리고 감사문자가 전달되었는지까지 한 흐름으로 확인할 수 있습니다.", 70, 101, 10, MUTED)
    c.showPage()


def sms(c):
    page(c, 5, "04  문자 후원")
    title(c, "MO TO MT, IN PLAIN LANGUAGE", "문자 한 통으로 시작해 감사문자로 이어집니다", "어려운 용어 대신 실제 이용 과정을 따라가면 간단합니다.")
    rr(c, 48, 250, 224, 160, 20, SAGE_LIGHT)
    pill(c, "MO 문자", 68, 367, GREEN, WHITE)
    txt(c, "후원자가 보내는 문자", 68, 330, 14, INK, True)
    para(c, "후원번호와 기관 코드를 이용해 문자로 후원 의사를 보냅니다.", 68, 299, 180, 9.8, 17, MUTED)
    h_arrow(c, 286, 330, 337, GREEN_2, 3, 10)
    rr(c, 352, 250, 224, 160, 20, VANILLA)
    pill(c, "후원 처리", 372, 367, PEACH, GREEN)
    txt(c, "3,000원 후원 내역 생성", 372, 330, 14, INK, True)
    para(c, "기관 정보를 확인하고 성공한 후원 내역을 기관 대시보드에 기록합니다.", 372, 299, 180, 9.8, 17, MUTED)
    h_arrow(c, 590, 330, 641, GREEN_2, 3, 10)
    rr(c, 656, 250, 127, 160, 20, PEACH)
    pill(c, "MT 문자", 674, 367, ROSE, WHITE)
    txt(c, "감사 전달", 674, 330, 14, INK, True)
    para(c, "확인·감사문자 1건을 보냅니다.", 674, 299, 88, 9.6, 17, MUTED)
    rr(c, 48, 84, 485, 118, 20, GREEN)
    txt(c, "감사문자 예시", 70, 167, 10, VANILLA, True)
    para(c, "[나눔플러스] ○○기관에 3,000원을 후원해 주셔서 감사합니다. 따뜻한 마음이 큰 힘이 됩니다.", 70, 138, 435, 11, 20, WHITE, True)
    rr(c, 554, 84, 229, 118, 20, PAPER, LINE)
    txt(c, "기본 산정 원칙", 574, 167, 10, GREEN, True)
    para(c, "성공한 MO 후원 1건당 MT 감사문자 1건을 기준으로 합니다.", 574, 138, 188, 9.5, 17, MUTED)
    c.showPage()


def campaign(c):
    page(c, 6, "05  캠페인과 QR")
    title(c, "MORE WAYS TO JOIN", "기관의 활동을 더 많은 사람에게 알립니다", "캠페인과 QR을 활용하면 온라인과 오프라인의 관심을 후원 참여로 연결할 수 있습니다.")
    crop(c, ASSET / "nanum-heart-hands.jpg", 48, 135, 325, 278, 24)
    cards = [
        ("캠페인 페이지", "목표 금액, 기간, 소개 내용과 진행률을 보기 쉽게 보여줍니다.", SAGE_LIGHT, "01"),
        ("QR 참여", "포스터, 소식지, 행사 안내물에 QR을 넣어 바로 참여하도록 돕습니다.", PEACH, "02"),
        ("기관 상세 소개", "기관의 로고, 활동 내용과 등록 캠페인을 함께 안내합니다.", VANILLA, "03"),
    ]
    for i, (head, body, fill, n) in enumerate(cards):
        y = 317 - i * 91
        rr(c, 398, y, 385, 76, 17, fill)
        icon(c, 425, y + 38, n, [GREEN, ROSE, GREEN_2][i], WHITE, 31)
        txt(c, head, 452, y + 44, 11, INK, True)
        para(c, body, 452, y + 22, 305, 8.9, 15, MUTED, max_lines=2)
    rr(c, 48, 83, 735, 34, 12, PAPER, LINE)
    txt(c, "활용 예 · 복지관 바자회 · 긴급 생계지원 · 아동 교육비 · 지역 돌봄 · 재난 긴급모금", 68, 95, 9.1, GREEN, True)
    c.showPage()


def dashboard(c):
    page(c, 7, "06  기관 대시보드")
    title(c, "EVERYTHING IN ONE VIEW", "기관에 필요한 정보를 한 화면에서 확인합니다", "로그인한 기관은 자신의 데이터와 운영 현황에 집중할 수 있습니다.")
    items = [
        ("후원 현황", "기간·채널별 후원금과 건수", SAGE_LIGHT, "현황"),
        ("후원자 관리", "검색, 상세 이력, 연락처 보호", PEACH, "관계"),
        ("캠페인 관리", "목표, 기간, 진행률, 참여 내역", VANILLA, "캠페인"),
        ("QR 관리", "기관·캠페인별 참여 QR", SAGE_LIGHT, "QR"),
        ("통계·보고", "기간별 성과와 보고 자료", PEACH, "통계"),
        ("정산 관리", "정산 예정과 완료 상태", VANILLA, "정산"),
    ]
    for i, (head, body, fill, tag) in enumerate(items):
        col, row = i % 3, i // 3
        x, y = 48 + col * 253, 271 - row * 148
        rr(c, x, y, 229, 124, 18, fill)
        pill(c, tag, x + 16, y + 82, PAPER if fill != PEACH else GREEN, GREEN if fill != PEACH else WHITE)
        txt(c, head, x + 16, y + 54, 12, INK, True)
        para(c, body, x + 16, y + 31, 194, 9.1, 15, MUTED)
    c.showPage()


def donor(c):
    page(c, 8, "07  후원자 관계")
    title(c, "FROM A DONATION TO A RELATIONSHIP", "한 번의 후원을 오래 이어지는 관계로", "후원자는 빠른 확인을 받고, 기관은 후원 이력을 바탕으로 더 세심하게 소통할 수 있습니다.")
    stages = [
        ("01", "첫 참여", "문자·QR·캠페인으로 쉽게 후원", GREEN),
        ("02", "즉시 감사", "확인과 감사의 마음을 빠르게 전달", ROSE),
        ("03", "이력 축적", "후원자별 참여 내역을 기관 단위로 관리", GREEN_2),
        ("04", "지속 연결", "기관 활동과 다음 캠페인으로 관계 확장", YELLOW),
    ]
    for i, (n, head, body, accent) in enumerate(stages):
        x = 48 + i * 190
        rr(c, x, 232, 166, 184, 20, PAPER, LINE)
        icon(c, x + 28, 378, n, accent, WHITE if accent != YELLOW else GREEN, 34)
        txt(c, head, x + 18, 334, 12, INK, True)
        para(c, body, x + 18, 300, 130, 9.4, 17, MUTED)
        if i < 3:
            h_arrow(c, x + 171, 324, x + 184, SAGE, 2, 5)
    rr(c, 48, 84, 735, 103, 20, GREEN)
    txt(c, "관계 관리의 출발점", 70, 149, 10, VANILLA, True)
    txt(c, "빠른 감사는 후원자에게 신뢰를, 정리된 이력은 기관에게 다음 소통의 근거를 줍니다.", 70, 117, 14, WHITE, True)
    txt(c, "개인정보는 기관별 접근 범위 안에서 관리합니다.", 70, 94, 9, SAGE)
    c.showPage()


def reporting(c):
    page(c, 9, "08  통계와 정산")
    title(c, "CLEAR RESULTS", "성과는 쉽게 보고, 정산은 흐름대로 확인합니다", "기관 운영에 필요한 숫자를 보기 쉽게 정리해 보고와 의사결정을 돕습니다.")
    rr(c, 48, 154, 353, 258, 22, PAPER, LINE)
    txt(c, "성과 확인", 72, 371, 14, GREEN, True)
    checks = ["기간별 후원금과 후원 건수", "문자·QR·캠페인 등 채널별 성과", "캠페인 목표 대비 진행률", "보고용 데이터 확인과 활용"]
    for i, value in enumerate(checks):
        y = 325 - i * 47
        icon(c, 82, y + 4, "✓", GREEN_2, WHITE, 25)
        txt(c, value, 104, y, 9.8, MUTED)
    rr(c, 424, 154, 359, 258, 22, GREEN)
    txt(c, "정산 흐름", 448, 371, 14, VANILLA, True)
    phases = [("1", "후원 완료", "처리된 후원 내역 확인"), ("2", "정산 예정", "예정 금액과 일자 확인"), ("3", "정산 완료", "완료 내역과 결과 확인")]
    for i, (n, head, sub) in enumerate(phases):
        y = 315 - i * 69
        icon(c, 461, y + 5, n, GREEN_2, WHITE, 27)
        txt(c, head, 487, y + 6, 10.5, WHITE, True)
        txt(c, sub, 487, y - 13, 8.8, SAGE)
        if i < 2:
            c.setStrokeColor(hx(GREEN_2)); c.setLineWidth(1.2); c.line(461, y - 16, 461, y - 42)
    rr(c, 48, 83, 735, 45, 14, VANILLA)
    txt(c, "기관은 ‘얼마나 모였는지’뿐 아니라 ‘어떻게 모였고, 언제 정산되는지’까지 확인할 수 있습니다.", 68, 99, 9.5, GREEN, True)
    c.showPage()


def network(c):
    page(c, 10, "09  현재 운영 규모")
    title(c, "173 INSTITUTIONS", "현재 나눔플러스 후원기관은 173곳입니다", "기관당 월 후원액 50만원, 건당 3,000원의 문자 후원을 기준으로 예상 규모를 계산했습니다.")
    metric(c, 48, 300, 221, "현재 후원기관", "173곳", "나눔플러스 후원기관 기준", GREEN)
    metric(c, 285, 300, 221, "월 후원액 계획", "8,650만원", "173곳 × 50만원", ROSE)
    metric(c, 522, 300, 261, "월 예상 MO·MT", "각 약 28,833건", "성공 MO 1건당 MT 1건", GREEN_2)
    rr(c, 48, 171, 735, 83, 18, GREEN)
    txt(c, "연간 예상", 70, 221, 10, VANILLA, True)
    vals = [("연 후원액", "10억 3,800만원"), ("연 MO 후원", "346,000건"), ("연 MT 감사문자", "346,000건")]
    for i, (lab, val) in enumerate(vals):
        x = 170 + i * 205
        txt(c, lab, x, 220, 8.8, SAGE, True, "middle")
        txt(c, val, x, 192, 13, WHITE, True, "middle")
    rr(c, 48, 81, 735, 63, 16, SAGE_LIGHT)
    txt(c, "계산 기준", 68, 117, 9, GREEN, True)
    para(c, "후원기관당 연 600만원 ÷ 3,000원 = 연 2,000건. 173개 후원기관의 연 예상 MO·MT는 각각 346,000건입니다. 재발송과 실패 보정 문자는 제외했습니다.", 134, 119, 620, 9.2, 16, INK)
    c.showPage()


def value(c):
    page(c, 11, "10  누구에게 어떤 도움이 되나요")
    title(c, "VALUE FOR EVERYONE", "후원자, 담당자, 기관 모두가 체감하는 변화", "서비스의 가치는 단순히 업무를 줄이는 데서 끝나지 않습니다.")
    groups = [
        ("후원자", "더 쉬운 참여", ["익숙한 문자와 QR", "빠른 후원 확인", "따뜻한 감사 경험"], SAGE_LIGHT),
        ("기관 담당자", "더 가벼운 운영", ["흩어진 정보 통합", "반복 확인 감소", "성과를 한눈에 확인"], PEACH),
        ("기관", "더 투명한 성장", ["운영 데이터 축적", "정산 흐름 관리", "보고와 의사결정 근거"], VANILLA),
    ]
    for i, (who, head, lines, fill) in enumerate(groups):
        x = 48 + i * 253
        rr(c, x, 187, 229, 226, 22, fill)
        pill(c, who, x + 18, 369, PAPER, GREEN)
        txt(c, head, x + 18, 330, 15, INK, True)
        for j, line in enumerate(lines):
            bullet(c, x + 18, 284 - j * 45, line, 190)
    rr(c, 48, 84, 735, 68, 18, PAPER, LINE)
    txt(c, "나눔플러스가 지향하는 것", 70, 124, 9.5, GREEN, True)
    txt(c, "후원자의 마음이 기관의 좋은 활동으로 오래 이어지는 건강한 나눔 구조", 246, 119, 12, INK, True)
    c.showPage()


def trust(c):
    page(c, 12, "11  신뢰할 수 있는 운영")
    title(c, "SAFE BY ORGANIZATION", "기관별로 안전하게 나누어 관리합니다", "각 기관은 자신의 후원자와 운영 정보에 집중할 수 있도록 권한과 데이터를 구분합니다.")
    items = [
        ("기관별 데이터 분리", "다른 기관의 후원자와 성과 정보가 섞이지 않도록 관리합니다."),
        ("개인정보 보호", "목록 화면에서는 필요한 정보를 가리고, 접근 범위를 관리합니다."),
        ("운영 기록", "중요한 관리 활동의 이력을 확인할 수 있도록 기록합니다."),
        ("안전한 연동", "외부 요청 확인과 반복 요청 제한 등 기본 보호 장치를 적용합니다."),
    ]
    for i, (head, body) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 48 + col * 376, 270 - row * 138
        rr(c, x, y, 352, 116, 18, SAGE_LIGHT if i % 2 == 0 else PAPER, LINE)
        icon(c, x + 31, y + 82, "✓", GREEN_2, WHITE, 28)
        txt(c, head, x + 55, y + 77, 11.5, INK, True)
        para(c, body, x + 20, y + 43, 310, 9.2, 16, MUTED)
    rr(c, 48, 80, 735, 35, 12, GREEN)
    txt(c, "후원 데이터를 안전하게 다루는 일도 나눔플러스의 중요한 서비스입니다.", 68, 93, 9.5, WHITE, True)
    c.showPage()


def onboarding(c):
    page(c, 13, "12  도입 방법과 자주 묻는 질문")
    title(c, "START STEP BY STEP", "기관 상황에 맞춰 차근차근 시작합니다", "기본 정보를 준비하고 운영 기준을 함께 확인한 뒤 서비스를 시작합니다.")
    rr(c, 48, 151, 344, 262, 22, GREEN)
    txt(c, "도입 4단계", 72, 373, 14, VANILLA, True)
    stages = [("01", "기관 정보 등록", "기관명·연락처·로고 등"), ("02", "후원 채널 설정", "문자 코드·발신번호·캠페인"), ("03", "운영 기준 확인", "권한·문구·정산 기준"), ("04", "서비스 시작", "성과 확인과 후원자 관리")]
    for i, (n, head, sub) in enumerate(stages):
        y = 329 - i * 51
        txt(c, n, 72, y, 8.5, SAGE, True)
        txt(c, head, 106, y, 10.2, WHITE, True)
        txt(c, sub, 106, y - 17, 8.5, SAGE)
    rr(c, 417, 151, 366, 262, 22, PAPER, LINE)
    txt(c, "자주 묻는 질문", 441, 373, 14, GREEN, True)
    faqs = [
        ("Q. MO와 MT는 무엇인가요?", "MO는 후원자가 보내는 문자, MT는 기관이 보내는 확인·감사문자입니다."),
        ("Q. 기관별 자료는 따로 관리되나요?", "네. 기관별 데이터와 접근 범위를 구분해 관리합니다."),
        ("Q. 예상 MT 건수는 어떻게 계산하나요?", "성공한 MO 후원 1건당 MT 1건을 기본으로 계산합니다."),
    ]
    for i, (q, a) in enumerate(faqs):
        y = 326 - i * 67
        txt(c, q, 441, y, 9.6, INK, True)
        para(c, a, 441, y - 20, 315, 8.6, 14, MUTED, max_lines=2)
    rr(c, 48, 80, 735, 44, 14, VANILLA)
    txt(c, "준비부터 시작까지, 기관 담당자가 이해하기 쉬운 순서로 안내합니다.", 68, 96, 9.4, GREEN, True)
    c.showPage()


def closing(c):
    c.setFillColor(hx(GREEN)); c.rect(0, 0, W, H, fill=1, stroke=0)
    crop(c, ASSET / "nanum-community-care.jpg", 505, 0, W - 505, H)
    c.saveState(); c.setFillColor(hx(GREEN)); c.setFillAlpha(0.25); c.rect(505, 0, W - 505, H, fill=1, stroke=0); c.restoreState()
    c.setFillColor(hx(GREEN_2)); c.circle(34, 30, 110, fill=1, stroke=0)
    logo(c, 70, H - 66, 44, True, True)
    pill(c, "173개 후원기관과 함께", 54, H - 151, GREEN_2, VANILLA)
    txt(c, "기관의 좋은 일을", 54, H - 220, 31, WHITE, True)
    txt(c, "더 오래 이어가도록", 54, H - 260, 31, VANILLA, True)
    para(c, "나눔플러스는 후원자의 참여 순간부터 기관의 감사, 관리, 성과 확인까지 함께합니다.", 54, H - 306, 388, 12, 21, "#E3EEE7")
    rr(c, 54, 105, 395, 118, 20, PAPER)
    txt(c, "나눔플러스 도입으로", 76, 188, 10, GREEN, True)
    txt(c, "후원자는 더 쉽게 참여하고", 76, 158, 13, INK, True)
    txt(c, "기관은 더 편리하고 투명하게 운영합니다.", 76, 132, 13, GREEN, True)
    txt(c, "도입 문의 · 나눔플러스 운영팀", 54, 68, 9, SAGE, True)
    txt(c, "NANUMPLUS · INSTITUTIONAL SERVICE GUIDE", 54, 43, 8, SAGE, True)
    c.showPage()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("나눔플러스 기관 홍보용 서비스 소개서")
    c.setAuthor("나눔플러스")
    c.setSubject("기관을 위한 나눔플러스 후원 운영 서비스 소개")
    for fn in (cover, at_a_glance, before_after, journey, sms, campaign, dashboard, donor, reporting, network, value, trust, onboarding, closing):
        fn(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
