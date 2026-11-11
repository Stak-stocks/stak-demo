"""coinkit: Figma's glass coin for any company (the library behind build_coins.py).

Figma draws a company as ONE pre-rendered 500 x 500 image: an icy glass squircle with the company's logo raised in
frosted glass on its face (public/figma/discover/*-1_2-*.png, five companies). This module makes the same thing for
any single-colour vector mark:

  * svg_shapes(): the mark's filled shapes from an SVG file (see "What an SVG mark may use" below).
  * empty_coin(): Figma's own glass with the logo taken off. The base is Figma's Amazon coin (the smallest logo),
    moved (-1, -9) px onto the NVIDIA coin's outline (the coin the deck frame 2:3060 draws); the smile and the shadow
    under it are inpainted (biharmonic fill), and the arrowhead's shadow, which reaches the rim, is divided out against
    Figma's Shopify + Apple glass (both clean there).
  * render(): the mark as a raised, extruded, frosted glyph lit from the upper left. The mark is rasterised on a 4 x 4
    sub-pixel grid; every sample is either the top face, or the extrusion wall seen there (found by marching from the
    sample back along the extrusion to the first point inside the mark: the wall's depth t in 0..1 and the outline's
    normal there), or glass; each sample is shaded once and the 16 samples of a pixel are averaged. So the walls shade
    continuously (no stacked layers, no bands) and no wall colour bleeds into the top face's anti-aliased edge. The top
    face is graded from icy white to cyan, with a soft bright rim where its edge faces the light and a dark rounded
    band just inside the edge where it faces away; the walls carry a light line along their top on right-facing sides
    and darken toward the foot; the shadow on the glass is a sum of blurred, shifted copies of the raised shape. Every
    value was calibrated against Figma's five coins (top-face colour per region, colour profiles across the outline,
    wall and shadow darkening by distance from the face; .claude/tools/coins-2026-10-30/fix): Figma's walls are about
    7 px deep to the right and 11 px down, its shadow about 40 levels dark at the foot and still about 10 at 45 px.
    Marks whose strokes are thinner than Amazon's smile (a mean stroke of 2 x area / perimeter under 13 px, mostly
    wordmarks) get a proportionally shallower slab, rim and shadow, so their walls do not read as a second outline.
  * overlay_layers(): the RGBA layer that turns the empty coin into the rendered coin when composited over it (the
    glyph over one flat shadow tint at a smooth alpha, never outside the glass), so the app ships one shared glass plus
    one small file per company. The shadow's alpha is fitted over every glass file the overlay will be drawn on (a
    company's mark: its own; a lettermark: all three), with its colour fitted per pixel only where one alpha of the tint
    cannot match them all; coin_error() measures the result against the exact render on a glass.

Lengths are px of the 500-px coin frame. Mark placement (measured on Figma's NVIDIA, Apple, Shopify, Amazon and
Google glyphs): the mark's bounding box is centred at (248, 243.5) and sized so that sqrt(w * h) = 209.5, at most
244 wide and 234 tall (a wide mark such as Amazon's smile comes out wide and short, a compact one fills the same area).

What an SVG mark may use: <path>, <rect> (rx / ry), <circle>, <ellipse>, <polygon>, <polyline>, inside <svg> / <g> /
<a>, with a transform (matrix, translate, scale, rotate, skewX, skewY) on any of them, one fill colour, and a fill-rule
(nonzero or evenodd, as an attribute or in style="", inherited) per shape; the CSS-wide keywords inherit / initial /
unset resolve as a browser resolves them. Anything that would draw differently from a plain single-colour fill is
refused with a MarkError instead of being drawn wrong: strokes, several fill colours, semi-transparent fills (opacity,
fill-opacity, rgba() / #rrggbbaa alpha), clip paths, masks, filters, <use>, <image>, <text>, nested <svg>, CSS <style>
rules; so is anything the reader cannot convert (an unreadable number, colour or path data): svg_shapes() raises
nothing but MarkError, with the reason. selftest() checks all of this (build_coins.py --self-test).

Requires Python 3.10+, numpy, Pillow (with WebP) and fontTools.
"""
from __future__ import annotations

import math
import re
import xml.etree.ElementTree as ET

import numpy as np
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path

SIZE = 500
SS = 4  # sub-pixel samples per px (per axis) for the glyph
CENTRE = (248.0, 243.5)
GEOMEAN, MAX_W, MAX_H = 209.5, 244.0, 234.0

# The shadow of the raised shape on the glass, fitted to Figma's (non-negative least squares over Apple, Shopify and
# NVIDIA): a sum of copies of the raised shape blurred by `sigma` and moved by (x, y), each darkening the glass by its
# weight times SHADOW_SHADE (red falls most), plus a thin contact line along the foot.
SHADOW_SHADE = (1.587, 0.838, 0.694)  # per channel, relative to the luminance
SHADOWS = (  # (sigma, x, y, weight)
    (28.0, 0.0, 0.0, 0.01235),
    (2.0, 5.14, 6.13, 0.00491),
    (2.0, 8.36, 9.96, 0.00302),
    (2.0, 6.1, 11.48, 0.01292),
    (2.0, 8.92, 16.78, 0.01437),
    (2.0, 4.92, 18.35, 0.00964),
    (2.0, 12.21, 22.96, 0.01348),
    (2.0, 6.73, 25.11, 0.00113),
    (4.0, 21.85, 26.05, 0.00643),
    (8.0, 21.85, 26.05, 0.00655),
    (4.0, 15.96, 30.02, 0.01871),
    (2.0, 27.0, 32.17, 0.00239),
    (4.0, 27.0, 32.17, 0.01796),
    (2.0, 19.72, 37.08, 0.00082),
    (28.0, 19.72, 37.08, 0.06629),
    (2.0, 10.87, 40.57, 0.00158),
    (4.0, 10.87, 40.57, 0.01393),
    (8.0, 10.87, 40.57, 0.01374),
    (28.0, 10.87, 40.57, 0.07366),
)
CONTACT = (1.0, 0.5, 0.8, (0.05, 0.03, 0.025))  # (sigma, x, y, darkening of R, G, B)

PARAMS = dict(
    depth=(7.0, 11.0),  # the extrusion's projected offset, top face -> foot
    stroke_ref=13.0,  # a mean stroke under this (Amazon's smile: 14) gets a shallower slab ...
    depth_min=0.35,  # ... down to this share of the depth (a 5-px wordmark)
    light=(-0.62, -0.78),  # toward the light: the dark band faces away from it
    face_light=(-0.53, -0.848),  # the top face's light-to-shade direction
    top_light=(250.0, 253.0, 255.0),
    top_dark=(118.0, 196.0, 219.0),
    top_gain=1.2,
    top_curve=1.15,
    rim_light=(-0.45, -0.89),  # the bright rim is strongest on upward-facing edges
    rim_sigma=2.0,
    rim_color=(236.0, 252.0, 255.0),
    rim_amount=0.75,
    dark_inset=1.1,  # the dark rounded band: its distance inside the edge and its width
    dark_sigma=0.9,
    rim_dark=(100.0, 172.0, 198.0),
    dark_amount=1.0,
    normal_sigma=1.2,  # smoothing of the outline normal that shades the walls
    edge_color=(145.0, 206.0, 225.0),  # the light line along the top of right-facing walls
    edge_t=0.4,
    wall_right=(104.0, 169.0, 190.0),
    wall_down=(86.0, 159.0, 185.0),
    wall_base=0.95,  # the walls darken by 5 % toward the foot
    gloss=dict(t=0.45, width=0.1, amount=0.2, color=(140.0, 200.0, 220.0)),
    shadows=SHADOWS,
    shadow_shade=SHADOW_SHADE,
    contact=CONTACT,
)


# ---------------------------------------------------------------------------------------------------- vector marks


class MarkError(ValueError):
    """The SVG uses something a coin mark cannot be drawn from faithfully."""


class _PolyPen(BasePen):
    """Flattens a path into closed polylines (curve steps of about 1/4 output px for the given scale)."""

    def __init__(self, scale=1.0, glyph_set=None):
        super().__init__(glyph_set)  # a font's glyph set resolves composite glyphs (Sora's 9 is built from its 6)
        self.scale, self.contours, self.cur = scale, [], []

    def _moveTo(self, p):
        self._flush()
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curve(self, pts, n_from_len):
        n = int(max(4, min(400, n_from_len * self.scale / 0.25)))
        t = np.linspace(0, 1, n + 1)[1:]
        mt = 1 - t
        if len(pts) == 4:
            p0, p1, p2, p3 = pts
            x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
            y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        else:
            p0, p1, p2 = pts
            x = mt**2 * p0[0] + 2 * mt * t * p1[0] + t**2 * p2[0]
            y = mt**2 * p0[1] + 2 * mt * t * p1[1] + t**2 * p2[1]
        self.cur.extend(zip(x.tolist(), y.tolist()))

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in ((p0, p1), (p1, p2), (p2, p3)))
        self._curve((p0, p1, p2, p3), L)

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in ((p0, p1), (p1, p2)))
        self._curve((p0, p1, p2), L)

    def _closePath(self):
        self._flush()

    def _endPath(self):
        self._flush()

    def _flush(self):
        if len(self.cur) >= 3:
            self.contours.append(np.array(self.cur, dtype=np.float64))
        self.cur = []


_NUM = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?"
_SVG_NS = "http://www.w3.org/2000/svg"
_SKIP = {"defs", "title", "desc", "metadata", "symbol", "clipPath", "mask", "linearGradient", "radialGradient",
         "pattern", "filter", "marker", "font", "font-face", "script"}
_GROUPS = {"svg", "g", "a"}
_SHAPES = {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"}
_REFUSE = {"use": "<use> references", "image": "an embedded image (<image>)", "text": "text (<text>): convert it to paths",
           "tspan": "text (<tspan>)", "textPath": "text (<textPath>)", "foreignObject": "<foreignObject>",
           "switch": "<switch>", "animate": "animation", "animateTransform": "animation", "animateMotion": "animation",
           "set": "animation"}
_INHERITED = ("fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "visibility")
_OWN = ("opacity", "display", "clip-path", "mask", "filter")  # not inherited: `inherit` takes the parent's own value
_INITIAL = {"fill": "#000000", "fill-rule": "nonzero", "fill-opacity": "1", "stroke": "none", "stroke-width": "1",
            "stroke-opacity": "1", "visibility": "visible", "opacity": "1", "display": "inline", "clip-path": "none",
            "mask": "none", "filter": "none"}
_NAMED = {"black": "#000000", "white": "#ffffff", "red": "#ff0000", "green": "#008000", "blue": "#0000ff"}


def _local(tag):
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def _ns(tag):
    return tag[1:].split("}", 1)[0] if isinstance(tag, str) and tag.startswith("{") else ""


def _num(v, what):
    v = (v or "0").strip()
    m = re.fullmatch(rf"({_NUM})(px)?", v)
    if not m:
        raise MarkError(f"unsupported length {v!r} in {what} (plain numbers or px only)")
    return float(m.group(1))


def _mat(a, b, c, d, e, f):
    return np.array([[a, c, e], [b, d, f], [0.0, 0.0, 1.0]])


def parse_transform(s: str) -> np.ndarray:
    """An SVG transform list as a 3 x 3 matrix (x' = a x + c y + e, y' = b x + d y + f)."""
    M = np.eye(3)
    for name, args in re.findall(r"(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)", s):
        v = [float(x) for x in re.findall(_NUM, args)]
        n = len(v)
        if name == "matrix" and n == 6:
            T = _mat(*v)
        elif name == "translate" and n in (1, 2):
            T = _mat(1, 0, 0, 1, v[0], v[1] if n == 2 else 0.0)
        elif name == "scale" and n in (1, 2):
            T = _mat(v[0], 0, 0, v[1] if n == 2 else v[0], 0, 0)
        elif name == "rotate" and n in (1, 3):
            a = math.radians(v[0])
            T = _mat(math.cos(a), math.sin(a), -math.sin(a), math.cos(a), 0, 0)
            if n == 3:
                T = _mat(1, 0, 0, 1, v[1], v[2]) @ T @ _mat(1, 0, 0, 1, -v[1], -v[2])
        elif name == "skewX" and n == 1:
            T = _mat(1, 0, math.tan(math.radians(v[0])), 1, 0, 0)
        elif name == "skewY" and n == 1:
            T = _mat(1, math.tan(math.radians(v[0])), 0, 1, 0, 0)
        else:
            raise MarkError(f"malformed transform {name}({args})")
        if not np.isfinite(T).all():
            raise MarkError(f"transform {name}({args}) is not finite")
        M = M @ T
    if re.sub(r"(matrix|translate|scale|rotate|skewX|skewY)\s*\([^)]*\)", "", s).strip(" ,\t\n\r"):
        raise MarkError(f"unsupported transform {s!r}")
    return M


def _style(el):
    """The element's presentation attributes, with its style="" declarations on top."""
    st = {k: v.strip() for k, v in el.attrib.items() if not k.startswith("{")}
    for decl in (el.get("style") or "").split(";"):
        if ":" in decl:
            k, v = decl.split(":", 1)
            st[k.strip()] = v.strip()
    return st


def _colour(v):
    """A fill colour, normalised so one colour spelled two ways counts once, and its own alpha (rgba(), hsla(),
    #rgba, #rrggbbaa, `transparent`; 1 for anything else)."""
    v = v.strip().lower()
    if v.startswith("url("):
        return "a paint server (gradient / pattern)", 1.0
    v = _NAMED.get(v, v)
    if v == "transparent":
        return v, 0.0
    if re.fullmatch(r"#[0-9a-f]{3,4}", v):
        v = "#" + "".join(ch * 2 for ch in v[1:])
    if re.fullmatch(r"#[0-9a-f]{8}", v):
        return v[:7], int(v[7:], 16) / 255
    m = re.fullmatch(r"(rgba?|hsla?)\((.*)\)", v)
    if m:
        parts = [p for p in re.split(r"[\s,/]+", m.group(2).strip()) if p]
        if len(parts) not in (3, 4):
            raise MarkError(f"unreadable colour {v!r}")
        alpha = _opacity(parts[3], f"the alpha of {v!r}") if len(parts) == 4 else 1.0
        if m.group(1).startswith("rgb"):
            try:
                ch = [float(p[:-1]) * 2.55 if p.endswith("%") else float(p) for p in parts[:3]]
            except ValueError:
                raise MarkError(f"unreadable colour {v!r}") from None
            v = "#%02x%02x%02x" % tuple(int(round(min(max(c, 0.0), 255.0))) for c in ch)
        else:
            v = f"hsl({','.join(parts[:3])})"
        return v, alpha
    return v, 1.0


def _opacity(v, what="opacity"):
    """An opacity value (a number or a percentage, clamped to 0..1 as CSS does); MarkError when unreadable."""
    v = (v or "1").strip()
    try:
        x = float(v[:-1]) / 100 if v.endswith("%") else float(v)
    except ValueError:
        raise MarkError(f"unreadable {what} value {v!r}") from None
    if not math.isfinite(x):
        raise MarkError(f"unreadable {what} value {v!r}")
    return min(max(x, 0.0), 1.0)


def _resolve(st, ctx):
    """The element's values of the properties the reader looks at, CSS-wide keywords resolved as a browser does:
    `inherit` takes the parent's value (an inherited property's computed value, a non-inherited one's own value),
    `initial` the initial value, `unset` / `revert` the first for inherited properties and the second otherwise.
    Returns (the inherited properties for the element and its children, the element's own non-inherited ones)."""
    c, own = dict(ctx), {}
    for k in _INHERITED + _OWN:
        v = st.get(k)
        inherited = k in _INHERITED
        if v is None:
            if not inherited:
                own[k] = _INITIAL[k]
            continue
        kw = v.strip().lower()
        if kw == "inherit" or (inherited and kw in ("unset", "revert", "revert-layer")):
            val = ctx.get(k if inherited else "own:" + k, _INITIAL[k])
        elif kw in ("initial", "unset", "revert", "revert-layer"):
            val = _INITIAL[k]
        else:
            val = v.strip()
        if inherited:
            c[k] = val
        else:
            own[k] = val
    for k in _OWN:
        c["own:" + k] = own[k]  # what a child's `inherit` takes
    return c, own


def _shape_d(tag, el):
    """Path data of a shape (None when it encloses no area)."""
    if tag == "path":
        return el.get("d") or None
    g = lambda k: _num(el.get(k), f"<{tag} {k}>")  # noqa: E731
    if tag == "rect":
        x, y, w, h = g("x"), g("y"), g("width"), g("height")
        if w <= 0 or h <= 0:
            return None
        given = lambda k: el.get(k) is not None and el.get(k).strip().lower() != "auto"  # noqa: E731 (auto: the other)
        rx = _num(el.get("rx"), "<rect rx>") if given("rx") else None
        ry = _num(el.get("ry"), "<rect ry>") if given("ry") else None
        rx, ry = (rx if rx is not None else ry or 0.0), (ry if ry is not None else rx or 0.0)
        rx, ry = min(max(rx, 0.0), w / 2), min(max(ry, 0.0), h / 2)
        if rx == 0 or ry == 0:
            return f"M{x},{y}H{x + w}V{y + h}H{x}Z"
        a = f"A{rx},{ry} 0 0 1"
        return (f"M{x + rx},{y}H{x + w - rx}{a} {x + w},{y + ry}V{y + h - ry}{a} {x + w - rx},{y + h}"
                f"H{x + rx}{a} {x},{y + h - ry}V{y + ry}{a} {x + rx},{y}Z")
    if tag in ("circle", "ellipse"):
        cx, cy = g("cx"), g("cy")
        rx, ry = (g("r"), g("r")) if tag == "circle" else (g("rx"), g("ry"))
        if rx <= 0 or ry <= 0:
            return None
        return f"M{cx - rx},{cy}A{rx},{ry} 0 1 0 {cx + rx},{cy}A{rx},{ry} 0 1 0 {cx - rx},{cy}Z"
    if tag in ("polygon", "polyline"):  # a filled polyline is filled as if closed, like a browser does
        pts = [float(v) for v in re.findall(_NUM, el.get("points") or "")]
        if len(pts) < 6:
            return None
        return "M" + " L".join(f"{x},{y}" for x, y in zip(pts[0::2], pts[1::2])) + "Z"
    return None  # <line>: no area


def _walk(el, ctx, M, out, colours, root):
    tag, ns = _local(el.tag), _ns(el.tag)
    if ns and ns != _SVG_NS:
        return  # editor metadata (Inkscape, Sodipodi, Illustrator): not drawn
    if tag in _SKIP:
        return
    if tag == "style":
        if (el.text or "").strip():
            raise MarkError("the SVG styles its shapes with CSS rules (<style>): inline the fills and simplify the file")
        return
    if tag in _REFUSE:
        raise MarkError(f"the SVG uses {_REFUSE[tag]}, which a coin mark cannot be drawn from")
    if tag not in _GROUPS and tag not in _SHAPES:
        raise MarkError(f"unsupported SVG element <{tag}>")
    if tag == "svg" and not root:
        raise MarkError("nested <svg> elements are not supported")
    st = _style(el)
    c, own = _resolve(st, ctx)
    if own["display"].lower() == "none":
        return
    for k in ("clip-path", "mask", "filter"):
        if own[k].lower() not in ("none", ""):
            raise MarkError(f"the SVG uses {k} (on <{tag}>): flatten it into plain filled paths first")
    c["opacity"] = ctx.get("opacity", 1.0) * _opacity(own["opacity"], f"opacity (on <{tag}>)")
    tf = (st.get("transform") or "").strip()
    if tf.lower() == "inherit":
        tf = ctx.get("own:transform", "")
    elif tf.lower() in ("none", "initial", "unset", "revert", "revert-layer"):
        tf = ""
    c["own:transform"] = tf
    if tf and tag != "svg":
        M = M @ parse_transform(tf)
    if tag in _GROUPS:
        for ch in el:
            _walk(ch, c, M, out, colours, False)
        return
    if c.get("visibility", "visible").lower() in ("hidden", "collapse"):
        return
    stroke, s_alpha = _colour(c.get("stroke", "none"))
    if stroke != "none" and s_alpha > 0 and _num(c.get("stroke-width", "1"), "stroke-width") > 0 \
            and _opacity(c.get("stroke-opacity"), "stroke-opacity") * c["opacity"] > 0:
        raise MarkError(f"<{tag}> is stroked: convert strokes to filled paths (Outline Stroke) first")
    fill, f_alpha = _colour(c.get("fill", "#000000"))
    alpha = f_alpha * _opacity(c.get("fill-opacity"), "fill-opacity") * c["opacity"]
    if fill == "none" or alpha <= 0:
        return
    if alpha < 0.999:
        raise MarkError(f"<{tag}> is semi-transparent (opacity {alpha:.2f}): a coin mark is one solid colour")
    d = _shape_d(tag, el)
    if not d:
        return
    rule = c.get("fill-rule", "nonzero").strip().lower()
    if rule not in ("nonzero", "evenodd"):
        raise MarkError(f"unsupported fill-rule {rule!r}")
    colours.add(fill)
    out.append((d, M.copy(), rule))


def svg_shapes(svg_text: str):
    """The filled shapes of a single-colour SVG mark: [(contours, fill_rule)], every contour a closed polyline in the
    root's user units with every transform applied. Raises MarkError, with the reason, for anything that would draw
    differently from a plain fill (see the module docstring) and for anything it cannot read: no other exception
    escapes for any input."""
    try:
        with np.errstate(all="ignore"):  # an overflowing transform is refused below (no finite extent), not warned about
            return _svg_shapes(svg_text)
    except MarkError:
        raise
    except RecursionError:
        raise MarkError("the SVG nests its elements too deeply to read") from None
    except Exception as e:  # a value the reader could not convert: refuse the file with the reason, never crash
        raise MarkError(f"the SVG could not be read ({type(e).__name__}: {e})") from None


def _svg_shapes(svg_text):
    try:
        root = ET.fromstring(svg_text.encode("utf-8") if isinstance(svg_text, str) else svg_text)
    except ET.ParseError as e:
        raise MarkError(f"not a readable SVG file ({e})") from None
    if _local(root.tag) != "svg":
        raise MarkError("not an SVG file (the root element is not <svg>)")
    found, colours = [], set()
    _walk(root, {}, np.eye(3), found, colours, True)
    if not found:
        raise MarkError("the SVG has no filled shape")
    if len(colours) > 1:
        raise MarkError(f"the SVG uses {len(colours)} fill colours ({', '.join(sorted(colours))}): a coin mark must be "
                        "single-colour, with holes as real holes (fill-rule evenodd or counter-wound subpaths)")

    def flatten(hint):
        shapes = []
        for d, M, rule in found:
            k = math.sqrt(abs(np.linalg.det(M[:2, :2]))) or 1.0
            if not math.isfinite(k):
                raise MarkError("a transform has no finite scale")
            pen = _PolyPen(hint * k)
            try:
                parse_path(d, pen)
            except MarkError:
                raise
            except Exception as e:
                raise MarkError(f"unreadable path data {d[:40]!r}{'...' if len(d) > 40 else ''} ({e})") from None
            pen._flush()
            cs = [c @ M[:2, :2].T + M[:2, 2] for c in pen.contours]
            if cs:
                shapes.append((cs, rule))
        return shapes

    first = flatten(1.0)
    if not first:
        raise MarkError("the SVG has no filled shape")
    x0, y0, x1, y1 = bounds(first)
    size = max(x1 - x0, y1 - y0)
    if not np.isfinite(size) or size <= 0:
        raise MarkError("the SVG's shapes have no extent")
    return flatten(260.0 / size)  # curve steps of about 1/4 px at the mark's size on the coin


def glyph_shapes(font_path: str, char: str):
    """A font glyph's outline (y pointing down, SVG orientation) as one nonzero shape."""
    from fontTools.ttLib import TTFont

    f = TTFont(font_path)
    name = f.getBestCmap()[ord(char)]
    gs = f.getGlyphSet()
    pen = _PolyPen(0.05, gs)
    gs[name].draw(pen)
    pen._flush()
    return [([np.column_stack([c[:, 0], -c[:, 1]]) for c in pen.contours], "nonzero")]


def bounds(shapes):
    p = np.concatenate([c for cs, _ in shapes for c in cs])
    return p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max()


def _scan(contours, WS, HS, scale, tx, ty, rule):
    """Sample-centre fill of the contours mapped by p * scale + (tx, ty) into a WS x HS boolean grid."""
    X0, Y0, X1, Y1 = [], [], [], []
    for c in contours:
        p = c * scale + np.array([tx, ty])
        q = np.roll(p, -1, axis=0)
        X0.append(p[:, 0]); Y0.append(p[:, 1]); X1.append(q[:, 0]); Y1.append(q[:, 1])
    X0, Y0, X1, Y1 = map(np.concatenate, (X0, Y0, X1, Y1))
    keep = Y0 != Y1
    X0, Y0, X1, Y1 = X0[keep], Y0[keep], X1[keep], Y1[keep]
    out = np.zeros((HS, WS), bool)
    if X0.size == 0:
        return out
    D = np.where(Y1 > Y0, 1, -1)
    ymin, ymax = np.minimum(Y0, Y1), np.maximum(Y0, Y1)
    slope = (X1 - X0) / (Y1 - Y0)
    grid = np.zeros((HS, WS + 1), np.int32)
    order = np.argsort(ymin)
    ymin_s = ymin[order]
    for row in range(max(0, int(np.floor(ymin.min()))), min(HS, int(np.ceil(ymax.max())) + 1)):
        yc = row + 0.5
        idx = order[: np.searchsorted(ymin_s, yc, side="right")]
        idx = idx[ymax[idx] > yc]
        if idx.size < 2:
            continue
        xs = X0[idx] + (yc - Y0[idx]) * slope[idx]
        o = np.argsort(xs, kind="stable")
        xs = xs[o]
        if rule == "evenodd":
            inside = (np.arange(1, xs.size) % 2) == 1
        else:
            inside = np.cumsum(D[idx][o])[:-1] != 0
        if not inside.any():
            continue
        np.add.at(grid[row], np.clip(np.ceil(xs[:-1][inside] - 0.5), 0, WS).astype(np.int64), 1)
        np.add.at(grid[row], np.clip(np.ceil(xs[1:][inside] - 0.5), 0, WS).astype(np.int64), -1)
    return np.cumsum(grid[:, :WS], axis=1) > 0


def rasterize(shapes, W, H, scale, tx, ty, ss=SS):
    """The union of the shapes' fills (each by its own rule), mapped by p * scale + (tx, ty) into W x H px, as an
    (H * ss) x (W * ss) boolean grid of sample centres."""
    out = np.zeros((H * ss, W * ss), bool)
    for contours, rule in shapes:
        out |= _scan(contours, W * ss, H * ss, scale * ss, tx * ss, ty * ss, rule)
    return out


def coverage(shapes, W, H, scale, tx, ty, ss=SS):
    """Anti-aliased coverage (0..1) of the shapes in W x H px."""
    return rasterize(shapes, W, H, scale, tx, ty, ss).reshape(H, ss, W, ss).mean(axis=(1, 3)).astype(np.float32)


def placement(shapes):
    """Scale and offset that put a mark where Figma puts its logos (see the module docstring)."""
    x0, y0, x1, y1 = bounds(shapes)
    w, h = max(x1 - x0, 1e-6), max(y1 - y0, 1e-6)
    s = min(GEOMEAN / np.sqrt(w * h), MAX_W / w, MAX_H / h)
    return s, CENTRE[0] - (x0 + x1) / 2 * s, CENTRE[1] - (y0 + y1) / 2 * s


def letter_placement(shapes, cap_height):
    """A lettermark: every letter at one cap height (Figma's G is about 210 tall), its box centred like a mark; a letter
    wider than a mark may be (Sora's W) is scaled down to the marks' width cap, so it keeps the marks' clearance from
    the rim."""
    x0, y0, x1, y1 = bounds(shapes)
    s = min(205.0 / cap_height, MAX_W / max(x1 - x0, 1e-6))
    return s, CENTRE[0] - (x0 + x1) / 2 * s, CENTRE[1] - (y0 + y1) / 2 * s


# ---------------------------------------------------------------------------------------------------- image helpers


def _kernel(sigma):
    r = max(1, int(np.ceil(sigma * 3)))
    x = np.arange(-r, r + 1, dtype=np.float64)
    k = np.exp(-0.5 * (x / sigma) ** 2)
    return (k / k.sum()).astype(np.float32)


def _fast_len(n):
    """The smallest 5-smooth length >= n (a quick FFT size)."""
    while True:
        m = n
        for f in (2, 3, 5):
            while m % f == 0:
                m //= f
        if m == 1:
            return n
        n += 1


def blur(a, sigma):
    """Gaussian blur, zero outside; separable for small kernels, FFT for wide ones."""
    a = a.astype(np.float32)
    if sigma <= 0:
        return a.copy()
    if sigma > 3:
        r = int(np.ceil(sigma * 3))
        H, W = a.shape[:2]
        Hp, Wp = _fast_len(H + 2 * r), _fast_len(W + 2 * r)
        G = np.exp(-2 * (np.pi * sigma) ** 2 * (np.fft.rfftfreq(Wp)[None, :] ** 2 + np.fft.fftfreq(Hp)[:, None] ** 2))

        def one(c):
            p = np.zeros((Hp, Wp), np.float64)
            p[r : r + H, r : r + W] = c
            return np.fft.irfft2(np.fft.rfft2(p) * G, s=(Hp, Wp))[r : r + H, r : r + W].astype(np.float32)

        return one(a) if a.ndim == 2 else np.stack([one(a[..., i]) for i in range(a.shape[2])], -1)
    k = _kernel(sigma)
    r = len(k) // 2
    out = a
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r, r)
        p = np.pad(out, pad)
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim
            sl[axis] = slice(i, i + out.shape[axis])
            acc += w * p[tuple(sl)]
        out = acc
    return out


def _ishift(b, sx, sy, fill=0):
    """Integer translation: out(p) = b(p - (sx, sy))."""
    out = np.full_like(b, fill)
    H, W = b.shape[:2]
    if abs(sx) >= W or abs(sy) >= H:
        return out
    ys, yd = (slice(0, H - sy), slice(sy, H)) if sy >= 0 else (slice(-sy, H), slice(0, H + sy))
    xs, xd = (slice(0, W - sx), slice(sx, W)) if sx >= 0 else (slice(-sx, W), slice(0, W + sx))
    out[yd, xd] = b[ys, xs]
    return out


def shift(a, dx, dy):
    """Sub-pixel translation (bilinear), zero where nothing comes in."""
    ix, iy = int(np.floor(dx)), int(np.floor(dy))
    fx, fy = dx - ix, dy - iy
    out = (1 - fx) * (1 - fy) * _ishift(a, ix, iy)
    if fx:
        out += fx * (1 - fy) * _ishift(a, ix + 1, iy)
    if fy:
        out += (1 - fx) * fy * _ishift(a, ix, iy + 1)
    if fx and fy:
        out += fx * fy * _ishift(a, ix + 1, iy + 1)
    return out


def _down(a, f):
    H, W = a.shape[:2]
    return a.reshape(H // f, f, W // f, f, *a.shape[2:]).mean(axis=(1, 3))


def _smoothstep(x):
    return x * x * (3 - 2 * x)


def _phi(z):
    """The standard normal CDF."""
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


# ---------------------------------------------------------------------------------------------------- the glyph


def stroke_width(shapes, scale, M, ss=SS):
    """Mean stroke width of the placed mark in px, 2 x area / perimeter (a thin wordmark ~6, Amazon's smile 14)."""
    per = sum(float(np.hypot(*(np.roll(c, -1, axis=0) - c).T).sum()) for cs, _ in shapes for c in cs)
    return 2.0 * float(M.sum()) / (ss * ss) / max(per * scale, 1e-6)


class Layers:
    """A rendered coin as its parts in the 500 frame: the glyph's premultiplied colour `cp` and alpha `a`, and the
    shadow factor `f` that multiplies the glass under it. `final` is the coin as rendered."""

    def __init__(self, cp, a, f, base, info=None):
        self.cp, self.a, self.f, self.base, self.info = cp, a, f, base, info or {}

    @property
    def final(self):
        return self.base * self.f * (1 - self.a[..., None]) + self.cp


def _window(b0, b1, before, after, size=SIZE):
    """An even-aligned [lo, hi) range around [b0, b1] with the given margins, clipped to the frame."""
    lo = max(0, int(np.floor(b0 - before)) // 2 * 2)
    hi = min(size, int(np.ceil(b1 + after)) // 2 * 2 + 2)
    return lo, hi


def render(shapes, scale, tx, ty, base, P=PARAMS):
    """The coin with the mark raised on it (see the module docstring). base: the empty coin's RGB (500 x 500 x 3)."""
    x0, y0, x1, y1 = bounds(shapes)
    bx0, by0, bx1, by1 = x0 * scale + tx, y0 * scale + ty, x1 * scale + tx, y1 * scale + ty
    # the glyph is shaded in a tight window at 4 x 4 samples per px
    X0, X1 = _window(bx0, bx1, 8, P["depth"][0] + 8)
    Y0, Y1 = _window(by0, by1, 8, P["depth"][1] + 8)
    M = rasterize(shapes, X1 - X0, Y1 - Y0, scale, tx - X0, ty - Y0, SS)
    if not M.any():
        raise MarkError("the mark covers no pixel")
    Mf = M.astype(np.float32)
    sw = stroke_width(shapes, scale, M, SS)
    k = float(np.clip((sw - 3.0) / (P["stroke_ref"] - 3.0), P["depth_min"], 1.0))
    dx, dy = P["depth"][0] * k, P["depth"][1] * k

    # walls: march every sample back along the extrusion; the first step that lands inside the mark gives the depth t
    # of the wall seen there and the outline's outward normal at that point
    gy, gx = np.gradient(blur(Mf, P["normal_sigma"] * SS))
    gm = np.maximum(np.hypot(gx, gy), 1e-9)
    nx, ny = (-gx / gm).astype(np.float32), (-gy / gm).astype(np.float32)
    K = int(np.ceil(max(abs(dx), abs(dy)) * SS * 2))
    step = np.zeros(M.shape, np.int16)
    covered = M.copy()
    for i in range(1, K + 1):
        new = _ishift(M, int(round(i * dx * SS / K)), int(round(i * dy * SS / K)), False) & ~covered
        step[new] = i
        covered |= new
    t = np.zeros(M.shape, np.float32)
    NX = np.zeros_like(nx)
    NY = np.zeros_like(ny)
    ys, xs = np.nonzero(step)
    i = step[ys, xs].astype(np.float64)
    sy, sx = ys - np.round(i * dy * SS / K).astype(np.int64), xs - np.round(i * dx * SS / K).astype(np.int64)
    t[ys, xs] = i / K
    NX[ys, xs], NY[ys, xs] = nx[sy, sx], ny[sy, sx]
    wall_m = covered & ~M

    # wall colour from its depth and facing: right- or down-facing tone, a light line along the top of right-facing
    # walls, a faint gloss, a little darker toward the foot
    nd, nr = np.clip(NY, 0, None), np.clip(NX, 0, None)
    w = (nd**2 / (nd**2 + nr**2 + 1e-6))[..., None]
    wall = np.array(P["wall_right"], np.float32) * (1 - w) + np.array(P["wall_down"], np.float32) * w
    wall = wall * (1 - (1 - P["wall_base"]) * np.clip((t - 0.6) / 0.4, 0, 1))[..., None]
    e = (np.clip(1 - t / P["edge_t"], 0, 1) * _smoothstep(np.clip(NX / 0.6, 0, 1)))[..., None]
    wall = wall * (1 - e) + np.array(P["edge_color"], np.float32) * e
    g = P["gloss"]
    gw = (np.exp(-0.5 * ((t - g["t"]) / g["width"]) ** 2) * g["amount"])[..., None]
    wall = wall * (1 - gw) + np.array(g["color"], np.float32) * gw

    # top face: light to shade across the mark; a bright rim where the edge faces the light (upward), a dark rounded
    # band just inside the edge where it faces away; both narrower on thin strokes
    lx, ly = P["light"]
    ln = math.hypot(lx, ly)
    fx, fy = P["face_light"]
    fn = math.hypot(fx, fy)
    ux, uy = -fx / fn, -fy / fn
    Hs, Ws = M.shape
    yy, xx = np.mgrid[0:Hs, 0:Ws].astype(np.float32)
    cx, cy = ((bx0 + bx1) / 2 - X0) * SS, ((by0 + by1) / 2 - Y0) * SS
    span = (abs((bx1 - bx0) * ux) + abs((by1 - by0) * uy)) * SS
    s = np.clip(((xx - cx) * ux + (yy - cy) * uy) / max(span, 1) * P["top_gain"] + 0.5, 0, 1) ** P["top_curve"]
    top = np.array(P["top_light"], np.float32) * (1 - s[..., None]) + np.array(P["top_dark"], np.float32) * s[..., None]
    kb = float(np.clip(sw / 14.0, 0.5, 1.0))
    rl = np.array(P["rim_light"], np.float32)
    rl /= np.linalg.norm(rl)
    gy, gx = np.gradient(blur(Mf, P["rim_sigma"] * kb * SS))
    mag = np.hypot(gx, gy)
    bump = mag * SS * P["rim_sigma"] * kb * math.sqrt(2 * math.pi)
    facing = np.clip((-gx * rl[0] - gy * rl[1]) / np.maximum(mag, 1e-9), 0, 1) ** 2
    w_rim = np.clip(P["rim_amount"] * bump * facing, 0, 1)[..., None]
    top = top + (np.array(P["rim_color"], np.float32) - top) * w_rim
    E = (blur(Mf, kb * SS) > _phi(P["dark_inset"])).astype(np.float32)  # the outline moved dark_inset x kb px inward
    gy, gx = np.gradient(blur(E, P["dark_sigma"] * kb * SS))
    mag = np.hypot(gx, gy)
    bump = mag * SS * P["dark_sigma"] * kb * math.sqrt(2 * math.pi)
    away = np.clip((gx * lx + gy * ly) / ln / np.maximum(mag, 1e-9), 0, 1)
    w_dark = np.clip(P["dark_amount"] * bump * _smoothstep(np.clip(away / 0.45, 0, 1)), 0, 1)[..., None]
    top = top + (np.array(P["rim_dark"], np.float32) - top) * w_dark

    C = np.where(M[..., None], top, np.where(wall_m[..., None], wall, 0.0)).astype(np.float32)
    A = covered.astype(np.float32)
    Cp = np.zeros((SIZE, SIZE, 3), np.float64)
    Aa = np.zeros((SIZE, SIZE), np.float64)
    Cp[Y0:Y1, X0:X1] = _down(C * A[..., None], SS)
    Aa[Y0:Y1, X0:X1] = _down(A, SS)

    # the shadow on the glass, at 2 x 2 samples per px in a window that holds every component's reach
    sh, (cs, cx_, cy_, cstr) = P["shadows"], P["contact"]
    SX0, SX1 = _window(bx0, bx1, max(3 * c[0] - c[1] for c in sh) + 8, max(dx, max(c[1] + 3 * c[0] for c in sh)) + 8)
    SY0, SY1 = _window(by0, by1, max(3 * c[0] - c[2] for c in sh) + 8, max(dy, max(c[2] + 3 * c[0] for c in sh)) + 8)
    A2 = np.zeros(((SY1 - SY0) * 2, (SX1 - SX0) * 2), np.float32)
    A2[(Y0 - SY0) * 2 : (Y1 - SY0) * 2, (X0 - SX0) * 2 : (X1 - SX0) * 2] = _down(A, SS // 2)
    widths = {}
    for sigma, ox, oy, wgt in sh:  # blurring is linear: sum the moved copies of one width, then blur once
        widths[sigma] = widths.get(sigma, 0) + wgt * shift(A2, ox * 2 * k, oy * 2 * k)
    soft = 0.5 + 0.5 * k
    lum = sum(blur(acc, sigma * 2 * soft) for sigma, acc in widths.items())
    dark = lum[..., None] * np.array(P["shadow_shade"], np.float32)
    dark += blur(shift(A2, cx_ * 2 * k, cy_ * 2 * k), cs * 2 * soft)[..., None] * np.array(cstr, np.float32)
    Ff = np.ones((SIZE, SIZE, 3), np.float64)
    Ff[SY0:SY1, SX0:SX1] = _down(np.clip(1 - dark, 0, 1), 2)
    return Layers(Cp, Aa, Ff, base, dict(stroke=sw, depth=k))


# The shadow darkens red about twice as much as green and blue; over the glass that is, within a level on average, the
# same as laying this colour over it at the right alpha (least squares over the five calibration marks' shadows). A
# shadow drawn that way is one flat colour under a smooth alpha, which compresses well.
SHADOW_TINT = (58.0, 136.0, 158.0)
# Size: a shadow alpha under 1.5 / 255 (one 8-bit step) is dropped, and where there is no glyph the shadow's alpha moves
# in steps of 3 / 255 (each pixel at most one step from its own value). One alpha step moves the coin by |glass - tint| /
# 255, under 0.76 levels on the brightest glass, so neither is visible; together they take about a fifth off a file.
SHADOW_FLOOR = 1.5 / 255
SHADOW_STEP = 3
# Where the flat tint is more than this many levels off on some glass, the shadow's colour is fitted per pixel too.
COLOUR_FIT_LEVELS = 12.0


def _fit_colour(Bs, F, tint):
    """Per pixel, the 8-bit alpha and colour of a shadow layer that best match B * F on every glass B (worst channel
    error least): for each alpha the colour each glass needs, met halfway. Bs: (glasses, N, 3), F: (N, 3)."""
    want = Bs * F[None]
    best_e = np.abs(Bs - want).max(axis=(0, 2))  # alpha 0: no shadow
    best_k = np.zeros(Bs.shape[1])
    best_c = np.tile(np.asarray(tint, np.float64), (Bs.shape[1], 1))
    for k in range(1, 256):
        al = k / 255
        need = (want - Bs * (1 - al)) / al
        c = np.clip(np.round((need.max(0) + need.min(0)) / 2), 0, 255)
        e = np.abs(Bs * (1 - al) + c[None] * al - want).max(axis=(0, 2))
        better = e < best_e - 1e-9
        best_e[better], best_k[better], best_c[better] = e[better], k, c[better]
    return best_k / 255, best_c, best_e


def overlay_layers(L: "Layers", glass_alpha=None, tint=SHADOW_TINT, bases=None, floor=SHADOW_FLOOR, step=SHADOW_STEP):
    """RGBA uint8 overlay of a render: the glyph over a flat `tint` layer whose alpha reproduces the shadow (only on the
    glass: `glass_alpha`, the empty coin's alpha 0..255, keeps a long shadow from tinting the card around the coin).

    `bases`: the glass RGB images the overlay will be drawn over (default the render's own, L.base). The shadow's alpha
    is the least-squares fit over all of them, so one overlay is right on each: where the glasses agree it is the exact
    fit, and where they differ (the turned copies move the rim's dark and bright lines) a glass whose pixel is close to
    the tint barely changes under it, so the fit follows the others instead of reaching full alpha over a dark line
    (which left dark specks in a turned glass's bright rim). A tint only darkens a pixel brighter than itself, so where
    one alpha still cannot match every glass (a long shadow over a rim line darker than the tint on one glass and bright
    on another, as under Q's tail) the colour there is fitted per pixel too (_fit_colour). The colour under fully
    transparent pixels is the tint: invisible, and the colour plane is then one flat colour around the glyph."""
    T = np.array(tint, np.float64)
    Bs = [np.asarray(B, np.float64) for B in ([L.base] if bases is None else bases)]
    num = np.zeros(L.a.shape)
    den = np.zeros(L.a.shape)
    for B in Bs:
        BT = B - T
        num += ((B - B * L.f) * BT).sum(-1)  # (how much the shadow takes off the glass) . (glass - tint)
        den += (BT * BT).sum(-1)
    a_s = np.clip(num / np.maximum(den, 1e-6), 0, 1)
    cap = np.ones(L.a.shape) if glass_alpha is None else np.asarray(glass_alpha, np.float64) / 255.0
    a_s = a_s * cap
    a_s[a_s < floor] = 0
    colour = np.broadcast_to(T, L.a.shape + (3,)).copy()
    fitted = np.zeros(L.a.shape, bool)
    off = np.max([np.abs(B * (1 - a_s[..., None]) + T * a_s[..., None] - B * L.f).max(-1) for B in Bs], axis=0)
    ys, xs = np.nonzero((L.a == 0) & (off > COLOUR_FIT_LEVELS) & (cap >= 1))  # shadow only, inside every glass
    if ys.size:
        al, c, e = _fit_colour(np.stack([B[ys, xs] for B in Bs]), L.f[ys, xs], T)
        use = e < off[ys, xs]
        ys, xs = ys[use], xs[use]
        a_s[ys, xs], colour[ys, xs], fitted[ys, xs] = al[use], c[use], True
    if step > 1:
        k = np.round(a_s * 255)
        a_s = np.where((L.a == 0) & ~fitted, np.round(k / step) * step / 255, a_s)
    alpha = L.a + (1 - L.a) * a_s
    col = np.where(alpha[..., None] > 0, (L.cp + ((1 - L.a) * a_s)[..., None] * colour) / np.maximum(alpha[..., None], 1e-9), T)
    return np.concatenate([np.clip(np.round(col), 0, 255), np.round(np.clip(alpha, 0, 1) * 255)[..., None]], -1).astype(np.uint8)


def composite(rgba, base):
    a = rgba[..., 3:4].astype(np.float64) / 255
    return rgba[..., :3].astype(np.float64) * a + base * (1 - a)


def coin_error(overlay, L: "Layers", glass_rgba, card=(20.0, 40.0, 68.0)):
    """Per pixel, the largest channel difference (levels) between the coin as the app draws it (the glass over the card,
    the overlay over that) and the exact render on that glass (the glass darkened by the shadow, the glyph over it).
    `card`: the colour behind the coin, the deck card's image fill #142844."""
    g = np.asarray(glass_rgba, np.float64)
    A, G = g[..., 3:4] / 255, g[..., :3]
    bg = np.array(card, np.float64)
    under = bg * (1 - A) + A * G
    ao = overlay[..., 3:4].astype(np.float64) / 255
    shown = under * (1 - ao) + overlay[..., :3].astype(np.float64) * ao
    exact = (bg * (1 - A) + A * G * L.f) * (1 - L.a[..., None]) + L.cp
    return np.abs(shown - exact).max(-1)


# ---------------------------------------------------------------------------------------------------- the empty coin


def _lap(u):
    p = np.pad(u, 1, mode="edge")
    return p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] - 4 * u


def _cg(Aop, b, x, iters, tol):
    r = b - Aop(x)
    p = r.copy()
    rs = (r * r).sum()
    b2 = (b * b).sum() + 1e-30
    for _ in range(iters):
        Ap = Aop(p)
        alpha = rs / ((p * Ap).sum() + 1e-30)
        x = x + alpha * p
        r = r - alpha * Ap
        rs_new = (r * r).sum()
        if rs_new / b2 < tol * tol:
            break
        p = r + (rs_new / rs) * p
        rs = rs_new
    return x


def _smooth_fill(img, mask, iters=30000, tol=1e-6):
    """Biharmonic fill inside the mask (values outside fixed), started from the harmonic fill."""
    ys, xs = np.nonzero(mask)
    y0, y1 = max(0, ys.min() - 6), min(img.shape[0], ys.max() + 7)
    x0, x1 = max(0, xs.min() - 6), min(img.shape[1], xs.max() + 7)
    I = img[y0:y1, x0:x1].astype(np.float64)
    m = mask[y0:y1, x0:x1].astype(np.float64)
    u0 = np.where(m > 0, 0.0, I)
    xh = _cg(lambda v: -m * _lap(m * v), m * _lap(u0), np.zeros_like(I), iters, tol)
    xb = _cg(lambda v: m * _lap(_lap(m * v)), -m * _lap(_lap(u0)), m * xh, iters, tol)
    out = img.astype(np.float64).copy()
    out[y0:y1, x0:x1] = u0 + m * xb
    return out


def _ishift64(a, dx, dy):
    return _ishift(a.astype(np.float64), dx, dy)


def _dilate(m, r):
    out = m.copy()
    mf = m.astype(np.float64)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out |= _ishift64(mf, dx, dy) > 0.5
    return out


def _gauss64(a, sigma):
    return blur(a.astype(np.float32), sigma).astype(np.float64)


def empty_coin(amazon_rgba, shopify_rgba, apple_rgba):
    """Figma's glass without a logo, from Figma's own coins (uint8 RGBA arrays, 500 x 500)."""
    from collections import deque

    a = _ishift64(amazon_rgba, -1, -9)  # onto the NVIDIA coin's outline
    ref = 0.5 * (_ishift64(shopify_rgba, 0, 0) + _ishift64(apple_rgba, 0, 1))
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    rgb = a[..., :3]
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    # the smile: its bright top face and its saturated walls, closed, largest connected piece
    box = (xx > 118) & (xx < 392) & (yy > 205) & (yy < 318)
    sil = box & ((lum >= 212.5) | (sat >= 78))
    sil = ~_dilate(~_dilate(sil, 2), 2)
    lab = np.zeros(sil.shape, np.int32)
    best, n = (0, 0), 0
    for y0, x0 in zip(*np.nonzero(sil)):
        if lab[y0, x0]:
            continue
        n += 1
        q, cnt = deque([(y0, x0)]), 0
        lab[y0, x0] = n
        while q:
            y, x = q.popleft()
            cnt += 1
            for y2, x2 in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= y2 < H and 0 <= x2 < W and sil[y2, x2] and not lab[y2, x2]:
                    lab[y2, x2] = n
                    q.append((y2, x2))
        if cnt > best[0]:
            best = (cnt, n)
    smile = lab == best[1]
    core = _dilate(smile, 3)
    glyph = _dilate(core, 4)
    # the arrowhead's shadow on the face right of it (it reaches the rim): divide it out
    zone = (xx >= 340) & (xx <= 414) & (yy >= 226) & (yy <= 322)
    valid = (zone & ~glyph).astype(np.float64)
    ratio = rgb / np.maximum(ref[..., :3], 1)
    S = np.stack([_gauss64(ratio[..., c] * valid, 5) / np.maximum(_gauss64(valid, 5), 1e-6) for c in range(3)], -1)
    r0 = np.ones((W, 3))
    for x in range(330, 420):
        r0[x] = np.median(ratio[198:223, x, :], axis=0)
    k = _kernel(3).astype(np.float64)
    r0s = np.stack([np.convolve(np.pad(r0[:, c], len(k) // 2, mode="edge"), k, mode="valid") for c in range(3)], -1)
    S = np.clip(S / r0s[None, :, :], 0.4, 1.0)
    w = np.zeros((H, W))
    w[zone] = 1.0
    w = _gauss64(w, 4) * (zone | (_gauss64(zone.astype(np.float64), 4) > 0.01))
    b = a.copy()
    b[..., :3] = rgb / (w[..., None] * S + (1 - w[..., None]))
    # the smile and the shadow under it: biharmonic fill
    sweep = np.zeros_like(core)
    for s in range(0, 48, 2):
        sweep |= _ishift64(core.astype(np.float64), int(round(s * 0.25)), s) > 0.5
    G = (_dilate(core, 10) | _dilate(sweep, 7)) & (yy <= 346) & (xx <= 386)
    out = b.copy()
    for c in range(3):
        out[..., c] = _smooth_fill(b[..., c], G)
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- self-test


def selftest():
    """Check the SVG reader and the fill rules on small known cases; raises AssertionError on a failure."""

    def cov(svg, W=100, H=100):
        return coverage(svg_shapes(svg), W, H, 1.0, 0, 0)

    ring = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path {} d="M50 10a40 40 0 1 1 0 80'
            'a40 40 0 1 1 0-80zM50 30a20 20 0 1 1 0 40a20 20 0 1 1 0-40z"/></svg>')
    c = cov(ring.format('fill-rule="evenodd"'))
    assert c[50, 50] == 0 and c[50, 20] == 1, "fill-rule evenodd: the ring's hole must stay open"
    c = cov(ring.format('style="fill-rule: evenodd"'))
    assert c[50, 50] == 0, "fill-rule in style=\"\" must be honoured"
    c = cov(ring.format(""))
    assert c[50, 50] == 1, "nonzero (the default) fills two same-direction subpaths"
    c = cov('<svg><g fill-rule="evenodd"><path d="M10 10h80v80h-80zM30 30h40v40h-40z"/></g></svg>')
    assert c[50, 50] == 0 and c[20, 20] == 1, "fill-rule inherited from a group"
    c = cov('<svg><path d="M10 10h80v80h-80zM30 30v40h40v-40z"/></svg>')
    assert c[50, 50] == 0, "nonzero: a counter-wound subpath is a hole"
    c = cov('<svg><circle cx="25" cy="50" r="15"/><path d="M60 35h30v30h-30z"/></svg>')
    assert c[50, 25] == 1 and c[50, 75] == 1 and c[50, 50] == 0, "a <circle> next to a <path> must both be drawn"
    c = cov('<svg><g transform="translate(50 0) scale(0.5)"><path d="M0 0h100v100h-100z"/></g></svg>')
    assert c[25, 75] == 1 and c[25, 25] == 0 and c[75, 75] == 0, "a <g transform> must move and scale its children"
    sh = svg_shapes('<svg><rect x="0" y="0" width="100" height="40" transform="rotate(90 50 50)"/></svg>')
    x0, y0, x1, y1 = bounds(sh)
    assert abs(x0 - 60) < 1e-6 and abs(x1 - 100) < 1e-6 and abs(y0) < 1e-6 and abs(y1 - 100) < 1e-6, "rotate(a cx cy)"
    c = cov('<svg><rect x="10" y="10" width="80" height="80" rx="20"/></svg>')
    assert c[11, 11] == 0 and c[50, 50] == 1 and c[10, 50] == 1, "<rect rx> has rounded corners"
    c = cov('<svg><polygon points="10,90 50,10 90,90"/><ellipse cx="50" cy="95" rx="40" ry="3"/></svg>')
    assert c[70, 50] == 1 and c[20, 20] == 0 and c[95, 50] == 1, "<polygon> and <ellipse>"
    c = cov('<svg><path d="M0 0h100v100h-100z" fill="none"/><path d="M40 40h20v20h-20z" fill="#000"/>'
            '<path d="M0 0h10v10h-10z" style="display:none"/><title>x</title></svg>')
    assert c[5, 5] == 0 and c[50, 50] == 1 and c[20, 20] == 0, "fill=none and display:none are not drawn"
    # CSS-wide keywords: `inherit` takes the parent's value (opacity: the parent's own), at the root the initial one
    sq = 'd="M10 10h80v80h-80z"'
    for svg in (f'<svg><g opacity="1" fill-opacity="1" stroke-opacity="0"><path opacity="inherit" fill-opacity="inherit" '
                f'stroke-opacity="inherit" stroke="#000" {sq}/></g></svg>',
                f'<svg><path style="opacity: inherit; fill-opacity: Inherit; stroke-opacity: INHERIT" {sq}/></svg>',
                f'<svg><g fill="none"><path fill="initial" opacity="unset" {sq}/></g></svg>',
                f'<svg><path fill="rgba(0, 0, 0, 1)" {sq}/><path fill="#000000ff" d="M0 0h5v5h-5z"/></svg>'):
        assert cov(svg)[50, 50] == 1, f"CSS-wide keywords / colour alpha resolved and drawn: {svg}"
    refused = {
        "opacity inherited below 1": f'<svg><g opacity="0.5"><path opacity="inherit" {sq}/></g></svg>',
        "fill-opacity inherited below 1": f'<svg><g fill-opacity="0.5"><path fill-opacity="inherit" {sq}/></g></svg>',
        "a stroke whose stroke-opacity inherits 1": f'<svg><g stroke-opacity="1"><path stroke="#000" stroke-opacity="inherit" {sq}/></g></svg>',
        "a semi-transparent rgba() fill": f'<svg><path fill="rgba(0,0,0,0.5)" {sq}/></svg>',
        "unreadable opacity": f'<svg><path opacity="abc" {sq}/></svg>',
        "unreadable fill-opacity": f'<svg><path fill-opacity="half" {sq}/></svg>',
        "unreadable stroke-opacity": f'<svg><path stroke="#000" stroke-opacity="1px" {sq}/></svg>',
        "unreadable path data": '<svg><path d="M10 10 L20 Q"/></svg>',
        "unreadable colour": f'<svg><path fill="rgb(1,2)" {sq}/></svg>',
    }
    for what, svg in refused.items():
        try:
            svg_shapes(svg)
        except MarkError as e:
            assert str(e), f"{what}: a refusal must say why"
            continue
        except Exception as e:  # anything but a MarkError is a crash of the reader
            raise AssertionError(f"an SVG with {what} must be refused with a MarkError, not {type(e).__name__}: {e}") from None
        raise AssertionError(f"an SVG with {what} must be refused")
    refused = {
        "stroke": '<svg><path d="M0 0h10v10z" stroke="#000"/></svg>',
        "colours": '<svg><path d="M0 0h10v10z" fill="#000"/><path d="M20 0h10v10z" fill="#fff"/></svg>',
        "<use>": '<svg><defs><path id="a" d="M0 0h10v10z"/></defs><use href="#a"/></svg>',
        "clip-path": '<svg><path d="M0 0h10v10z" clip-path="url(#c)"/></svg>',
        "mask": '<svg><g mask="url(#m)"><path d="M0 0h10v10z"/></g></svg>',
        "<text>": '<svg><text x="0" y="10">A</text></svg>',
        "<image>": '<svg><image href="a.png" width="10" height="10"/></svg>',
        "semi-transparent": '<svg><path d="M0 0h10v10z" opacity="0.5"/></svg>',
        "<style>": '<svg><style>.a{fill:#fff}</style><path class="a" d="M0 0h10v10z"/></svg>',
        "nested <svg>": '<svg><svg><path d="M0 0h10v10z"/></svg></svg>',
        "no shape": '<svg><path d="M0 0h10v10z" fill="none"/></svg>',
        "not SVG": "<html></html>",
    }
    for what, svg in refused.items():
        try:
            svg_shapes(svg)
        except MarkError:
            continue
        raise AssertionError(f"an SVG with {what} must be refused")
    return True
