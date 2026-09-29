"""Stamp each stylesheet and script link in index.html with a hash of the
file's contents, so a browser fetches a file again exactly when it changed.

Run before committing:  python3 tools/stamp.py
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
html = page.read_text()

def stamp(m):
    attr, path = m.group(1), m.group(2)
    f = root / path
    if not f.exists():
        return m.group(0)
    h = hashlib.sha1(f.read_bytes()).hexdigest()[:8]
    return f'{attr}="{path}?v={h}"'

out = re.sub(r'(href|src)="([\w./-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"', stamp, html)
if out != html:
    page.write_text(out)
    print('stamped')
else:
    print('already current')
