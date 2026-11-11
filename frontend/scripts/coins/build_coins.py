"""Build the Discover deck's glass coins: Figma's coin style for every company.

Figma draws five companies (NVIDIA, Apple, Google, Amazon, Shopify) as pre-rendered glass coins
(public/figma/discover/*-1_2-*.png); the deck keeps those exactly. Every other company gets the same glass coin with
its own logo raised in frosted glass (coinkit.py explains how it is made and calibrated):

  public/coins/coin.webp, coin-b.webp, coin-c.webp
                                      the empty glass (Figma's own, logo removed; lossless), upright and turned
                                      +2.5 / -2.5 degrees about the face's centre: Figma's five coins each have a
                                      slightly different outline, so each company takes one of the three by its ticker
                                      (glass_index(), FNV-1a, the same as companyCoin() in assets.ts)
  public/coins/marks/<TICKER>.webp    one overlay per company with a prepared mark, drawn for the glass its ticker takes
  public/coins/letters/<A-Z|0-9>.webp a lettermark overlay (Sora Bold initial) for every company without a mark; one
                                      file serves many tickers, so it is drawn to be right on all three glass files

and rewrites the generated tables between `// <coin-marks>` and `// </coin-marks>` in src/app/discover/assets.ts.
Every overlay is checked as it is written: the coin as the app draws it (the glass, the overlay over it) must be within
MAX_ERROR levels of the exact render on every glass file it can be drawn on, at every pixel; WebP quality 90 is raised
(95, 100, then lossless) until it is, and the run fails, naming the overlay, if even lossless is not.
A company added to the catalog later needs nothing: it shows the lettermark of its name's initial. To give it its own
mark, add a single-colour vector mark and run ONE command (Python 3.10+ with numpy, Pillow (WebP) and fontTools):

  python frontend/scripts/coins/build_coins.py --add TICKER=path/to/mark.svg --company "Company" --source "where from"
  python frontend/scripts/coins/build_coins.py --add TICKER=fa:IconName          # Font Awesome Free brands (installed)
  python frontend/scripts/coins/build_coins.py --add TICKER=si:slug --si-dir DIR  # Simple Icons, extracted package

  The mark must be the company's CURRENT logo in one colour. The SVG may use <path>, <rect>, <circle>, <ellipse>,
  <polygon>, <polyline>, groups, transforms and fill-rule (evenodd or nonzero); --add refuses, with the reason, any file
  that would not draw as a plain single-colour fill (strokes, several colours, transparency, clip paths, masks,
  filters, <use>, <image>, <text>, CSS <style> rules): convert such a logo to plain filled paths first. Check the new
  coin on the contact sheet before you ship it (--sheet). Simple Icons: fetch it as data only, never install it or run
  its scripts: `mkdir si && cd si && npm pack simple-icons@<version> --ignore-scripts`, extract the .tgz there (for
  example Python's tarfile with filter="data") and pass `--si-dir si/package` (marks.json pins the version the vetted
  marks came from).

Other runs:
  python frontend/scripts/coins/build_coins.py                 render every mark in marks.json and every lettermark
  python frontend/scripts/coins/build_coins.py --only PG,KO    re-render some tickers (and refresh the tables)
  python frontend/scripts/coins/build_coins.py --remove SPY    drop a mark (its vector, its overlay and its marks.json
                                                               entry; the company shows its lettermark again)
  python frontend/scripts/coins/build_coins.py --empty         rebuild the glass from Figma's coins (then re-render all)
  python frontend/scripts/coins/build_coins.py --sheet out.png contact sheet of every coin, for review
  python frontend/scripts/coins/build_coins.py --self-test     check the SVG reader (fill rules, shapes, transforms,
                                                               refusals) and two renders end to end; writes nothing
  --jobs N renders N overlays at a time (default 4; about 5-15 s each).
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True  # no __pycache__ in the repo
sys.path.insert(0, str(Path(__file__).resolve().parent))
import coinkit as ck  # noqa: E402

HERE = Path(__file__).resolve().parent
FRONTEND = HERE.parents[1]
PUBLIC = FRONTEND / "public" / "coins"
FIGMA = FRONTEND / "public" / "figma" / "discover"
ASSETS_TS = FRONTEND / "src" / "app" / "discover" / "assets.ts"
MARKS_JSON = HERE / "marks.json"
MARKS_DIR = HERE / "marks"
FA_DIR = FRONTEND.parent / "node_modules" / "@fortawesome" / "free-brands-svg-icons"
LETTER_FONT = FRONTEND / "public" / "fonts" / "sora_bold.ttf"
LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)] + [str(d) for d in range(10)]
WEBP = dict(quality=90, alpha_quality=100, method=6)
# the encodings tried in turn (lossy colour, lossless alpha): the first whose coin is within MAX_ERROR levels of the exact
# render everywhere ships. Quality 90 passes for most; the misses are colour fringes of WebP's half-resolution chroma
# where a thin bright rim meets the dark band on the glyph's top face.
ENCODINGS = (("q90", dict(WEBP)), ("q95", dict(WEBP, quality=95)), ("q100", dict(WEBP, quality=100)),
             ("lossless", dict(lossless=True, quality=100, method=6)))
MAX_ERROR = 24.0
# the glass files: the upright glass and two turned copies (degrees, counter-clockwise), about the face's centre
GLASSES = (("coin.webp", 0.0), ("coin-b.webp", 2.5), ("coin-c.webp", -2.5))
FACE_CENTRE = (250.0, 248.0)
FA_NOTE = "<!-- Font Awesome Free {v} by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0) Copyright Fonticons, Inc. -->"


def figma_coin(name):
    return np.asarray(Image.open(FIGMA / f"{name}.png").convert("RGBA"))


def _save_lossless(rgba, path):
    Image.fromarray(rgba, "RGBA").save(path, "WEBP", lossless=True, quality=100, method=6, exact=True)


def load_glass(rebuild=False):
    """The empty glass files as RGBA arrays (upright first); with rebuild, made again from Figma's coins."""
    path = PUBLIC / GLASSES[0][0]
    if rebuild or not path.exists():
        print("building the empty coin from Figma's Amazon, Shopify and Apple coins ...", flush=True)
        rgba = ck.empty_coin(figma_coin("5-amazon-1_2-5725"), figma_coin("4-shopify-1_2-5735"), figma_coin("7-apple-1_2-5740"))
        PUBLIC.mkdir(parents=True, exist_ok=True)
        _save_lossless(rgba, path)
    rgba = np.asarray(Image.open(path).convert("RGBA"))
    out = [rgba]
    for name, angle in GLASSES[1:]:
        if rebuild or not (PUBLIC / name).exists():
            # premultiplied, so the transparent surround does not bleed into the rim; turned at 2x for a clean edge
            im = Image.fromarray(rgba, "RGBA").convert("RGBa").resize((1000, 1000), Image.LANCZOS)
            im = im.rotate(angle, resample=Image.BICUBIC, center=(FACE_CENTRE[0] * 2, FACE_CENTRE[1] * 2))
            _save_lossless(np.asarray(im.resize((500, 500), Image.LANCZOS).convert("RGBA")), PUBLIC / name)
            print("glass", name, flush=True)
        out.append(np.asarray(Image.open(PUBLIC / name).convert("RGBA")))
    return out


def glass_index(ticker: str) -> int:
    """Which glass a ticker takes: FNV-1a of the ticker, as companyCoin() in assets.ts computes it."""
    h = 2166136261
    for ch in ticker:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h % len(GLASSES)


def glasses_for(kind, name):
    """The glass files an overlay is drawn on: a mark's ticker always takes the same one; a lettermark serves tickers
    on all three."""
    return [glass_index(name)] if kind == "mark" else list(range(len(GLASSES)))


def render_overlay(shapes, glasses, place, on):
    """The overlay for the glass files `on` (indices into `glasses`) and the render it comes from: the shadow's alpha is
    fitted over those glasses (coinkit.overlay_layers) and stays inside each one's outline."""
    s, tx, ty = place
    L = ck.render(shapes, s, tx, ty, glasses[on[0]][..., :3].astype(np.float64))
    rgba = ck.overlay_layers(L, np.min([glasses[i][..., 3] for i in on], axis=0),
                             bases=[glasses[i][..., :3].astype(np.float64) for i in on])
    return rgba, L


def encode_overlay(rgba, L, glasses, on):
    """The overlay as WebP: the first of ENCODINGS whose coin is within MAX_ERROR levels of the exact render on every
    glass in `on`. Returns (bytes, encoding, worst error in levels); the worst is above MAX_ERROR only when even the
    lossless file is (the colour fit itself is off: the run then fails)."""
    for label, opts in ENCODINGS:
        buf = io.BytesIO()
        Image.fromarray(rgba, "RGBA").save(buf, "WEBP", **opts)
        shown = np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert("RGBA"))
        worst = max(float(ck.coin_error(shown, L, glasses[i]).max()) for i in on)
        if worst <= MAX_ERROR:
            break
    return buf.getvalue(), label, worst


_GLASS = None  # the glass files, loaded once per worker process


def make_overlay(job):
    """Render, encode, check and write one overlay: job = ("mark", ticker) or ("letter", char). Returns a report row."""
    global _GLASS
    kind, name = job
    if _GLASS is None:
        _GLASS = load_glass()
    if kind == "mark":
        shapes = ck.svg_shapes((MARKS_DIR / f"{name}.svg").read_text(encoding="utf-8"))
        place = ck.placement(shapes)
        path = PUBLIC / "marks" / f"{name}.webp"
    else:
        cap = ck.bounds(ck.glyph_shapes(str(LETTER_FONT), "H"))
        shapes = ck.glyph_shapes(str(LETTER_FONT), name)
        place = ck.letter_placement(shapes, cap[3] - cap[1])
        path = PUBLIC / "letters" / f"{name}.webp"
    on = glasses_for(kind, name)
    rgba, L = render_overlay(shapes, _GLASS, place, on)
    data, label, worst = encode_overlay(rgba, L, _GLASS, on)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return kind, name, label, len(data), worst


def run_jobs(jobs, workers):
    """make_overlay() over the jobs, `workers` processes at a time, the reports in order."""
    if workers == 1:
        yield from map(make_overlay, jobs)
        return
    with ProcessPoolExecutor(workers) as ex:
        yield from ex.map(make_overlay, jobs)


def fa_svg(name):
    js = (FA_DIR / f"fa{name}.js").read_text(encoding="utf-8")  # read as data: the path string and the viewBox
    w = int(re.search(r"var width = (\d+);", js).group(1))
    h = int(re.search(r"var height = (\d+);", js).group(1))
    d = re.search(r"var svgPathData = '([^']+)';", js).group(1)
    version = json.loads((FA_DIR / "package.json").read_text(encoding="utf-8"))["version"]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{FA_NOTE.format(v=version)}<path d="{d}"/></svg>\n', version


def add_mark(spec, company, source, si_dir, marks):
    ticker, _, ref = spec.partition("=")
    ticker = ticker.strip().upper()
    if not ticker or not ref:
        raise SystemExit(f"--add needs TICKER=<file.svg | si:slug | fa:Name>, got {spec!r}")
    if ref.startswith("fa:"):
        svg, version = fa_svg(ref[3:])
        entry = {"source": f"font-awesome-free@{version}", "id": ref[3:], "license": "CC BY 4.0 (Font Awesome Free); the mark is its owner's trademark"}
    elif ref.startswith("si:"):
        if not si_dir:
            raise SystemExit("si:<slug> needs --si-dir <extracted simple-icons package>")
        pkg = Path(si_dir)
        svg = (pkg / "icons" / f"{ref[3:]}.svg").read_text(encoding="utf-8")
        version = json.loads((pkg / "package.json").read_text(encoding="utf-8"))["version"]
        entry = {"source": f"simple-icons@{version}", "id": ref[3:], "license": "CC0-1.0 (Simple Icons data); the mark is its owner's trademark"}
    else:
        svg = Path(ref).read_text(encoding="utf-8")
        entry = {"source": source or str(ref), "id": Path(ref).stem, "license": "see source"}
    try:
        ck.svg_shapes(svg)  # refuses, with the reason, anything that would not draw as a plain single-colour fill
    except ck.MarkError as e:
        raise SystemExit(f"{ticker}: {ref} cannot be used as a coin mark: {e}") from None
    MARKS_DIR.mkdir(parents=True, exist_ok=True)
    (MARKS_DIR / f"{ticker}.svg").write_text(svg, encoding="utf-8")
    entry["company"] = company or marks.get(ticker, {}).get("company", ticker)
    marks[ticker] = entry
    return ticker


def remove_mark(ticker, marks):
    """Drop a company's mark: its vector (marks/<T>.svg), its overlay (public/coins/marks/<T>.webp) and its marks.json
    entry. The company shows the lettermark of its initial again once the tables are rewritten."""
    ticker = ticker.strip().upper()
    if ticker not in marks:
        raise SystemExit(f"--remove {ticker}: marks.json has no mark for it")
    del marks[ticker]
    for path in (MARKS_DIR / f"{ticker}.svg", PUBLIC / "marks" / f"{ticker}.webp"):
        if path.exists():
            path.unlink()
    print(f"removed the mark of {ticker}: it shows its lettermark again", flush=True)
    return ticker


def short_hash(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()[:8]


def write_tables(marks):
    """The generated block of src/app/discover/assets.ts: the glass files, every prepared mark and every lettermark,
    each with a content hash so a re-rendered file is fetched again."""
    glass = [f"/coins/{name}?v={short_hash(PUBLIC / name)}" for name, _ in GLASSES]
    mk = {t: short_hash(PUBLIC / "marks" / f"{t}.webp") for t in sorted(marks) if (PUBLIC / "marks" / f"{t}.webp").exists()}
    lt = {c: short_hash(PUBLIC / "letters" / f"{c}.webp") for c in LETTERS if (PUBLIC / "letters" / f"{c}.webp").exists()}

    def obj(d):
        items = [f'{json.dumps(k) if not re.fullmatch(r"[A-Z_][A-Z0-9_]*", k) else k}: "{v}"' for k, v in d.items()]
        lines, line = [], "\t"
        for it in items:
            if len(line) + len(it) + 2 > 118:
                lines.append(line.rstrip())
                line = "\t"
            line += it + ", "
        lines.append(line.rstrip())
        return "{\n" + "\n".join(lines) + "\n}"

    block = (
        "// <coin-marks> generated by frontend/scripts/coins/build_coins.py: do not edit by hand, run the script\n"
        "/** The empty glass: upright, and turned +2.5 / -2.5 degrees (public/coins/coin*.webp). */\n"
        f"const COIN_GLASS: readonly string[] = [{', '.join(json.dumps(g) for g in glass)}];\n"
        "/** Tickers with a prepared mark (public/coins/marks/<TICKER>.webp) and its content hash. */\n"
        f"const COIN_MARKS: Readonly<Record<string, string>> = {obj(mk)};\n"
        "/** Lettermarks (public/coins/letters/<char>.webp) for every company without a prepared mark. */\n"
        f"const COIN_LETTERS: Readonly<Record<string, string>> = {obj(lt)};\n"
        "// </coin-marks>"
    )
    src = ASSETS_TS.read_text(encoding="utf-8")
    new, n = re.subn(r"// <coin-marks>.*?// </coin-marks>", lambda _: block, src, flags=re.S)
    if n != 1:
        raise SystemExit("assets.ts has no `// <coin-marks>` ... `// </coin-marks>` block to update")
    if new != src:
        ASSETS_TS.write_text(new, encoding="utf-8")
    print(f"assets.ts: {len(glass)} glass files, {len(mk)} marks, {len(lt)} lettermarks")
    write_attribution(marks)


# where a mark's source string comes from, for ATTRIBUTION.txt: (test, heading). The first match wins; an icon package
# (simple-icons@x, font-awesome-free@x) is listed under its own version string.
PROVENANCE = (
    (lambda s: "upload.wikimedia.org/wikipedia/commons/" in s or "commons.wikimedia.org" in s,
     "Wikimedia Commons: the company's own logo file (upload.wikimedia.org/wikipedia/commons)"),
    (lambda s: "upload.wikimedia.org/wikipedia/en/" in s or "en.wikipedia.org" in s,
     "English Wikipedia: the official logo as uploaded to en.wikipedia.org (a non-free logo file there, not on Commons)"),
    (lambda s: "s3-symbol-logo.tradingview.com" in s,
     "TradingView symbol logos (s3-symbol-logo.tradingview.com, the service the app already uses), each checked against the company's own current mark"),
    (lambda s: re.search(r"\.(ttf|otf|woff2?)\b", s) is not None,
     "The company's own website icon font: the glyph the site draws its logo with (the official shapes, taken from the font)"),
    (lambda s: True,
     "The company's own website, press file or CDN (a note after the URL says which part of that file the mark is)"),
)
PACKAGE_NOTES = {"simple-icons": "Simple Icons, https://simpleicons.org (CC0-1.0 data; third-party redraws of the official marks, from the earlier track)",
                 "font-awesome-free": "Font Awesome Free by @fontawesome, https://fontawesome.com (icons CC BY 4.0, https://fontawesome.com/license/free)"}


def write_attribution(marks):
    """public/coins/ATTRIBUTION.txt: where every prepared mark comes from (Font Awesome Free asks for attribution), grouped
    by provenance: the icon packages first (TICKER (Company: icon id)), then one line per mark taken from a file or page
    (TICKER (Company): URL), under the kind of place it was taken from."""
    packages, groups = {}, {h: [] for _, h in PROVENANCE}
    for t, e in sorted(marks.items()):
        src, company = e.get("source", "?"), e.get("company", t)
        pkg = next((k for k in PACKAGE_NOTES if src.startswith(k + "@")), None)
        if pkg:
            packages.setdefault(src, []).append(f"{t} ({company}: {e.get('id', '')})")
        else:
            heading = next(h for test, h in PROVENANCE if test(src))
            groups[heading].append(f"{t} ({company}): {src}")
    lines = [
        "Discover deck glass coins (public/coins/), made by frontend/scripts/coins/build_coins.py.",
        "coin*.webp: Figma's own glass coin (STAK design file), logo removed. Lettermarks: the Sora typeface (SIL OFL 1.1).",
        "Company marks are trademarks of their owners, shown to identify the companies. Each mark is the company's own",
        "current logo in one colour, from the file or icon package named below; the same table is",
        "frontend/scripts/coins/marks.json. Sources of the vector marks, by where they were taken from:",
        "",
    ]
    for src, items in packages.items():
        lines += [f"{src}: {PACKAGE_NOTES[src.partition('@')[0]]}", "  " + ", ".join(items), ""]
    for heading, items in groups.items():
        if items:
            lines += [f"{heading} ({len(items)}):"] + [f"  {it}" for it in items] + [""]
    (PUBLIC / "ATTRIBUTION.txt").write_text("\n".join(lines), encoding="utf-8")


def contact_sheet(out, marks):
    from PIL import ImageDraw, ImageFont

    glasses = [Image.open(PUBLIC / name).convert("RGBA") for name, _ in GLASSES]
    tiles = [(f"{t}", PUBLIC / "marks" / f"{t}.webp", glass_index(t)) for t in sorted(marks)] + [(f"letter {c}", PUBLIC / "letters" / f"{c}.webp", 0) for c in LETTERS]
    T, cols = 160, 10
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * T, rows * (T + 18)), (20, 40, 68))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(FRONTEND / "public" / "fonts" / "geist_medium.ttf"), 12)
    for i, (label, path, gi) in enumerate(tiles):
        coin = glasses[gi].copy()
        if path.exists():
            coin.alpha_composite(Image.open(path).convert("RGBA"))
        x, y = (i % cols) * T, (i // cols) * (T + 18)
        small = coin.resize((T, T), Image.LANCZOS)
        sheet.paste(small, (x, y), small)
        draw.text((x + 6, y + T + 1), label, fill=(200, 210, 225), font=font)
    sheet.save(out)
    print("contact sheet:", out)


def self_test():
    ck.selftest()
    glass = [np.asarray(Image.open(PUBLIC / n).convert("RGBA")) for n, _ in GLASSES] if all((PUBLIC / n).exists() for n, _ in GLASSES) else None
    if glass is not None:
        ring = ck.svg_shapes('<svg viewBox="0 0 100 100"><g transform="translate(5 5) scale(0.9)"><path fill-rule="evenodd" '
                             'd="M50 0a50 50 0 1 1 0 100a50 50 0 1 1 0-100zM50 30a20 20 0 1 1 0 40a20 20 0 1 1 0-40z"/></g></svg>')
        s, tx, ty = ck.placement(ring)
        cx, cy = int(round(50 * s + tx)), int(round(50 * s + ty))
        # a lettermark (drawn for all three glass files) and a mark (drawn for the one its ticker takes)
        for on in (list(range(len(GLASSES))), [glass_index("TSLA")]):
            ov, L = render_overlay(ring, glass, (s, tx, ty), on)
            assert ov[cy, cx, 3] < 255 and ov[cy - 60, cx, 3] == 255, "the ring's hole must stay open on the coin"
            for i in on:
                assert not (ov[..., 3] > 0)[glass[i][..., 3] == 0].any(), "the overlay must stay on the glass it is drawn on"
                assert float(ck.coin_error(ov, L, glass[i]).max()) <= MAX_ERROR, f"the overlay must match the exact render on glass {i}"
            flat = (L.a == 0) & (ov[..., :3] == np.round(ck.SHADOW_TINT).astype(np.uint8)).all(-1)
            assert not (ov[..., 3][flat] % ck.SHADOW_STEP).any(), "the flat shadow's alpha moves in steps of SHADOW_STEP"
            data, label, worst = encode_overlay(ov, L, glass, on)
            assert worst <= MAX_ERROR, f"the encoded overlay ({label}) is {worst:.1f} levels off the exact render"
    print("self-test passed: SVG reader (fill rules, shapes, transforms, CSS keywords, refusals, unreadable values)"
          + (" and two end-to-end renders (a lettermark on every glass, a mark on its own)" if glass is not None else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--add", action="append", default=[], help="TICKER=<file.svg | si:slug | fa:Name>")
    ap.add_argument("--company", help="company name for --add")
    ap.add_argument("--source", help="where the mark comes from (for --add with a file)")
    ap.add_argument("--si-dir", help="an extracted simple-icons package (for si:slug)")
    ap.add_argument("--remove", action="append", default=[], help="TICKER: drop its mark (vector, overlay, marks.json entry); it shows its lettermark again")
    ap.add_argument("--only", help="comma-separated tickers / letters to render (default: everything)")
    ap.add_argument("--empty", action="store_true", help="rebuild the glass from Figma's coins")
    ap.add_argument("--no-letters", action="store_true", help="skip the lettermarks")
    ap.add_argument("--sheet", help="write a contact sheet of every coin to this path")
    ap.add_argument("--jobs", type=int, default=min(4, os.cpu_count() or 1), help="overlays rendered at a time (default 4)")
    ap.add_argument("--self-test", action="store_true", help="check the SVG reader and two renders; writes nothing")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    marks = json.loads(MARKS_JSON.read_text(encoding="utf-8")) if MARKS_JSON.exists() else {}
    removed = [remove_mark(t, marks) for t in args.remove]
    added = [add_mark(spec, args.company, args.source, args.si_dir, marks) for spec in args.add]
    if added or removed:
        MARKS_JSON.write_text(json.dumps(dict(sorted(marks.items())), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    global _GLASS
    _GLASS = load_glass(rebuild=args.empty)
    # what to render: --only's list; else the marks just added (a removal alone renders nothing, the tables are
    # rewritten below); else everything
    only = {t.strip().upper() for t in args.only.split(",")} if args.only else (set(added) if added or removed else None)
    if args.empty:
        only = None  # every overlay is drawn against the glass: all of them follow it

    jobs = [("mark", t) for t in sorted(marks) if only is None or t in only]
    if not args.no_letters:
        jobs += [("letter", c) for c in LETTERS if only is None or c in only]
    off = []
    for kind, name, label, size, worst in run_jobs(jobs, max(1, min(args.jobs, len(jobs) or 1))):
        print(f"{kind} {name}: {label}, {size / 1000:.1f} kB, at most {worst:.1f} levels off the exact render", flush=True)
        if worst > MAX_ERROR:
            off.append(f"{kind} {name} ({worst:.1f})")
    write_tables(marks)
    if args.sheet:
        contact_sheet(args.sheet, marks)
    if off:
        raise SystemExit(f"{len(off)} overlay(s) more than {MAX_ERROR:g} levels off the exact render even lossless: {', '.join(off)}")


if __name__ == "__main__":
    main()
