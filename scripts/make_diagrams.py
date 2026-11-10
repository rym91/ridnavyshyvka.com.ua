"""Власні навчальні схеми стежків і плетіння (SVG) для статей.
Результат: public/diagrams/*.svg. Запуск із папки site:  python scripts/make_diagrams.py
Кольори — з палітри сайту; фон білий (сайт світлий)."""
import math, os, sys
sys.stdout.reconfigure(encoding="utf-8")

OUT = "public/diagrams"
RED, RED_D, INK, SOFT, LINE, PAPER = "#b3122b", "#7d0c1e", "#1a1714", "#6b6058", "#e6dccd", "#faf7f2"
BLUE, GOLD, GREEN = "#2f5d8a", "#c9971c", "#3c7a4a"
FONT = "font-family=\"system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif\""


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-label="{title}"><title>{title}</title>'
            f'<rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>\n')


def t(x, y, s, size=14, fill=INK, anchor="start", weight="400"):
    return f'<text x="{x}" y="{y}" {FONT} font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{s}</text>'


def ln(x1, y1, x2, y2, c=INK, w=2, dash=None, cap="round"):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}" stroke-linecap="{cap}"{d}/>'


def arrow_defs():
    out = "<defs>"
    for name, c in (("aR", RED), ("aB", BLUE), ("aI", INK), ("aS", SOFT)):
        out += (f'<marker id="{name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>')
    return out + "</defs>"


def aida(x0, y0, cols, rows, c):
    """Канва аїда: клітинки з отворами в кутах."""
    s = f'<rect x="{x0}" y="{y0}" width="{cols*c}" height="{rows*c}" fill="{PAPER}" stroke="{LINE}"/>'
    for i in range(cols + 1):
        for j in range(rows + 1):
            s += f'<circle cx="{x0+i*c}" cy="{y0+j*c}" r="2.6" fill="#cfc3b2"/>'
    return s


# ─────────────────────────── 1. Як вишити хрестик ───────────────────────────
def cross_stitch():
    c, W, H = 44, 760, 310
    b = arrow_defs()
    b += t(20, 30, "Як вишити хрестик: спершу ряд напівхрестиків, потім — назад", 17, INK, weight="700")
    panels = [(20, "1. Ряд «/» зліва направо"), (275, "2. Назад: стібки «\\»"), (530, "3. Верхні стібки — в один бік")]
    y0 = 90
    for px, cap in panels:
        b += t(px, 66, cap, 14, RED_D, weight="600")
    # панель 1: напівхрестики + виворіт пунктиром
    x0 = 20
    b += aida(x0, y0, 4, 3, c)
    r = 1
    for i in range(4):
        b += ln(x0 + i*c, y0 + (r+1)*c, x0 + (i+1)*c, y0 + r*c, RED, 5)
        if i < 3:
            b += ln(x0 + (i+1)*c, y0 + r*c + 4, x0 + (i+1)*c, y0 + (r+1)*c - 4, SOFT, 1.5, "4 4")
    b += t(x0 + 2, y0 + (r+1)*c + 20, "1", 13, BLUE, weight="700") + t(x0 + c + 4, y0 + r*c - 6, "2", 13, BLUE, weight="700")
    b += t(x0 + c - 12, y0 + (r+1)*c + 20, "3", 13, BLUE, weight="700")
    b += ln(x0, y0 + 3*c + 34, x0 + 4*c, y0 + 3*c + 34, BLUE, 2) .replace("/>", ' marker-end="url(#aB)"/>')
    b += t(x0, y0 + 3*c + 56, "голка: 1 вгору → 2 вниз → 3 вгору", 12.5, SOFT)
    b += t(x0, y0 + 3*c + 74, "пунктир — нитка на вивороті", 12.5, SOFT)
    # панель 2: повернення
    x0 = 275
    b += aida(x0, y0, 4, 3, c)
    for i in range(4):
        b += ln(x0 + i*c, y0 + (r+1)*c, x0 + (i+1)*c, y0 + r*c, RED, 5)
    for i in range(3, 0, -1):
        b += ln(x0 + i*c, y0 + r*c, x0 + (i+1)*c, y0 + (r+1)*c, RED_D, 5)
    b += ln(x0 + c, y0 + r*c, x0 + 2*c, y0 + (r+1)*c, RED_D, 5, "2 6")
    b += ln(x0 + 4*c, y0 + 3*c + 34, x0, y0 + 3*c + 34, BLUE, 2).replace("/>", ' marker-end="url(#aB)"/>')
    b += t(x0, y0 + 3*c + 56, "ідемо справа наліво й закриваємо", 12.5, SOFT)
    b += t(x0, y0 + 3*c + 74, "кожен напівхрестик другим стібком", 12.5, SOFT)
    # панель 3: правильно / неправильно
    x0 = 530
    sc = 34
    b += aida(x0, y0, 5, 1, sc) + aida(x0, y0 + 80, 5, 1, sc)
    for i in range(5):
        X, Y = x0 + i*sc, y0
        b += ln(X, Y + sc, X + sc, Y, RED, 4) + ln(X, Y, X + sc, Y + sc, RED_D, 4.5)
        Y = y0 + 80
        if i % 2:
            b += ln(X, Y, X + sc, Y + sc, RED, 4) + ln(X, Y + sc, X + sc, Y, RED_D, 4.5)
        else:
            b += ln(X, Y + sc, X + sc, Y, RED, 4) + ln(X, Y, X + sc, Y + sc, RED_D, 4.5)
    b += t(x0 + 5*sc + 12, y0 + 24, "✓", 22, GREEN, weight="700")
    b += t(x0 + 5*sc + 12, y0 + 104, "✗", 22, RED, weight="700")
    b += t(x0, y0 + 56, "рівна, гладка поверхня", 12.5, SOFT)
    b += t(x0, y0 + 136, "верх «стрибає» — видно на світлі", 12.5, SOFT)
    b += t(x0, y0 + 3*c + 56, "Одна клітинка схеми =", 12.5, SOFT)
    b += t(x0, y0 + 3*c + 74, "один хрестик на канві", 12.5, SOFT)
    return svg(W, H, b, "Схема: як вишити хрестик — ряд напівхрестиків і повернення")


# ─────────────────────────── 2. Як читати схему ───────────────────────────
HEART = ["..XX...XX..", ".XOOX.XOOX.", "XOOOOXOOOOX", "XOOOOOOOOOX", "XOOOOOOOOOX",
         ".XOOOOOOOX.", "..XOOOOOX..", "...XOOOX...", "....XOX....", ".....X....."]


def read_scheme():
    c, W, H = 20, 760, 400
    cols, rows = 20, 14
    x0, y0 = 40, 70
    b = arrow_defs()
    b += t(20, 32, "Як читати схему хрестиком", 17, INK, weight="700")
    b += f'<rect x="{x0}" y="{y0}" width="{cols*c}" height="{rows*c}" fill="#fff"/>'
    for i in range(cols + 1):
        b += ln(x0 + i*c, y0, x0 + i*c, y0 + rows*c, INK if i % 10 == 0 else "#cfc3b2", 2 if i % 10 == 0 else 1, cap="butt")
    for j in range(rows + 1):
        b += ln(x0, y0 + j*c, x0 + cols*c, y0 + j*c, INK if j % 10 == 0 else "#cfc3b2", 2 if j % 10 == 0 else 1, cap="butt")
    ox, oy = 5, 2
    for j, row in enumerate(HEART):
        for i, ch in enumerate(row):
            X, Y = x0 + (ox + i)*c, y0 + (oy + j)*c
            if ch == "X":
                b += f'<rect x="{X+3}" y="{Y+3}" width="{c-6}" height="{c-6}" fill="{RED_D}"/>'
            elif ch == "O":
                b += f'<rect x="{X+4}" y="{Y+4}" width="{c-8}" height="{c-8}" fill="none" stroke="{RED}" stroke-width="2"/>'
    # стрілки центру
    cx, cy = x0 + cols*c/2, y0 + rows*c/2
    b += f'<path d="M{cx-7},{y0-16} L{cx+7},{y0-16} L{cx},{y0-3} z" fill="{BLUE}"/>'
    b += f'<path d="M{x0-16},{cy-7} L{x0-16},{cy+7} L{x0-3},{cy} z" fill="{BLUE}"/>'
    # підписи праворуч
    tx = x0 + cols*c + 30
    notes = [
        (BLUE, "1. Центр", "трикутники на краях вказують середину", "схеми — починайте звідти"),
        (INK, "2. Товсті лінії", "ділять сітку на квадрати 10×10 —", "так легше рахувати"),
        (RED_D, "3. Символ = колір", "кожен значок відповідає нитці", "з легенди під схемою"),
        (SOFT, "4. Порожня клітинка", "не вишивається — там лишається", "тканина"),
    ]
    for k, (col, h, l1, l2) in enumerate(notes):
        Y = y0 + 6 + k*70
        b += t(tx, Y + 12, h, 14.5, col, weight="700") + t(tx, Y + 32, l1, 12.5, SOFT) + t(tx, Y + 50, l2, 12.5, SOFT)
    # легенда
    ly = y0 + rows*c + 30
    b += t(x0, ly, "Легенда:", 13, INK, weight="700")
    b += f'<rect x="{x0+70}" y="{ly-14}" width="16" height="16" fill="{RED_D}"/>' + t(x0 + 94, ly, f"DMC 815 — контур, {sum(r.count('X') for r in HEART)} хр.", 12.5, SOFT)
    b += f'<rect x="{x0+290}" y="{ly-14}" width="16" height="16" fill="none" stroke="{RED}" stroke-width="2"/>' + t(x0 + 314, ly, f"DMC 321 — заливка, {sum(r.count('O') for r in HEART)} хр.", 12.5, SOFT)
    return svg(W, H, b, "Як читати схему вишивки хрестиком: центр, квадрати 10 на 10, символи та легенда")


# ─────────────────────────── 3. Плетіння «навхрест» ───────────────────────────
def bead(x, y, r=11, fill="#f1e6d3", stroke="#9c8b77", hole=True):
    s = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
    if hole:
        s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{stroke}" opacity=".45"/>'
    return s


def path(pts, c, w=2.4, marker=None, dash=None):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    m = f' marker-end="url(#{marker})"' if marker else ""
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{m}{da}/>'


def cross_weave():
    W, H = 760, 310
    b = arrow_defs()
    b += t(20, 32, "Плетіння «навхрест» на дві голки: кожен хрестик — 4 бісерини", 17, INK, weight="700")
    d = 30  # пів-розмах хрестика
    def unit(cx, cy):
        return {"L": (cx - d, cy), "T": (cx, cy - d), "B": (cx, cy + d), "R": (cx + d, cy)}
    # панель 1
    p1 = unit(120, 165)
    b += t(20, 72, "1. Перший хрестик", 14, RED_D, weight="600")
    L, T, B, R = p1["L"], p1["T"], p1["B"], p1["R"]
    b += path([(R[0]+38, R[1]-22), R, T, L], RED, marker=None)
    b += path([L, B, R, (R[0]+38, R[1]+22)], BLUE, marker="aB")
    b += f'<circle cx="{R[0]+38}" cy="{R[1]-22}" r="3.5" fill="{RED}"/>' 
    for k in "LTBR":
        b += bead(*p1[k], fill="#fff4d6" if k == "R" else "#f1e6d3")
    b += t(20, 250, "Наберіть 4 бісерини на середину", 12.5, SOFT)
    b += t(20, 268, "нитки, кінець пропустіть крізь 4-ту", 12.5, SOFT)
    b += t(20, 286, "назустріч — вийде кільце.", 12.5, SOFT)
    # панель 2
    b += t(255, 72, "2. Наступний хрестик", 14, RED_D, weight="600")
    a, n = unit(310, 165), unit(310 + 2*d, 165)
    b += path([a["R"], n["T"], n["R"], (n["R"][0]+38, n["R"][1]-22)], RED, marker="aR")
    b += path([a["R"], n["B"], n["R"], (n["R"][0]+38, n["R"][1]+22)], BLUE, marker="aB")
    for k in "LTB":
        b += bead(*a[k], fill="#e8e1d6", stroke="#b8ab9a")
    b += bead(*a["R"])
    b += bead(*n["T"], fill="#fde0e4") + bead(*n["B"], fill="#dde8f3") + bead(*n["R"], fill="#fff4d6")
    b += t(255, 250, "Обидва кінці виходять зі спільної бісерини;", 12.5, SOFT)
    b += t(255, 268, "на кожен — по 1 бісерині, далі одна (жовта)", 12.5, SOFT)
    b += t(255, 286, "на один кінець, другий — крізь неї назустріч.", 12.5, SOFT)
    # панель 3: ланцюжок
    b += t(530, 72, "3. Ланцюжок", 14, RED_D, weight="600")
    cx0 = 545
    for u in range(3):
        un = unit(cx0 + d + u*2*d, 165)
        if u == 0:
            b += bead(*un["L"])
        b += bead(*un["T"]) + bead(*un["B"]) + bead(*un["R"])
    b += t(530, 250, "Хрестики з'єднуються спільною", 12.5, SOFT)
    b += t(530, 268, "бісериною — виходить ажурна", 12.5, SOFT)
    b += t(530, 286, "стрічка для силянки чи браслета.", 12.5, SOFT)
    return svg(W, H, b, "Плетіння бісером навхрест на дві голки: перший хрестик, наступний хрестик, ланцюжок")


# ─────────────────────────── 4. Мозаїчне плетіння ───────────────────────────
def peyote():
    W, H = 760, 290
    b = arrow_defs()
    b += t(20, 32, "Мозаїчне плетіння: бісерини лягають «цеглинками», зі зсувом на пів намистини", 17, INK, weight="700")
    bw, bh = 26, 34   # намистина «стоїть» отвором уздовж ряду
    cols, rows = 10, 5
    x0, y0 = 40, 70
    pal = ["#f1e6d3", "#fde0e4", RED]
    pattern = [[0,1,0,1,0,1,0,1,0,1],[0,0,2,0,0,0,0,2,0,0],[0,2,2,2,0,0,2,2,2,0],[0,0,2,0,0,0,0,2,0,0],[1,0,1,0,1,0,1,0,1,0]]
    def pos(i, j):
        return x0 + i*bw, y0 + j*bh + (bh/2 if i % 2 else 0)
    for j in range(rows):
        for i in range(cols):
            X, Y = pos(i, j)
            f = pal[pattern[j][i]]
            b += f'<rect x="{X+1.5}" y="{Y+1.5}" width="{bw-3}" height="{bh-3}" rx="9" fill="{f}" stroke="#9c8b77" stroke-width="1.3"/>'
    # новий ряд: бісерини в «ямках» + шлях нитки
    jr = rows
    pts = []
    for i in range(cols):
        X, Y = pos(i, jr)
        if i % 2 == 0:
            b += f'<rect x="{X+1.5}" y="{Y+1.5}" width="{bw-3}" height="{bh-3}" rx="9" fill="#fff4d6" stroke="{GOLD}" stroke-width="1.6"/>'
        else:
            X, Y = pos(i, jr - 1)
        pts.append((X + bw/2, Y + bh/2))
    b += path([(pts[0][0]-30, pts[0][1])] + pts + [(pts[-1][0]+30, pts[-1][1])], BLUE, 2.2, "aB")
    tx = x0 + cols*bw + 40
    for k, (h, l1, l2) in enumerate([
        ("Новий ряд (жовті)", "набирайте 1 бісерину й проходьте", "крізь «виступну» бісерину ряду нижче"),
        ("Сітка схеми", "клітинки теж зсунуті — читайте", "схему рядами, як цеглу в кладці"),
        ("Чому щільно", "кожна намистина затиснута сусідами —", "браслет тримає форму й не тягнеться"),
    ]):
        Y = y0 + 4 + k*72
        b += t(tx, Y + 12, h, 14.5, RED_D, weight="700") + t(tx, Y + 32, l1, 12.5, SOFT) + t(tx, Y + 50, l2, 12.5, SOFT)
    return svg(W, H, b, "Мозаїчне плетіння бісером: бісерини лягають зі зсувом, новий ряд у проміжках попереднього")


# ─────────────────────────── 5. Ткацьке плетіння на станку ───────────────────────────
def loom():
    W, H = 760, 330
    b = arrow_defs()
    b += t(20, 32, "Ткацьке плетіння на станку: бісер лягає між нитками основи", 17, INK, weight="700")
    n, bw, bh = 7, 30, 26
    x0, y0, rows = 70, 96, 6
    pal = {0: "#f1e6d3", 1: RED, 2: "#2b2522"}
    pat = [[0,0,0,1,0,0,0],[0,0,1,2,1,0,0],[0,1,2,0,2,1,0],[0,0,1,2,1,0,0],[0,0,0,1,0,0,0],[0,0,0,0,0,0,0]]
    for i in range(n + 1):
        X = x0 + i*bw
        b += ln(X, y0 - 26, X, y0 + rows*bh + 30, "#8d7f70", 1.6)
    for j in range(rows - 1):
        for i in range(n):
            X, Y = x0 + i*bw, y0 + j*bh
            b += f'<rect x="{X+2.5}" y="{Y+2}" width="{bw-5}" height="{bh-4}" rx="8" fill="{pal[pat[j][i]]}" stroke="#9c8b77" stroke-width="1.2"/>'
    # поточний ряд
    Y = y0 + (rows - 1)*bh
    for i in range(n):
        X = x0 + i*bw
        b += f'<rect x="{X+2.5}" y="{Y+2}" width="{bw-5}" height="{bh-4}" rx="8" fill="#fff4d6" stroke="{GOLD}" stroke-width="1.5"/>'
    yb = Y + bh + 16  # під основою
    b += path([(x0 - 30, Y + bh/2), (x0 - 12, yb), (x0 + n*bw + 12, yb), (x0 + n*bw + 30, Y + bh/2 + 4)], RED, 2.4, dash="6 4")
    b += path([(x0 + n*bw + 30, Y + bh/2 - 4), (x0 + n*bw + 8, Y + bh/2), (x0 - 8, Y + bh/2), (x0 - 34, Y + bh/2 - 14)], BLUE, 2.4, "aB")
    b += t(x0 + n*bw/2, yb + 22, "1 — під основою (пунктир)", 12.5, RED, "middle", "600")
    b += t(x0 + n*bw/2, y0 - 32, "нитки основи", 12.5, SOFT, "middle")
    tx = x0 + n*bw + 70
    for k, (col, h, l1, l2) in enumerate([
        (RED, "1. Набрати ряд", "наберіть на робочу нитку стільки бісерин,", "скільки клітинок у рядку схеми; підведіть під основу"),
        (INK, "2. Підтиснути", "пальцем вдавіть бісер угору, щоб кожна", "намистина стала між двома нитками основи"),
        (BLUE, "3. Назад поверх", "проведіть голку назад крізь усі бісерини", "ряду — тепер уже над нитками основи"),
    ]):
        Yk = y0 - 16 + k*70
        b += t(tx, Yk + 12, h, 14.5, col, weight="700") + t(tx, Yk + 32, l1, 12.5, SOFT) + t(tx, Yk + 50, l2, 12.5, SOFT)
    return svg(W, H, b, "Ткацьке плетіння бісером на станку: ряд бісеру під основою і проведення нитки назад поверх основи")


# ─────────────────────────── 6. Гладь ───────────────────────────
def satin():
    W, H = 760, 320
    b = arrow_defs()
    b += t(20, 32, "Гладь: контур, напрямок стібків і настил", 17, INK, weight="700")
    def petal(cx, cy, s=1.0):
        return (f"M{cx},{cy-95*s} C{cx+70*s},{cy-60*s} {cx+70*s},{cy+50*s} {cx},{cy+95*s} "
                f"C{cx-70*s},{cy+50*s} {cx-70*s},{cy-60*s} {cx},{cy-95*s} Z")
    centers = [(130, 180, "1. Контур стебловим швом"), (380, 180, "2. Стібки впритул, під кутом"), (630, 180, "3. Опукла гладь — з настилом")]
    for k, (cx, cy, cap) in enumerate(centers):
        b += t(cx, 66, cap, 14, RED_D, "middle", "600")
        cid = f"p{k}"
        b += f'<defs><clipPath id="{cid}"><path d="{petal(cx, cy)}"/></clipPath></defs>'
        b += f'<path d="{petal(cx, cy)}" fill="{PAPER}"/>'
        if k >= 1:
            g = f'<g clip-path="url(#{cid})">'
            if k == 2:   # настил: дрібні стібки поперек майбутньої гладі
                for o in range(-120, 121, 12):
                    g += ln(cx - 140, cy + o - 50, cx + 140, cy + o + 50, "#e9b8bf", 3)
            step = 6 if k == 2 else 7
            top = ""
            for o in range(-200, 201, step):
                top += ln(cx + o - 100, cy + 140, cx + o + 100, cy - 140, RED if k == 1 else RED_D, 3.4 if k == 2 else 3)
            if k == 2:   # гладь лише зверху — знизу видно настил
                top = f'<g clip-path="url(#{cid}h)">{top}</g>'
                b += f'<defs><clipPath id="{cid}h"><rect x="{cx-100}" y="{cy-120}" width="200" height="130"/></clipPath></defs>'
                b += t(cx + 76, cy + 52, "настил", 12, SOFT)
                b += ln(cx + 74, cy + 48, cx + 30, cy + 40, SOFT, 1.2)
            b += g + top + "</g>"
        b += f'<path d="{petal(cx, cy)}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-dasharray="{"7 3" if k == 0 else "0"}"/>'
    b += t(130, 300, "тримає край, гладь не «розповзається»", 12.5, SOFT, "middle")
    b += t(380, 300, "один напрямок по всьому елементу", 12.5, SOFT, "middle")
    b += t(630, 300, "спершу настил поперек, зверху — гладь", 12.5, SOFT, "middle")
    return svg(W, H, b, "Вишивка гладдю: контур стебловим швом, рівні стібки під кутом, опукла гладь із настилом")


DIAGRAMS = {
    "hrestyk-yak-vyshyty": cross_stitch,
    "yak-chytaty-shemu": read_scheme,
    "pletinnya-navkhrest": cross_weave,
    "mozayichne-pletinnya": peyote,
    "tkatske-pletinnya-verstat": loom,
    "vyshyvka-gladdyu-shema": satin,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in DIAGRAMS.items():
        open(f"{OUT}/{name}.svg", "w", encoding="utf-8").write(fn())
    print(f"{len(DIAGRAMS)} схем → {OUT}/")
