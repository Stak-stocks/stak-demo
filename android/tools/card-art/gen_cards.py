"""Generate Discover card art: every brand mark embossed into the glass ball.

    python gen_cards.py --sample AAPL TSLA SBUX   # preview sheet in .cache/sheet.png
    python gen_cards.py --all                     # write drawables + CardArt.kt
    python gen_cards.py --all --refresh           # re-pull the brand list first
"""
import argparse
import io
import json
import os
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ANDROID = os.path.normpath(os.path.join(HERE, "..", ".."))
RES_DIR = os.path.join(ANDROID, "app", "src", "main", "res", "drawable-nodpi")
KT_FILE = os.path.join(ANDROID, "app", "src", "main", "java", "com", "stak", "demo", "ui", "discover", "CardArt.kt")
CACHE = os.path.join(HERE, ".cache")
TEMPLATE = os.path.join(HERE, "basket_template.png")
BRANDS_URL = "https://stak-backend-889057229494.us-central1.run.app/api/brands"
UA = {"User-Agent": "Mozilla/5.0"}

# Ball geometry, as fractions of the template width (x, sizes) / height (y)
BALL_CX, BALL_CY = 0.5057, 0.437
MARK_W, MARK_H = 0.24, 0.245
OUT_W = 680  # 2x the 340dp art width


def safe(ticker):
    return re.sub(r"[^a-z0-9]", "_", ticker.lower())


def res_name(ticker):
    return "disc_art_" + safe(ticker)


# ------------------------------------------------------------------ extraction
def color_distance(img, color):
    r, g, b = ImageChops.difference(img, Image.new("RGB", img.size, color)).split()
    return ImageChops.add(ImageChops.add(r, g), b)


def ramp(dist, lo=45, hi=140):
    return dist.point(lambda v: 0 if v <= lo else 255 if v >= hi else int((v - lo) * 255 / (hi - lo)))


def border_color(tile):
    w, h = tile.size
    px = [tile.getpixel((x, y)) for x in range(0, w, 7) for y in (0, 6, h - 7, h - 1)]
    px += [tile.getpixel((x, y)) for y in range(0, h, 7) for x in (0, 6, w - 7, w - 1)]
    px.sort(key=sum)
    return px[len(px) // 2]


def dominant_color(tile, mask):
    counts = {}
    for c, a in zip(tile.resize((120, 120)).getdata(), mask.resize((120, 120)).getdata()):
        if a > 200:
            e = counts.setdefault((c[0] // 24, c[1] // 24, c[2] // 24), [0, 0, 0, 0])
            e[0] += c[0]; e[1] += c[1]; e[2] += c[2]; e[3] += 1
    if not counts:
        return None
    s = max(counts.values(), key=lambda e: e[3])
    return s[0] // s[3], s[1] // s[3], s[2] // s[3]


def count_on(img, box):
    return sum(1 for v in img.crop(box).getdata() if v > 128)


def rim_is(tile, mask, color, share=0.70):
    """True when `color` owns the outer edge of the foreground.

    A real badge (Starbucks, U.S. Bank) wraps its mark in one colour; a
    multi-colour mark (Microsoft's squares, CAT's yellow triangle) has other
    colours on its edge and must be embossed whole."""
    # Measured split with a 9px band: Starbucks 0.72 (lowest real badge) vs
    # CAT 0.67 (highest multi-colour mark) - retune against both if changed.
    rim = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(9)))
    dist = color_distance(tile, color)
    on = [d for r, d in zip(rim.getdata(), dist.getdata()) if r > 200]
    return bool(on) and sum(1 for d in on if d < 90) / len(on) > share


def glyph_mask(tile):
    mask = ramp(color_distance(tile, border_color(tile))).filter(ImageFilter.MedianFilter(3))
    bbox = mask.getbbox()
    if not bbox:
        return mask
    # Badge logos (Starbucks) are a filled disc carrying the real mark in a
    # second colour; embossing the whole badge loses the mark. A compact filled
    # foreground with a distinct inner colour means: lift the inner mark.
    area = count_on(mask, bbox)
    fill = area / ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
    dom = dominant_color(tile, mask)
    if dom is not None and fill > 0.65 and rim_is(tile, mask, dom):
        core = mask.filter(ImageFilter.MinFilter(9))  # drop the anti-aliased badge rim
        # High thresholds: only a strongly contrasting inner mark (white on
        # green) counts - tonal shading inside a single-colour mark (Netflix's
        # darker-red fold) must not.
        inner = ImageChops.multiply(ramp(color_distance(tile, dom), lo=150, hi=230), core)
        if 0.08 < count_on(inner, bbox) / area < 0.7:
            return inner.filter(ImageFilter.MedianFilter(3))
    return mask


# --------------------------------------------------------------------- emboss
def emboss(mask_full, box_w, box_h, k):
    bbox = mask_full.getbbox()
    if not bbox:
        return None
    a = mask_full.crop(bbox)
    s = min(box_w / a.width, box_h / a.height)
    a = a.resize((max(1, round(a.width * s)), max(1, round(a.height * s))), Image.LANCZOS)
    pad = round(40 * k)
    mask = Image.new("L", (a.width + pad * 2, a.height + pad * 2), 0)
    mask.paste(a, (pad, pad))
    w, h = mask.size
    L = lambda v: Image.new("L", (w, h), v)
    shift = ImageChops.offset
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # Shadow the mark casts on the back of the glass
    sh = shift(mask, round(4 * k), round(7 * k)).filter(ImageFilter.GaussianBlur(7 * k))
    out.alpha_composite(Image.merge("RGBA", (L(20), L(70), L(110), sh.point(lambda v: int(v * 0.35)))))
    # Extrusion: stacked copies down-right give the mark solid thickness
    steps = round(9 * k)
    for i in range(steps, 0, -1):
        shade = 70 + int(6 * i * 9 / steps)
        out.alpha_composite(Image.merge("RGBA", (
            L(int(shade * 0.55)), L(shade + 40), L(shade + 80),
            shift(mask, i, i).point(lambda v: int(v * 0.9)))))
    # Glass body, lighter at the top
    grad = Image.new("RGBA", (w, h))
    gd = ImageDraw.Draw(grad)
    top, bot = (208, 240, 250), (128, 196, 222)
    for y in range(h):
        t = y / max(1, h - 1)
        gd.line([(0, y), (w, y)], fill=tuple(int(top[c] + (bot[c] - top[c]) * t) for c in range(3)) + (255,))
    grad.putalpha(mask.point(lambda v: int(v * 0.95)))
    out.alpha_composite(grad)
    # Bevel: lit upper-left inside edge, shaded lower-right inside edge
    d = round(7 * k)
    hi = ImageChops.subtract(mask, shift(mask, d, d)).filter(ImageFilter.GaussianBlur(2.5 * k))
    out.alpha_composite(Image.merge("RGBA", (L(255), L(255), L(255), hi.point(lambda v: int(v * 0.95)))))
    lo = ImageChops.subtract(mask, shift(mask, -d, -d)).filter(ImageFilter.GaussianBlur(2.5 * k))
    out.alpha_composite(Image.merge("RGBA", (L(46), L(128), L(170), lo.point(lambda v: int(v * 0.70)))))
    return out


class Composer:
    def __init__(self):
        self.tpl = Image.open(TEMPLATE).convert("RGBA")
        W, H = self.tpl.size
        self.cx, self.cy = BALL_CX * W, BALL_CY * H
        self.box_w, self.box_h = MARK_W * W, MARK_H * W
        self.k = self.box_h / 235  # effects were tuned on a 235px-tall mark
        k = self.k
        sheen = Image.new("RGBA", self.tpl.size, (0, 0, 0, 0))
        ImageDraw.Draw(sheen).ellipse(
            (self.cx - 125 * k, self.cy - 140 * k, self.cx + 40 * k, self.cy - 30 * k), fill=(255, 255, 255, 45))
        self.sheen = sheen.filter(ImageFilter.GaussianBlur(22 * k))

    def compose(self, tile):
        logo = emboss(glyph_mask(tile), self.box_w, self.box_h, self.k)
        img = self.tpl.copy()
        if logo is not None:
            img.alpha_composite(logo, (round(self.cx - logo.width / 2), round(self.cy - logo.height / 2)))
        img.alpha_composite(self.sheen)
        return img.resize((OUT_W, round(img.height * OUT_W / img.width)), Image.LANCZOS)


# ---------------------------------------------------------------------- inputs
def load_brands(refresh):
    path = os.path.join(CACHE, "brands.json")
    if refresh or not os.path.exists(path):
        data = urllib.request.urlopen(urllib.request.Request(BRANDS_URL, headers=UA), timeout=30).read()
        with open(path, "wb") as f:
            f.write(data)
    with open(path, encoding="utf-8") as f:
        return json.load(f)["brands"]


FIXES_FILE = os.path.join(CACHE, "logo_fixes.json")
_fixes = {}


def download(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25).read()


def resolve_logo(ticker):
    """Real logo URL from TradingView's own symbol search.

    The backend's logo URLs are slugs built from company names, and ~1 in 6
    don't exist (403). The symbol search returns the actual logo id."""
    url = ("https://symbol-search.tradingview.com/symbol_search/v3/?text=%s&hl=0&exchange="
           "&lang=en&search_type=stocks&domain=production" % urllib.parse.quote(ticker))
    hdrs = dict(UA, Origin="https://www.tradingview.com", Referer="https://www.tradingview.com/")
    data = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=hdrs), timeout=20).read())
    syms = data.get("symbols", []) if isinstance(data, dict) else data
    exact = [s for s in syms if re.sub(r"</?em>", "", s.get("symbol", "")) == ticker]
    us = [s for s in exact if s.get("exchange") in ("NYSE", "NASDAQ", "NYSE Arca", "AMEX", "CBOE")]
    for s in us + exact:
        lid = s.get("logoid") or (s.get("logo") or {}).get("logoid")
        if lid:
            return "https://s3-symbol-logo.tradingview.com/%s--600.png" % lid
    return None


def load_tile(brand):
    path = os.path.join(CACHE, "logos", safe(brand["ticker"]) + ".png")
    if not os.path.exists(path):
        try:
            tile = Image.open(io.BytesIO(download(brand["logo"]))).convert("RGB")
        except (urllib.error.HTTPError, Image.UnidentifiedImageError):
            # 403 from a made-up slug, or a Brandfetch URL answering with HTML
            fixed = resolve_logo(brand["ticker"])
            if not fixed:
                raise
            tile = Image.open(io.BytesIO(download(fixed))).convert("RGB")
            _fixes[brand["ticker"]] = {"old": brand["logo"], "new": fixed}
        tile.save(path)
    return Image.open(path).convert("RGB")


def prefetch(brands):
    def one(b):
        try:
            load_tile(b)
            return None
        except Exception as e:  # noqa: BLE001 - report and carry on
            return b["ticker"], str(e)
    with ThreadPoolExecutor(8) as pool:
        failed = [r for r in pool.map(one, brands) if r]
    if _fixes:
        known = json.load(open(FIXES_FILE, encoding="utf-8")) if os.path.exists(FIXES_FILE) else {}
        known.update(_fixes)
        with open(FIXES_FILE, "w", encoding="utf-8") as f:
            json.dump(known, f, indent=1, sort_keys=True)
        print("repaired %d logo urls via symbol search (%d on file)" % (len(_fixes), len(known)))
    return failed


# ----------------------------------------------------------------------- modes
def sample(brands, tickers):
    brands = [b for b in brands if b["ticker"] in tickers]
    failed = dict(prefetch(brands))
    for t, why in sorted(failed.items()):
        print("  FAILED", t, "-", why)
    brands = [b for b in brands if b["ticker"] not in failed]
    comp = Composer()
    cards = [(b["ticker"], comp.compose(load_tile(b))) for b in brands]
    cols, tw = 4, 340
    th = round(tw * cards[0][1].height / cards[0][1].width)
    rows = (len(cards) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 18)), (12, 18, 30))
    dr = ImageDraw.Draw(sheet)
    for i, (t, c) in enumerate(cards):
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        sheet.paste(c.convert("RGB").resize((tw, th), Image.LANCZOS), (x, y + 18))
        dr.text((x + 6, y + 3), t, fill=(255, 255, 255))
    out = os.path.join(CACHE, "sheet.png")
    sheet.save(out)
    print("sheet:", out)


def build_all(brands):
    # Hand-made cards in manual/<TICKER>.png win over generated ones
    manual_dir = os.path.join(HERE, "manual")
    manual = ({os.path.splitext(f)[0]: os.path.join(manual_dir, f) for f in os.listdir(manual_dir)}
              if os.path.isdir(manual_dir) else {})
    failed = dict(prefetch([b for b in brands if b.get("logo") and b["ticker"] not in manual]))
    for b in brands:
        if not b.get("logo") and b["ticker"] not in manual:
            failed[b["ticker"]] = "no logo url"
    for f in os.listdir(RES_DIR):
        if f.startswith("disc_art_"):
            os.remove(os.path.join(RES_DIR, f))
    comp = Composer()
    written = {}
    for b in brands:
        t = b["ticker"]
        if t in failed:
            continue
        name = res_name(t)
        if name in written.values():
            failed[t] = "resource name collision: " + name
            continue
        try:
            if t in manual:
                img = Image.open(manual[t]).convert("RGB")
                img = img.resize((OUT_W, round(img.height * OUT_W / img.width)), Image.LANCZOS)
            else:
                img = comp.compose(load_tile(b)).convert("RGB")
            img.save(os.path.join(RES_DIR, name + ".webp"), "WEBP", quality=82)
            written[t] = name
        except Exception as e:  # noqa: BLE001
            failed[t] = str(e)
    lines = [
        "package com.stak.demo.ui.discover",
        "",
        "import com.stak.demo.R",
        "",
        "// Generated by android/tools/card-art/gen_cards.py - do not edit by hand.",
        "internal val CARD_ART: Map<String, Int> = mapOf(",
    ]
    lines += ['\t"%s" to R.drawable.%s,' % (t, n) for t, n in sorted(written.items())]
    lines += [")", ""]
    with open(KT_FILE, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print("wrote %d cards, %d failed" % (len(written), len(failed)))
    for t, why in sorted(failed.items()):
        print("  FAILED", t, "-", why)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", nargs="+", metavar="TICKER")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    os.makedirs(os.path.join(CACHE, "logos"), exist_ok=True)
    all_brands = load_brands(args.refresh)
    if args.sample:
        sample(all_brands, set(args.sample))
    elif args.all:
        build_all(all_brands)
    else:
        ap.print_help()
