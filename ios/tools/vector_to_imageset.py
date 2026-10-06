#!/usr/bin/env python3
"""
Android vector drawable (res/drawable/*.xml) -> iOS asset-catalog imageset holding an SVG.

    python ios/tools/vector_to_imageset.py ic_ql_trending ic_ql_layers ...

The imageset is named the PascalCase of the Android res name (ic_ql_trending -> IcQlTrending), the
naming rule in ios/README.md, and keeps the vector (preserves-vector-representation), so it stays sharp at
every figmaUnit scale. Handles what the app's icons use: <path> (fill/stroke colour, alpha, width, caps,
joins, fillType) inside optional <group> translate/scale/rotate. Run from the repo root.
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

ANDROID = "{http://schemas.android.com/apk/res/android}"
RES = "android/app/src/main/res/drawable"
OUT = "ios/StakDemo/Assets.xcassets"


def pascal(name: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in name.split("_"))


def color(value: str):
    """#RGB/#RRGGBB/#AARRGGBB -> (css colour, alpha)."""
    v = value.strip().lstrip("#")
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    if len(v) == 8:
        return "#" + v[2:], int(v[:2], 16) / 255
    return "#" + v, 1.0


def attr(el, name, default=None):
    return el.get(ANDROID + name, default)


def path_svg(el) -> str:
    out = [f'<path d="{attr(el, "pathData", "")}"']
    fill = attr(el, "fillColor")
    if fill and not fill.startswith("@"):
        c, a = color(fill)
        a *= float(attr(el, "fillAlpha", "1"))
        out.append(f' fill="{c}"' + (f' fill-opacity="{a:.3f}"' if a < 1 else ""))
    else:
        out.append(' fill="none"')
    stroke = attr(el, "strokeColor")
    if stroke and not stroke.startswith("@"):
        c, a = color(stroke)
        a *= float(attr(el, "strokeAlpha", "1"))
        out.append(f' stroke="{c}" stroke-width="{attr(el, "strokeWidth", "1")}"' + (f' stroke-opacity="{a:.3f}"' if a < 1 else ""))
        cap, join = attr(el, "strokeLineCap"), attr(el, "strokeLineJoin")
        if cap:
            out.append(f' stroke-linecap="{cap}"')
        if join:
            out.append(f' stroke-linejoin="{join}"')
    if attr(el, "fillType") == "evenOdd":
        out.append(' fill-rule="evenodd"')
    out.append("/>")
    return "".join(out)


def children_svg(el) -> str:
    parts = []
    for child in el:
        tag = child.tag.split("}")[-1]
        if tag == "path":
            parts.append(path_svg(child))
        elif tag == "group":
            t = []
            tx, ty = attr(child, "translateX", "0"), attr(child, "translateY", "0")
            if tx != "0" or ty != "0":
                t.append(f"translate({tx} {ty})")
            rot = attr(child, "rotation")
            if rot:
                t.append(f'rotate({rot} {attr(child, "pivotX", "0")} {attr(child, "pivotY", "0")})')
            sx, sy = attr(child, "scaleX"), attr(child, "scaleY")
            if sx or sy:
                t.append(f"scale({sx or '1'} {sy or '1'})")
            transform = f' transform="{" ".join(t)}"' if t else ""
            parts.append(f"<g{transform}>{children_svg(child)}</g>")
    return "".join(parts)


def convert(name: str) -> None:
    root = ET.parse(os.path.join(RES, name + ".xml")).getroot()
    vw, vh = attr(root, "viewportWidth"), attr(root, "viewportHeight")
    w = attr(root, "width", vw).replace("dp", "")
    h = attr(root, "height", vh).replace("dp", "")
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {vw} {vh}">{children_svg(root)}</svg>\n'
    folder = os.path.join(OUT, pascal(name) + ".imageset")
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, name + ".svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    contents = {
        "images": [{"filename": name + ".svg", "idiom": "universal"}],
        "info": {"author": "xcode", "version": 1},
        "properties": {"preserves-vector-representation": True},
    }
    with open(os.path.join(folder, "Contents.json"), "w", encoding="utf-8") as f:
        json.dump(contents, f, indent=2)
    print(f"{name} -> {pascal(name)}.imageset")


if __name__ == "__main__":
    for n in sys.argv[1:]:
        convert(n)
