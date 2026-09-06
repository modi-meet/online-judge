#!/usr/bin/env python3
"""Wrap hld.html (artifact fragment) into a standalone, light-theme, print-ready document."""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
SRC = sys.argv[1] if len(sys.argv) > 1 else "hld.html"
DST = sys.argv[2] if len(sys.argv) > 2 else "hld-print.html"
frag = (here / SRC).read_text()

PRINT_CSS = r"""
/* ---------- print / PDF overrides: light theme, paged media ---------- */
@page { size: A4; margin: 14mm 12mm 15mm; }

html { color-scheme: light; }
html, body { background: #FFFFFF !important; }
body { margin: 0; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.wrap { max-width: none; padding: 0; }
.cols { display: block; }
main  { max-width: none; }

/* masthead sits on its own opening page with the contents list */
.mast { padding-top: 0; margin-bottom: 30px; }
h1 { font-size: 40px; }
.deck { font-size: 16px; max-width: none; }

/* table of contents becomes a real contents block, then a page break */
nav.toc { position: static; margin: 0 0 0; page-break-after: always; break-after: page; }
nav.toc ol { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 28px; }
nav.toc a { padding: 4px 0; }

/* type scale tuned for A4 */
body { font-size: 13.5px; line-height: 1.55; }
p, ul, ol.body { max-width: none; }
h2 { font-size: 23px; margin-top: 0; }
h3 { font-size: 14.5px; margin-top: 26px; }
section { margin-bottom: 40px; }
table { font-size: 11.5px; }
th { font-size: 9px; padding: 7px 10px; }
td { padding: 8px 10px; }
td.k, td.c, td.n { white-space: normal; }
pre { font-size: 10px; line-height: 1.55; padding: 12px 14px; overflow: visible; }
figcaption { font-size: 11.5px; max-width: none; }
.thesis p { font-size: 18px; }
.mode p, .mode .stage { font-size: 12.5px; }

/* wide content must render fully, not clip at a scroll boundary */
.tw, figure .fw { overflow: visible; }

/* pagination */
h1, h2, h3 { break-after: avoid-page; break-inside: avoid; }
figure, pre, .keypt, .note, .thesis, .mode, .meta, .legend { break-inside: avoid; }
tr, thead { break-inside: avoid; }
thead { display: table-header-group; }
p, li { orphans: 3; widows: 3; }
section { break-inside: auto; }

/* the long LLD code blocks are allowed to split rather than leave half a page blank */
#s10 pre, #s7 pre { break-inside: auto; }

a { text-decoration: none; }
"""

RESET = """
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
"""

# Pull the fragment's own <title>, <link>s and <style> into a real <head>.
title = re.search(r"<title>(.*?)</title>", frag, re.S)
title = title.group(1) if title else "Document"
links = re.findall(r'<link\b[^>]*>', frag)
styles = re.findall(r"<style>(.*?)</style>", frag, re.S)

body = frag
for pat in [r"<title>.*?</title>", r'<link\b[^>]*>', r"<style>.*?</style>"]:
    body = re.sub(pat, "", body, flags=re.S)

out = f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{chr(10).join(links)}
<style>{RESET}</style>
<style>{''.join(styles)}</style>
<style>{PRINT_CSS}</style>
</head>
<body>
{body.strip()}
</body>
</html>
"""
(here / DST).write_text(out)
print(f"{DST}: {len(out)} bytes")
