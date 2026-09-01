from pathlib import Path
from math import cos, sin, pi

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "나눔플러스_서비스_소개서_173개_후원기관.pdf"
ASSET = ROOT / "public" / "images" / "hero"
W, H = landscape(A4)

FONT_REG = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
pdfmetrics.registerFont(TTFont("Malgun", FONT_REG))
pdfmetrics.registerFont(TTFont("MalgunBold", FONT_BOLD))

CREAM = "#FFF9EE"
PAPER = "#FFFCF6"
VANILLA = "#F8EBCF"
VANILLA_2 = "#F3DFC1"
GREEN = "#214B3D"
GREEN_2 = "#3D725F"
SAGE = "#BCD2BE"
SAGE_LIGHT = "#E5EFE4"
APRICOT = "#F6C9A8"
PEACH = "#FBE2D0"
ROSE = "#EFAFA4"
YELLOW = "#F2C95C"
INK = "#26362F"
MUTED = "#6F786F"
LINE = "#E8DDCA"
WHITE = "#FFFFFF"


def hx(value):
    from reportlab.lib.colors import HexColor
    return HexColor(value)


def round_rect(c, x, y, w, h, r=16, fill=PAPER, stroke=None, sw=1):
    c.setFillColor(hx(fill))
    if stroke:
        c.setStrokeColor(hx(stroke))
        c.setLineWidth(sw)
        c.roundRect(x, y, w, h, r, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, r, fill=1, stroke=0)


def text(c, value, x, y, size=12, color=INK, bold=False, anchor="start"):
    c.setFont("MalgunBold" if bold else "Malgun", size)
    c.setFillColor(hx(color))
    if anchor == "middle":
        c.drawCentredString(x, y, value)
    elif anchor == "end":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap_lines(value, max_width, size, bold=False):
    font = "MalgunBold" if bold else "Malgun"
    lines, current = [], ""
    for ch in value:
        test = current + ch
        if pdfmetrics.stringWidth(test, font, size) <= max_width or not current:
            current = test
        else:
            lines.append(current.rstrip())
            current = ch.lstrip()
    if current:
        lines.append(current.rstrip())
    return lines


def paragraph(c, value, x, y, max_width, size=11, leading=18, color=MUTED, bold=False, max_lines=None):
    lines = wrap_lines(value, max_width, size, bold)
    if max_lines:
        lines = lines[:max_lines]
    for i, line in enumerate(lines):
        text(c, line, x, y - i * leading, size, color, bold)
    return y - len(lines) * leading


def image_crop(c, path, x, y, w, h, radius=0):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.saveState()
    if radius:
        p = c.beginPath()
        p.roundRect(x, y, w, h, radius)
        c.clipPath(p, stroke=0, fill=0)
    else:
        p = c.beginPath()
        p.rect(x, y, w, h)
        c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, dx, dy, dw, dh, mask="auto")
    c.restoreState()


def brand_mark(c, cx, cy, size=42, label=False):
    x, y = cx - size / 2, cy - size / 2
    round_rect(c, x, y, size, size, size * 0.24, GREEN)
    pcx, pcy = cx, cy + 1
    for i in range(5):
        a = pi / 2 + i * 2 * pi / 5
        px = pcx + cos(a) * size * 0.17
        py = pcy + sin(a) * size * 0.17
        c.setFillColor(hx(VANILLA))
        c.circle(px, py, size * 0.115, fill=1, stroke=0)
    c.setFillColor(hx(YELLOW))
    c.circle(pcx, pcy, size * 0.075, fill=1, stroke=0)
    if label:
        text(c, "나눔플러스", cx + size * 0.72, cy - size * 0.13, size * 0.38, GREEN, True)


def pill(c, label, x, y, fill=SAGE_LIGHT, color=GREEN, w=None):
    fs = 9
    if w is None:
        w = pdfmetrics.stringWidth(label, "MalgunBold", fs) + 24
    round_rect(c, x, y, w, 24, 12, fill)
    text(c, label, x + w / 2, y + 7, fs, color, True, "middle")
    return w


def page_bg(c, page_no, section=None):
    c.setFillColor(hx(CREAM))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(hx(VANILLA))
    c.circle(W - 20, H + 10, 92, fill=1, stroke=0)
    c.setFillColor(hx(PEACH))
    c.circle(-20, -10, 66, fill=1, stroke=0)
    if section:
        brand_mark(c, 54, H - 34, 28)
        text(c, section, 77, H - 39, 9, GREEN, True)
    text(c, f"{page_no:02d}", W - 46, 24, 8, MUTED, True, "end")
    text(c, "나눔플러스 서비스 소개서", 46, 24, 8, MUTED)


def title_block(c, eyebrow, title_value, subtitle=None, y=520):
    text(c, eyebrow, 48, y, 10, GREEN_2, True)
    text(c, title_value, 48, y - 38, 25, INK, True)
    if subtitle:
        paragraph(c, subtitle, 48, y - 68, 710, 10.5, 17, MUTED)


def icon_circle(c, cx, cy, label, fill=GREEN, text_color=WHITE, size=38):
    c.setFillColor(hx(fill))
    c.circle(cx, cy, size / 2, fill=1, stroke=0)
    text(c, label, cx, cy - 5, 11, text_color, True, "middle")


def h_arrow(c, x1, y, x2, color=SAGE, width=2.2, head=7):
    """Draw a crisp horizontal connector with a consistent arrowhead."""
    c.saveState()
    c.setStrokeColor(hx(color))
    c.setFillColor(hx(color))
    c.setLineWidth(width)
    c.setLineCap(1)
    c.line(x1, y, x2 - head, y)
    p = c.beginPath()
    p.moveTo(x2, y)
    p.lineTo(x2 - head, y + head * 0.62)
    p.lineTo(x2 - head, y - head * 0.62)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def metric_card(c, x, y, w, h, label, value, note, accent=GREEN):
    round_rect(c, x, y, w, h, 18, PAPER, LINE)
    c.setFillColor(hx(accent))
    c.roundRect(x, y + h - 8, w, 8, 4, fill=1, stroke=0)
    text(c, label, x + 20, y + h - 36, 10, MUTED, True)
    text(c, value, x + 20, y + 42, 27, accent, True)
    text(c, note, x + 20, y + 20, 8.5, MUTED)


def cover(c):
    c.setFillColor(hx(CREAM))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    image_crop(c, ASSET / "nanum-community-care.jpg", 472, 0, W - 472, H)
    c.saveState()
    c.setFillColor(hx(GREEN))
    c.setFillAlpha(0.18)
    c.rect(472, 0, W - 472, H, fill=1, stroke=0)
    c.restoreState()
    c.setFillColor(hx(VANILLA))
    c.circle(66, 72, 92, fill=1, stroke=0)
    c.setFillColor(hx(PEACH))
    c.circle(432, H - 16, 78, fill=1, stroke=0)
    brand_mark(c, 74, H - 70, 48, True)
    pill(c, "기관을 위한 통합 후원 운영 플랫폼", 54, H - 150, PEACH, GREEN)
    text(c, "나눔을 더 가깝게,", 54, H - 220, 34, INK, True)
    text(c, "후원을 더 투명하게", 54, H - 264, 34, GREEN, True)
    paragraph(c, "문자 한 통의 마음부터 캠페인, 후원자 관리, 정산까지. 기관의 나눔 운영을 하나의 흐름으로 연결합니다.", 54, H - 308, 358, 12, 21, MUTED)
    round_rect(c, 54, 90, 350, 84, 18, PAPER, LINE)
    text(c, "MO 후원 → MT 감사문자", 74, 144, 11, GREEN, True)
    text(c, "월 50만원 기준 · 건당 3,000원", 74, 119, 10, INK, True)
    text(c, "현재 후원기관 173곳 · 월 약 28,833건 발송 예상", 74, 98, 10, MUTED)
    text(c, "SERVICE INTRODUCTION · 2026.08", 54, 44, 8, MUTED, True)
    c.showPage()


def overview(c):
    page_bg(c, 2, "01  서비스 한눈에 보기")
    title_block(c, "WHY NANUMPLUS", "후원 접점은 넓히고, 운영 부담은 줄입니다", "흩어진 후원 채널과 기관 업무를 한 화면에서 연결해 지속 가능한 나눔 경험을 만듭니다.")
    cards = [
        ("01", "쉬운 참여", "문자, QR, 캠페인 링크 등 후원자가 익숙한 방식으로 간편하게 참여합니다.", SAGE_LIGHT),
        ("02", "따뜻한 관계", "후원 완료 직후 감사문자를 보내 기관의 진심을 빠르게 전달합니다.", PEACH),
        ("03", "투명한 운영", "후원 내역, 캠페인 성과, 정산 예정 정보를 기관별로 체계적으로 관리합니다.", VANILLA),
    ]
    for i, (num, ttl, body, fill) in enumerate(cards):
        x = 48 + i * 253
        round_rect(c, x, 270, 229, 150, 20, fill)
        icon_circle(c, x + 32, 383, num, GREEN if i != 1 else ROSE, WHITE, 34)
        text(c, ttl, x + 20, 340, 15, INK, True)
        paragraph(c, body, x + 20, 310, 187, 9.5, 16, MUTED)
    round_rect(c, 48, 78, 735, 150, 22, GREEN)
    text(c, "하나의 플랫폼, 세 가지 가치", 72, 190, 11, VANILLA, True)
    values = [
        ("후원자", "참여는 간단하게\n감사는 즉시"),
        ("기관 담당자", "반복 업무는 줄이고\n관계 관리에 집중"),
        ("기관 경영진", "성과와 정산 흐름을\n숫자로 확인"),
    ]
    for i, (who, val) in enumerate(values):
        x = 74 + i * 235
        text(c, who, x, 154, 10, SAGE, True)
        lines = val.split("\n")
        text(c, lines[0], x, 128, 13, WHITE, True)
        text(c, lines[1], x, 106, 13, WHITE, True)
        if i < 2:
            c.setStrokeColor(hx(GREEN_2)); c.setLineWidth(1)
            c.line(x + 190, 102, x + 190, 166)
    c.showPage()


def network_snapshot(c):
    page_bg(c, 3, "02  나눔플러스 네트워크")
    title_block(c, "NANUMPLUS TODAY", "현재 나눔플러스 후원기관은 173곳입니다", "173개 후원기관의 참여가 모여, 매월 수만 건의 후원과 감사의 연결로 이어집니다.")
    metric_card(c, 48, 300, 221, 118, "현재 후원기관", "173곳", "나눔플러스 후원기관 기준", GREEN)
    metric_card(c, 285, 300, 221, 118, "월 후원액 계획", "8,650만원", "173곳 × 기관당 50만원", ROSE)
    metric_card(c, 522, 300, 261, 118, "월 예상 MT", "약 28,833건", "성공 MO와 1:1 발송 가정", GREEN_2)
    round_rect(c, 48, 166, 735, 96, 20, GREEN)
    text(c, "연간 네트워크 효과", 72, 225, 10, VANILLA, True)
    values = [
        ("연 후원액 계획", "10억 3,800만원"),
        ("연 MO 후원", "346,000건"),
        ("연 MT 감사문자", "346,000건"),
    ]
    for i, (label, value) in enumerate(values):
        x = 72 + i * 235
        text(c, label, x, 197, 9, SAGE, True)
        text(c, value, x, 175, 14, WHITE, True)
        if i < 2:
            c.setStrokeColor(hx(GREEN_2)); c.setLineWidth(1); c.line(x + 192, 178, x + 192, 224)
    round_rect(c, 48, 78, 735, 62, 16, SAGE_LIGHT)
    text(c, "산정 기준", 68, 113, 9, GREEN, True)
    paragraph(c, "후원기관당 연 600만원 ÷ 건당 3,000원 = 연 2,000건. 173개 후원기관이면 연 346,000건이며, 월 환산치는 약 28,833건입니다.", 130, 115, 620, 9.4, 16, INK)
    c.showPage()


def ecosystem(c):
    page_bg(c, 4, "03  서비스 구조")
    title_block(c, "CONNECTED GIVING", "후원자의 마음이 기관의 성과로 이어지는 구조", "참여, 확인, 관리, 정산을 단절 없이 연결합니다.")
    # Left input channels
    text(c, "후원 참여", 50, 407, 11, GREEN, True)
    channels = [("MO", "문자 후원"), ("QR", "QR 후원"), ("WEB", "캠페인")]
    for i, (tag, name) in enumerate(channels):
        y = 330 - i * 76
        round_rect(c, 48, y, 175, 60, 16, PAPER, LINE)
        icon_circle(c, 78, y + 30, tag, [GREEN, ROSE, GREEN_2][i], WHITE, 36)
        text(c, name, 105, y + 25, 11, INK, True)
    # Clean, evenly spaced channel connectors
    for yy in (360, 284, 208):
        h_arrow(c, 228, yy, 287, SAGE, 2.2, 7)
    # Center hub
    round_rect(c, 292, 205, 220, 178, 28, GREEN)
    brand_mark(c, 402, 326, 54)
    text(c, "나눔플러스", 402, 280, 19, WHITE, True, "middle")
    text(c, "통합 후원 운영 허브", 402, 254, 10, SAGE, True, "middle")
    pill(c, "수집 · 분류 · 기록 · 알림", 326, 221, GREEN_2, WHITE, 152)
    # Outputs
    text(c, "기관 운영", 603, 407, 11, GREEN, True)
    outputs = [("MT", "감사문자"), ("DB", "후원자 관리"), ("정산", "성과·정산")]
    for i, (tag, name) in enumerate(outputs):
        y = 330 - i * 76
        round_rect(c, 581, y, 202, 60, 16, PAPER, LINE)
        icon_circle(c, 611, y + 30, tag, [ROSE, GREEN_2, YELLOW][i], WHITE if i < 2 else GREEN, 38)
        text(c, name, 640, y + 25, 11, INK, True)
    for yy in (360, 284, 208):
        h_arrow(c, 517, yy, 576, SAGE, 2.2, 7)
    round_rect(c, 48, 76, 735, 82, 18, VANILLA)
    text(c, "핵심", 70, 126, 9, GREEN, True)
    paragraph(c, "기관별 데이터는 분리해 관리하고, 담당자는 자신의 기관에 필요한 후원자·캠페인·정산 정보에 집중할 수 있습니다.", 118, 129, 625, 10.5, 17, INK)
    c.showPage()


def mo_mt_flow(c):
    page_bg(c, 5, "04  MO·MT 문자 후원")
    title_block(c, "MESSAGE DONATION FLOW", "문자 한 통이 감사까지 이어집니다", "MO는 후원자가 보내는 수신 문자, MT는 기관이 후원자에게 보내는 확인·감사문자입니다.")
    steps = [
        ("1", "후원자", "후원번호로\n문자 발송", GREEN),
        ("2", "나눔플러스", "기관 코드와\n수신 정보 확인", GREEN_2),
        ("3", "후원 처리", "3,000원\n후원 내역 생성", ROSE),
        ("4", "MT 발송", "감사·확인문자\n1건 발송", YELLOW),
        ("5", "기관 대시보드", "성과·후원자\n내역 반영", GREEN),
    ]
    for i, (n, ttl, body, accent) in enumerate(steps):
        x = 47 + i * 151
        round_rect(c, x, 250, 125, 144, 18, PAPER, LINE)
        icon_circle(c, x + 25, 366, n, accent, WHITE if accent != YELLOW else GREEN, 32)
        text(c, ttl, x + 16, 327, 11, INK, True)
        for j, line in enumerate(body.split("\n")):
            text(c, line, x + 16, 298 - j * 18, 9.5, MUTED)
        if i < len(steps) - 1:
            h_arrow(c, x + 130, 322, x + 146, SAGE, 2.0, 5)
    round_rect(c, 48, 83, 461, 121, 20, GREEN)
    text(c, "MT 감사문자 예시", 70, 170, 10, VANILLA, True)
    paragraph(c, "[나눔플러스] ○○기관에 3,000원을 후원해 주셔서 감사합니다. 따뜻한 마음이 큰 힘이 됩니다.", 70, 143, 415, 11.5, 20, WHITE, True)
    round_rect(c, 530, 83, 253, 121, 20, PEACH)
    text(c, "운영 원칙", 550, 170, 10, GREEN, True)
    paragraph(c, "성공적으로 처리된 MO 후원 1건당 MT 1건 발송을 기본 가정으로 산정합니다.", 550, 143, 212, 10, 18, INK)
    c.showPage()


def estimate(c):
    page_bg(c, 6, "05  기관당 월간 이용 예상")
    title_block(c, "MONTHLY ESTIMATE", "기관당 월 약 167건의 MT 발송 예상", "월 후원액 50만원, 건당 후원금 3,000원, MO 1건당 MT 1건을 기준으로 계산했습니다.")
    metric_card(c, 48, 292, 221, 118, "월 후원액", "50만원", "기관 1곳 기준", GREEN)
    metric_card(c, 285, 292, 221, 118, "건당 후원금", "3,000원", "MO 문자 후원 1건", ROSE)
    metric_card(c, 522, 292, 261, 118, "예상 MT 발송", "약 167건", "성공 MO와 1:1 발송 가정", GREEN_2)
    round_rect(c, 48, 172, 735, 83, 18, VANILLA)
    text(c, "산식", 70, 223, 10, GREEN, True)
    text(c, "500,000원 ÷ 3,000원 = 166.67건 ≈ 월 167건", 132, 217, 19, INK, True)
    text(c, "따라서 MO 후원 약 167건 · MT 감사문자 약 167건", 132, 190, 10.5, GREEN_2, True)
    round_rect(c, 48, 76, 735, 68, 16, PAPER, LINE)
    text(c, "숫자 읽기", 68, 116, 9, GREEN, True)
    paragraph(c, "166건이면 498,000원, 167건이면 501,000원입니다. '월 50만원'은 계획값이므로 월간 건수는 약 167건으로 표시하며, 연간 정확 계획값은 600만원 ÷ 3,000원 = 2,000건입니다.", 126, 119, 630, 9.4, 16, MUTED)
    c.showPage()


def scale(c):
    page_bg(c, 7, "06  173개 후원기관 발송 규모")
    title_block(c, "SCALE PROJECTION", "173개 후원기관의 예상 MT 발송량", "현재 나눔플러스 후원기관 173곳에 동일한 후원 조건을 적용했습니다. 월간은 반올림, 연간은 정확 산정입니다.")
    x0, y0 = 48, 103
    widths = [138, 174, 190, 186]
    headers = ["후원기관 수", "월 후원액 합계", "월 예상 MT", "연 예상 MT"]
    rows = [
        ("1곳", "50만원", "약 167건", "2,000건"),
        ("10곳", "500만원", "약 1,667건", "20,000건"),
        ("50곳", "2,500만원", "약 8,333건", "100,000건"),
        ("100곳", "5,000만원", "약 16,667건", "200,000건"),
        ("173곳", "8,650만원", "약 28,833건", "346,000건"),
    ]
    total_w = sum(widths)
    round_rect(c, x0, y0, total_w, 300, 18, PAPER, LINE)
    c.setFillColor(hx(GREEN)); c.roundRect(x0, y0 + 252, total_w, 48, 18, fill=1, stroke=0)
    cx = x0
    for h, ww in zip(headers, widths):
        text(c, h, cx + ww / 2, y0 + 269, 10, WHITE, True, "middle")
        cx += ww
    for r, row in enumerate(rows):
        yy = y0 + 207 - r * 50
        if r == 4:
            c.setFillColor(hx(SAGE_LIGHT)); c.rect(x0 + 1, yy - 9, total_w - 2, 50, fill=1, stroke=0)
        elif r % 2 == 1:
            c.setFillColor(hx("#FAF4E8")); c.rect(x0 + 1, yy - 9, total_w - 2, 50, fill=1, stroke=0)
        cx = x0
        for col, (value, ww) in enumerate(zip(row, widths)):
            text(c, value, cx + ww / 2, yy + 9, 11, GREEN if col in (0, 2, 3) or r == 4 else INK, col != 1 or r == 4, "middle")
            cx += ww
        if r < len(rows) - 1:
            c.setStrokeColor(hx(LINE)); c.setLineWidth(0.7); c.line(x0 + 16, yy - 9, x0 + total_w - 16, yy - 9)
    round_rect(c, 48, 55, 735, 34, 12, VANILLA)
    text(c, "재발송, 실패 보정, 운영 안내문자는 제외했습니다. 실제 발송량은 성공 처리율과 운영 정책에 따라 달라질 수 있습니다.", 68, 67, 8.5, GREEN)
    c.showPage()


def features(c):
    page_bg(c, 8, "07  기관 운영 기능")
    title_block(c, "FOR ORGANIZATIONS", "담당자의 하루를 가볍게 만드는 운영 도구", "후원자 관계 관리부터 캠페인 성과와 정산 흐름까지 기관 단위로 정리합니다.")
    items = [
        ("후원 현황", "채널별 후원금과 건수를 한눈에 확인", SAGE_LIGHT, "현황"),
        ("후원자 관리", "검색, 상세 내역, 연락처 보호와 기록", PEACH, "관계"),
        ("캠페인", "목표, 기간, 진행률, 참여 내역 관리", VANILLA, "캠페인"),
        ("QR 후원", "기관·캠페인별 QR로 참여 접점 확장", SAGE_LIGHT, "QR"),
        ("통계·보고", "기간별 성과 분석과 보고용 데이터 활용", PEACH, "분석"),
        ("정산 관리", "예정·완료 흐름을 구분해 운영 투명성 강화", VANILLA, "정산"),
    ]
    for i, (ttl, body, fill, tag) in enumerate(items):
        col, row = i % 3, i // 3
        x = 48 + col * 253
        y = 270 - row * 148
        round_rect(c, x, y, 229, 124, 18, fill)
        pill(c, tag, x + 16, y + 82, GREEN if fill == PEACH else PAPER, WHITE if fill == PEACH else GREEN)
        text(c, ttl, x + 16, y + 55, 12, INK, True)
        paragraph(c, body, x + 16, y + 32, 195, 9.2, 15, MUTED, max_lines=2)
    c.showPage()


def service_scenarios(c):
    page_bg(c, 9, "08  활용 시나리오")
    title_block(c, "EVERYDAY USE CASES", "기관의 다양한 나눔 활동에 자연스럽게 연결됩니다", "일상 후원부터 긴급 캠페인, 지역 행사까지 같은 운영 체계 안에서 관리할 수 있습니다.")
    scenarios = [
        ("정기적인 문자 후원", "짧고 쉬운 참여", "기관 고유 코드로 후원 의사를 받고, 처리 직후 감사문자로 관계를 시작합니다.", SAGE_LIGHT),
        ("긴급 지원 캠페인", "빠른 모금 확산", "캠페인 페이지와 QR을 공유하고 목표 대비 모금 현황을 확인합니다.", PEACH),
        ("지역 행사·홍보물", "온·오프라인 연결", "포스터와 안내물의 QR을 통해 현장 관심을 실제 후원 참여로 전환합니다.", VANILLA),
    ]
    for i, (ttl, sub, body, fill) in enumerate(scenarios):
        x = 48 + i * 253
        round_rect(c, x, 215, 229, 198, 20, fill)
        icon_circle(c, x + 34, 374, str(i + 1), [GREEN, ROSE, GREEN_2][i], WHITE, 36)
        text(c, ttl, x + 20, 332, 13, INK, True)
        text(c, sub, x + 20, 308, 9, GREEN_2, True)
        paragraph(c, body, x + 20, 277, 190, 9.6, 17, MUTED)
    round_rect(c, 48, 83, 735, 96, 20, GREEN)
    text(c, "공통 운영 흐름", 70, 144, 10, VANILLA, True)
    flow = ["참여 접점 생성", "후원 내역 수집", "감사·관계 형성", "성과 확인·보고"]
    for i, label in enumerate(flow):
        x = 70 + i * 177
        text(c, f"0{i+1}", x, 116, 8.5, SAGE, True)
        text(c, label, x + 27, 114, 10.5, WHITE, True)
        if i < 3:
            h_arrow(c, x + 146, 118, x + 166, SAGE, 1.8, 5)
    c.showPage()


def value_story(c):
    page_bg(c, 10, "09  서비스 가치")
    title_block(c, "VALUE FOR EVERYONE", "후원자와 담당자, 기관 모두가 체감하는 변화", "나눔플러스는 단순 결제 도구가 아니라 기관의 지속 가능한 후원 운영 기반을 지향합니다.")
    groups = [
        ("후원자", "더 쉬운 참여", ["익숙한 문자·QR 방식", "즉시 받는 감사와 확인", "기관 활동과의 지속적인 연결"], SAGE_LIGHT),
        ("기관 담당자", "더 가벼운 운영", ["후원·후원자 정보 통합", "캠페인 성과 한눈에 확인", "반복 확인 업무 최소화"], PEACH),
        ("기관", "더 투명한 성장", ["기관별 성과 데이터 축적", "정산 예정·완료 흐름 관리", "보고와 의사결정 근거 확보"], VANILLA),
    ]
    for i, (who, value, bullets, fill) in enumerate(groups):
        x = 48 + i * 253
        round_rect(c, x, 190, 229, 220, 22, fill)
        pill(c, who, x + 18, 366, PAPER, GREEN)
        text(c, value, x + 18, 331, 15, INK, True)
        for j, line in enumerate(bullets):
            yy = 288 - j * 42
            c.setFillColor(hx(GREEN_2)); c.circle(x + 24, yy + 4, 4, fill=1, stroke=0)
            text(c, line, x + 38, yy, 9.5, MUTED)
    round_rect(c, 48, 83, 735, 72, 18, PAPER, LINE)
    text(c, "173개 후원기관이 연결될 때", 70, 124, 10, GREEN, True)
    paragraph(c, "개별 후원기관의 월 167건이 모여 전체 월 약 28,833건의 감사 접점을 만듭니다. 데이터는 기관별로 분리되지만, 서비스 운영 기준은 일관되게 유지됩니다.", 218, 127, 537, 9.6, 17, INK)
    c.showPage()


def trust(c):
    page_bg(c, 11, "10  신뢰와 도입")
    title_block(c, "TRUST & ONBOARDING", "기관별로 안전하게, 단계적으로 시작합니다", "운영 데이터는 기관 단위로 분리하고, 담당자에게 필요한 권한과 화면을 제공합니다.")
    # Left checklist
    round_rect(c, 48, 102, 353, 306, 22, PAPER, LINE)
    text(c, "운영 신뢰", 72, 369, 15, GREEN, True)
    checks = [
        ("기관별 데이터 분리", "다른 기관의 후원자·성과 정보와 분리"),
        ("개인정보 보호", "목록 화면 마스킹과 접근 범위 관리"),
        ("감사 기록", "주요 운영 활동의 이력 확인"),
        ("정산 가시성", "예정과 완료 상태를 구분해 추적"),
    ]
    for i, (ttl, body) in enumerate(checks):
        yy = 319 - i * 58
        icon_circle(c, 78, yy + 5, "✓", GREEN_2, WHITE, 26)
        text(c, ttl, 100, yy + 7, 10.5, INK, True)
        text(c, body, 100, yy - 11, 8.7, MUTED)
    # Right onboarding
    round_rect(c, 424, 102, 359, 306, 22, GREEN)
    text(c, "도입 4단계", 448, 369, 15, VANILLA, True)
    stages = [
        ("01", "기관 정보 등록", "기관명·연락처·브랜드 정보 설정"),
        ("02", "후원 채널 설정", "문자 코드·발신번호·캠페인 연결"),
        ("03", "운영자 확인", "권한, 문구, 정산 기준 점검"),
        ("04", "서비스 시작", "성과 모니터링과 후원자 관계 관리"),
    ]
    for i, (n, ttl, body) in enumerate(stages):
        yy = 324 - i * 61
        text(c, n, 450, yy + 5, 9, SAGE, True)
        text(c, ttl, 486, yy + 5, 10.5, WHITE, True)
        text(c, body, 486, yy - 13, 8.7, "#DDE9E2")
        if i < 3:
            c.setStrokeColor(hx(GREEN_2)); c.setLineWidth(1); c.line(460, yy - 23, 460, yy - 43)
    round_rect(c, 48, 70, 735, 20, 10, VANILLA)
    c.showPage()


def closing(c):
    c.setFillColor(hx(GREEN)); c.rect(0, 0, W, H, fill=1, stroke=0)
    image_crop(c, ASSET / "nanum-heart-hands.jpg", 500, 0, W - 500, H)
    c.saveState(); c.setFillColor(hx(GREEN)); c.setFillAlpha(0.24); c.rect(500, 0, W - 500, H, fill=1, stroke=0); c.restoreState()
    c.setFillColor(hx(GREEN_2)); c.circle(43, 40, 120, fill=1, stroke=0)
    brand_mark(c, 70, H - 66, 46)
    text(c, "나눔플러스", 106, H - 73, 17, WHITE, True)
    pill(c, "따뜻한 기술로 이어지는 나눔", 54, H - 157, GREEN_2, VANILLA)
    text(c, "기관의 좋은 일을", 54, H - 226, 31, WHITE, True)
    text(c, "더 오래 이어가도록", 54, H - 267, 31, VANILLA, True)
    paragraph(c, "나눔플러스는 후원자의 참여 순간부터 기관의 감사, 관리, 성과 확인까지 함께합니다.", 54, H - 312, 382, 12, 21, "#E4EEE8")
    round_rect(c, 54, 116, 385, 108, 20, PAPER)
    text(c, "도입 기준 요약", 76, 190, 10, GREEN, True)
    text(c, "현재 후원기관", 76, 162, 9, MUTED)
    text(c, "173곳", 212, 161, 13, INK, True)
    text(c, "전체 예상 MO / MT", 76, 137, 9, MUTED)
    text(c, "각 약 28,833건 / 월", 212, 136, 13, GREEN, True)
    text(c, "※ MT 이용요금은 계약 단가와 발송 정책에 따라 별도 산정됩니다.", 54, 78, 8.5, "#CBDAD2")
    text(c, "NANUMPLUS · SERVICE INTRODUCTION", 54, 44, 8, SAGE, True)
    c.showPage()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("나눔플러스 서비스 소개서")
    c.setAuthor("나눔플러스")
    c.setSubject("MO 후원 및 MT 문자 발송 예상치를 포함한 서비스 소개")
    cover(c)
    overview(c)
    network_snapshot(c)
    ecosystem(c)
    mo_mt_flow(c)
    estimate(c)
    scale(c)
    features(c)
    service_scenarios(c)
    value_story(c)
    trust(c)
    closing(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
