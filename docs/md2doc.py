#!/usr/bin/env python3
"""Render a docs markdown file into the project's design system HTML.

Usage: python3 md2doc.py LLD.md lld.html
The <style> block is lifted from hld.html so every doc in docs/ looks like one series.
Supports: frontmatter, ## / ### headings, GFM tables, fenced code, lists,
blockquotes (-> .keypt), inline **bold** *italic* `code` [links](url),
and raw HTML passthrough between <!--html--> and <!--/html-->.
"""
import re, sys, html, pathlib

here = pathlib.Path(__file__).parent


def esc(t):
    return html.escape(t, quote=False)


def inline(t):
    t = esc(t)
    t = re.sub(r'`([^`]+)`', lambda m: f'<code>{m.group(1)}</code>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<em>\1</em>', t)
    return t


def frontmatter(lines):
    meta, deck, title, eyebrow = {}, '', 'Document', ''
    if not lines or lines[0].strip() != '---':
        return title, eyebrow, deck, meta, lines
    end = next(i for i in range(1, len(lines)) if lines[i].strip() == '---')
    inmeta = False
    for ln in lines[1:end]:
        if re.match(r'^\s+\S', ln) and inmeta:
            k, _, v = ln.strip().partition(':')
            meta[k.strip()] = v.strip()
            continue
        inmeta = False
        k, _, v = ln.partition(':')
        k, v = k.strip(), v.strip()
        if k == 'meta' and not v:
            inmeta = True
        elif k == 'title':
            title = v
        elif k == 'eyebrow':
            eyebrow = v
        elif k == 'deck':
            deck = v
    return title, eyebrow, deck, meta, lines[end + 1:]


def render_table(rows):
    head, body = rows[0], rows[2:]
    out = ['<div class="tw"><table>', '<thead><tr>']
    out += [f'<th>{inline(c)}</th>' for c in head]
    out += ['</tr></thead>', '<tbody>']
    for r in body:
        out.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
    out += ['</tbody>', '</table></div>']
    return '\n'.join(out)


def split_row(ln):
    return [c.strip() for c in ln.strip().strip('|').split('|')]


def render(src):
    title, eyebrow, deck, meta, lines = frontmatter(src.split('\n'))
    body, toc = [], []
    i, n = 0, len(lines)

    while i < n:
        ln = lines[i]

        if ln.strip() == '<!--html-->':
            j = i + 1
            raw = []
            while j < n and lines[j].strip() != '<!--/html-->':
                raw.append(lines[j]); j += 1
            body.append('\n'.join(raw)); i = j + 1; continue

        if ln.startswith('```'):
            j = i + 1
            code = []
            while j < n and not lines[j].startswith('```'):
                code.append(lines[j]); j += 1
            body.append('<pre>' + esc('\n'.join(code)) + '</pre>')
            i = j + 1; continue

        m = re.match(r'^## +(\d+(?:\.\d+)*)\.? +(.*)$', ln)
        if m:
            num, t = m.group(1), m.group(2)
            sid = 's' + num.replace('.', '_')
            toc.append((num, t, sid))
            if body: body.append('</section>')
            body.append(f'<section id="{sid}">')
            body.append(f'<h2><span class="num">{num.zfill(2) if num.isdigit() else num}</span>{inline(t)}</h2>')
            i += 1; continue

        m = re.match(r'^### +(\d+(?:\.\d+)*)\.? +(.*)$', ln)
        if m:
            body.append(f'<h3><span class="num">{m.group(1)}</span>{inline(m.group(2))}</h3>')
            i += 1; continue

        if ln.strip().startswith('|') and i + 1 < n and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i + 1]):
            rows, j = [], i
            while j < n and lines[j].strip().startswith('|'):
                rows.append(split_row(lines[j])); j += 1
            body.append(render_table(rows)); i = j; continue

        if ln.startswith('> '):
            quote, j = [], i
            while j < n and lines[j].startswith('> '):
                quote.append(lines[j][2:]); j += 1
            body.append(f'<div class="keypt"><p>{inline(" ".join(quote))}</p></div>')
            i = j; continue

        if re.match(r'^[-*] ', ln):
            items, j = [], i
            while j < n and re.match(r'^[-*] ', lines[j]):
                items.append(inline(lines[j][2:])); j += 1
            body.append('<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>')
            i = j; continue

        if re.match(r'^\d+\. ', ln):
            items, j = [], i
            while j < n and re.match(r'^\d+\. ', lines[j]):
                items.append(inline(re.sub(r'^\d+\. ', '', lines[j]))); j += 1
            body.append('<ol class="body">' + ''.join(f'<li>{x}</li>' for x in items) + '</ol>')
            i = j; continue

        if ln.strip() in ('', '---'):
            i += 1; continue

        para, j = [], i
        while j < n and lines[j].strip() and not re.match(
                r'^(#{2,3} |\||```|> |[-*] |\d+\. |<!--html-->)', lines[j]):
            para.append(lines[j]); j += 1
        body.append(f'<p>{inline(" ".join(para))}</p>')
        i = j

    if body: body.append('</section>')

    nav = ['<nav class="toc"><span class="lb">Contents</span><ol>']
    for num, t, sid in toc:
        nav.append(f'<li><a href="#{sid}"><span>{num.zfill(2) if num.isdigit() else num}</span>{esc(t)}</a></li>')
    nav.append('</ol></nav>')

    metahtml = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in meta.items())
    style = re.search(r'<style>(.*?)</style>', (here / 'hld.html').read_text(), re.S).group(1)
    links = re.findall(r'<link\b[^>]*>', (here / 'hld.html').read_text())

    return f"""<title>{esc(title)}</title>
{chr(10).join(links)}
<style>{style}</style>
<div class="wrap">
<header class="mast">
  <p class="eyebrow">{esc(eyebrow)}</p>
  <h1>{esc(title)}</h1>
  <p class="deck">{esc(deck)}</p>
  <dl class="meta">{metahtml}</dl>
</header>
<div class="cols">
{''.join(nav)}
<main>
{chr(10).join(body)}
</main>
</div>
</div>
"""


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    out = render((here / src).read_text())
    (here / dst).write_text(out)
    print(f"{src} -> {dst}: {len(out)} bytes")
