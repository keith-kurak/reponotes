"""Generates the RepoNotes app icons.

Design: a note page with a folded corner, two text lines and a small commit
graph (notes kept in a repository).

Run from the repo root:  python3 scripts/generate-icons.py
Needs Pillow. Writes to assets/images/.
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path("assets/images")
SIZE = 1024
SCALE = 4  # draw at 4x, then downsample for smooth edges

BLUE_TOP = (36, 150, 255)
BLUE_BOTTOM = (0, 84, 214)
PAGE = (255, 255, 255)
FOLD = (198, 222, 255)
LINE = (178, 206, 245)
ACCENT = (10, 108, 255)


def gradient(size, top, bottom):
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        color = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (size, y)], fill=color + (255,))
    return img


def glyph(scale, colors, cutout=False):
    """Draws the page glyph on a transparent 1024 canvas.

    scale: glyph size relative to the iOS icon (1.0).
    colors: dict with page, fold, line, accent RGBA tuples.
    cutout: draw details as transparent holes (monochrome icons).
    """
    s = SIZE * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def p(x, y):
        # 1024-space coordinate around the center, scaled
        return (
            (512 + (x - 512) * scale) * SCALE,
            (512 + (y - 512) * scale) * SCALE,
        )

    def r(v):
        return v * scale * SCALE

    # Page with a folded top-right corner
    left, top, right, bottom = 287, 200, 737, 824
    fold = 132
    radius = 64
    page_box = [p(left, top), p(right, bottom)]
    draw.rounded_rectangle(page_box, radius=r(radius), fill=colors["page"])
    # cut the corner, then draw the fold
    clear = (0, 0, 0, 0)
    draw.polygon([p(right - fold, top - 2), p(right + 2, top - 2), p(right + 2, top + fold)], fill=clear)
    draw.rectangle([p(right - fold, top - 2), p(right + 2, top + 2)], fill=clear)
    detail = clear if cutout else None
    draw.polygon(
        [p(right - fold, top), p(right - fold, top + fold), p(right, top + fold)],
        fill=detail or colors["fold"],
    )

    # Two text lines
    for y, length in ((330, 200), (412, 300)):
        draw.rounded_rectangle(
            [p(367, y - 22), p(367 + length, y + 22)],
            radius=r(22),
            fill=detail or colors["line"],
        )

    # Commit graph: main line with two commits, a branch to a third commit
    accent = detail or colors["accent"]
    width = r(30)
    main_x, top_y, bottom_y = 407, 548, 732
    branch = (587, 640)
    draw.line([p(main_x, top_y), p(main_x, bottom_y)], fill=accent, width=round(width))
    # branch curve (quadratic Bezier from the top commit to the branch commit)
    points = []
    start, ctrl, end = (main_x, top_y + 50), (main_x, branch[1]), branch
    for i in range(41):
        t = i / 40
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * ctrl[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * ctrl[1] + t**2 * end[1]
        points.append(p(x, y))
    draw.line(points, fill=accent, width=round(width), joint="curve")
    # round cap where the branch leaves the main line
    cap = 15
    draw.ellipse([p(start[0] - cap, start[1] - cap), p(start[0] + cap, start[1] + cap)], fill=accent)
    for cx, cy in ((main_x, top_y), (main_x, bottom_y), branch):
        rad = 46
        draw.ellipse([p(cx - rad, cy - rad), p(cx + rad, cy + rad)], fill=accent)

    return img.resize((SIZE, SIZE), Image.LANCZOS)


def rounded_mask(size, radius):
    s = size * SCALE
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=radius * SCALE, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    light = {"page": PAGE + (255,), "fold": FOLD + (255,), "line": LINE + (255,), "accent": ACCENT + (255,)}

    # iOS / default icon: full-bleed square (the OS rounds the corners)
    background = gradient(SIZE, BLUE_TOP, BLUE_BOTTOM)
    icon = Image.alpha_composite(background, glyph(1.0, light))
    icon.convert("RGB").save(OUT / "icon.png")

    # iOS 18 dark icon: transparent background, the system adds a dark one
    dark = {
        "page": (222, 232, 245, 255),
        "fold": (150, 180, 220, 255),
        "line": (140, 170, 210, 255),
        "accent": (64, 150, 255, 255),
    }
    glyph(1.0, dark).save(OUT / "icon-dark.png")

    # iOS 18 tinted icon: grayscale, the system applies the tint
    tinted = glyph(1.0, light, cutout=True)
    gray_bg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    Image.alpha_composite(gray_bg, tinted).convert("L").save(OUT / "icon-tinted.png")

    # Android adaptive icon: the glyph must fit the 66% safe circle
    glyph(0.78, light).save(OUT / "android-icon-foreground.png")
    gradient(SIZE, BLUE_TOP, BLUE_BOTTOM).convert("RGB").save(OUT / "android-icon-background.png")
    glyph(0.78, light, cutout=True).save(OUT / "android-icon-monochrome.png")

    # Splash: the icon with rounded corners on a transparent background
    splash = icon.copy()
    splash.putalpha(rounded_mask(SIZE, 230))
    splash.save(OUT / "splash-icon.png")

    # Favicon
    splash.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
