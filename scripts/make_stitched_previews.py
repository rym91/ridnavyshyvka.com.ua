"""Візуалізація «як виглядатиме вишитим» для рахункових схем хрестиком.
Читає клітинки й символи (вектор) з 1-ї сторінки PDF і малює хрестики нитками на канві.
Результат: public/shemy-vyshyte/<file>.webp + src/lib/pattern-stitched.json.
Запуск із папки site:  python scripts/make_stitched_previews.py  (після make_pattern_previews.py)."""
import colorsys, glob, json, os, statistics, sys
import fitz
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__))
from make_pattern_previews import scheme_box  # noqa: E402

OUT, META = "public/shemy-vyshyte", "src/lib/pattern-stitched.json"
CELL, PAD, SS = 18, 18, 3          # px на клітинку, поля, суперсемплінг
AIDA, HOLE = (244, 238, 226), (222, 212, 196)


def thread(rgb):
    """Колір символу на схемі -> колір нитки (трохи насиченіший, не «екранний»)."""
    h, l, s = colorsys.rgb_to_hls(*rgb)
    if s < 0.15:                       # чорний/сірий
        return (34, 30, 30) if l < 0.5 else (150, 150, 150)
    return tuple(round(x * 255) for x in colorsys.hls_to_rgb(h, min(max(l, 0.30), 0.62), min(1, s * 1.05)))


def read_grid(page):
    box = scheme_box(page)
    ds = [d for d in page.get_drawings() if box.contains(d["rect"])]
    cells = [d["rect"] for d in ds if d["type"] == "f" and d.get("fill") and min(d["fill"]) > 0.97
             and abs(d["rect"].width - d["rect"].height) < 1 and d["rect"].width > 6]
    if len(cells) < 20:
        return read_grid_old(ds)
    c = statistics.median(r.width for r in cells)
    x0, y0 = min(r.x0 for r in cells), min(r.y0 for r in cells)
    cols = round((max(r.x1 for r in cells) - x0) / c)
    rows = round((max(r.y1 for r in cells) - y0) / c)
    grid = {}
    for d in ds:
        r = d["rect"]
        col = d.get("color") if d["type"] == "s" else d.get("fill")
        if not col or min(col) > 0.97:
            continue
        if not (0.3 * c <= max(r.width, r.height) <= 0.95 * c) or min(r.width, r.height) < 0.3 * c:
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        i, j = int((cx - x0) // c), int((cy - y0) // c)
        if 0 <= i < cols and 0 <= j < rows:
            grid[(i, j)] = thread(col)
    return cols, rows, grid


def read_grid_old(ds):
    """Старий формат (весільні/базові схеми): тоновані лише заповнені клітинки, сітка — лініями."""
    tinted = [d["rect"] for d in ds if d["type"] == "f" and d.get("fill") and min(d["fill"]) > 0.8
              and abs(d["rect"].width - d["rect"].height) < 0.5 and d["rect"].width > 6]
    if not tinted:
        return None
    c = statistics.median(r.width for r in tinted)
    longv = [d["rect"] for d in ds if d["type"] == "s" and d["rect"].width < 1 and d["rect"].height > 3 * c]
    longh = [d["rect"] for d in ds if d["type"] == "s" and d["rect"].height < 1 and d["rect"].width > 3 * c]
    if not (longv and longh):
        return None
    x0, x1 = min(r.x0 for r in longv), max(r.x0 for r in longv)
    y0, y1 = min(r.y0 for r in longh), max(r.y0 for r in longh)
    cols, rows = round((x1 - x0) / c), round((y1 - y0) / c)
    grid = {}
    for d in ds:
        r = d["rect"]
        col = d.get("color") if d["type"] == "fs" else d.get("fill") if d["type"] == "f" else None
        if not col or min(col) > 0.8 or not (0.25 * c <= max(r.width, r.height) <= 0.8 * c):
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        i, j = int((cx - x0) // c), int((cy - y0) // c)
        if 0 <= i < cols and 0 <= j < rows:
            grid[(i, j)] = thread(col)
    return cols, rows, grid


def render(cols, rows, grid):
    k = CELL * SS
    W, H = cols * k + 2 * PAD * SS, rows * k + 2 * PAD * SS
    im = Image.new("RGB", (W, H), AIDA)
    dr = ImageDraw.Draw(im)
    ox = oy = PAD * SS
    for i in range(cols + 1):          # отвори канви
        for j in range(rows + 1):
            x, y = ox + i * k, oy + j * k
            dr.ellipse([x - 2 * SS, y - 2 * SS, x + 2 * SS, y + 2 * SS], fill=HOLE)
    w = int(k * 0.30)
    inset = int(k * 0.12)
    for (i, j), col in grid.items():
        x0, y0 = ox + i * k + inset, oy + j * k + inset
        x1, y1 = ox + (i + 1) * k - inset, oy + (j + 1) * k - inset
        dark = tuple(int(v * 0.72) for v in col)
        light = tuple(min(255, int(v + (255 - v) * 0.35)) for v in col)
        dr.line([x0, y1, x1, y0], fill=dark, width=w)          # нижній стібок «/»
        dr.line([x0, y0, x1, y1], fill=col, width=w)           # верхній стібок «\»
        dr.line([x0 + w * 0.3, y0 + w * 0.05, x1 - w * 0.2, y1 - w * 0.45], fill=light, width=max(1, w // 4))
    im = im.filter(ImageFilter.GaussianBlur(SS * 0.35))
    return im.resize((W // SS, H // SS), Image.LANCZOS)


def main(files):
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name in files:
        g = read_grid(fitz.open(f"public/pdf/{name}.pdf")[0])
        if not g or not g[2]:
            print("!! пропуск", name); continue
        im = render(*g)
        im.save(f"{OUT}/{name}.webp", "WEBP", quality=82, method=6)
        meta[name] = [im.width, im.height]
        print(f"{name}: {g[0]}×{g[1]}, хрестиків {len(g[2])}")
    json.dump(meta, open(META, "w", encoding="utf-8"), indent=1, sort_keys=True)
    print(len(meta), "візуалізацій")


if __name__ == "__main__":
    # лише рахункові хрестиком: файли з patterns.ts з kind hrestyk / rizdvo
    import re
    src = open("src/lib/patterns.ts", encoding="utf-8").read()
    files = re.findall(r"file: '([^']+)'[^}]*kind: '(?:hrestyk|rizdvo)'", src)
    main(files)
