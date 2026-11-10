"""Превʼю PDF-схем для сайту: вирізає сітку/малюнок схеми з 1-ї сторінки PDF.
Результат: public/shemy-preview/<file>.webp + src/lib/pattern-previews.json (ширина/висота).
Запуск із папки site:  python scripts/make_pattern_previews.py
Перезапускати після додавання нових PDF у public/pdf/."""
import fitz, glob, json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image

SRC, OUT, META = 'public/pdf', 'public/shemy-preview', 'src/lib/pattern-previews.json'
MAXW, TOL = 720, 4


def grow(r, t):
    return fitz.Rect(r.x0 - t, r.y0 - t, r.x1 + t, r.y1 + t)


def union(a, b):
    """fitz.Rect | ігнорує «порожні» (нульової висоти) прямокутники — тож вручну."""
    return fitz.Rect(min(a.x0, b.x0), min(a.y0, b.y0), max(a.x1, b.x1), max(a.y1, b.y1))


def clusters(rects):
    """Злиття прямокутників, що торкаються (з допуском TOL). Лінії нульової товщини теж."""
    cl = [[fitz.Rect(r), 1] for r in rects]
    changed = True
    while changed:
        changed, out = False, []
        for c in cl:
            for o in out:
                if grow(o[0], TOL).intersects(grow(c[0], TOL)):
                    o[0] = union(o[0], c[0]); o[1] += c[1]; changed = True
                    break
            else:
                out.append(c)
        cl = out
    return cl


def scheme_box(page):
    W, H = page.rect.width, page.rect.height
    rs = [d['rect'] for d in page.get_drawings()
          if not (d['rect'].width < 3 and d['rect'].height < 3)
          and d['rect'].y0 > 60 and d['rect'].y1 < H - 40]
    if not rs:
        return None
    cl = clusters(rs)
    # сітка схеми = велика площа І багато елементів (лінійка має багато рисок, але малу площу)
    main = max(cl, key=lambda c: c[0].width * c[0].height * c[1] ** 0.5)[0]
    # домалювати частини того ж мотиву (листок/стебло під квіткою), але не таблиці легенди
    for r, n in cl:
        if r != main and n >= 10 and r.height >= 15 and r.width <= main.width * 1.2 and grow(main, 30).intersects(r):
            main = union(main, r)
    return grow(main, 8) & page.rect


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for f in sorted(glob.glob(f'{SRC}/*.pdf')):
        name = os.path.splitext(os.path.basename(f))[0]
        page = fitz.open(f)[0]
        box = scheme_box(page)
        if box is None:
            print('!! немає графіки:', name); continue
        zoom = min(4, MAXW / box.width)
        pm = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=box, alpha=False)
        im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
        im.save(f'{OUT}/{name}.webp', 'WEBP', quality=82, method=6)
        meta[name] = [im.width, im.height]
    json.dump(meta, open(META, 'w', encoding='utf-8'), indent=1, sort_keys=True)
    kb = sum(os.path.getsize(f'{OUT}/{n}.webp') for n in meta) // 1024
    print(f'{len(meta)} превʼю, разом {kb} KB')


if __name__ == '__main__':
    main()
