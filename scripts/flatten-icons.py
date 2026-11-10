"""Flattens the Chromium renders to opaque RGB and writes every icon size. Run after build-icons.mjs."""
from PIL import Image
import os
BG = (0x3d, 0x1f, 0x4a)
def flat(path):
    src = Image.open(path).convert('RGBA')
    out = Image.new('RGB', src.size, BG)
    out.paste(src, mask=src.split()[3])
    return out
master = flat('docs/store/app-icon-1024-raw.png')
master.save('docs/store/app-icon-1024.png', optimize=True)
master.save('resources/icon-only.png', optimize=True)
for name, size in {'icon-192.png': 192, 'icon-512.png': 512, 'icon-maskable-192.png': 192, 'icon-maskable-512.png': 512, 'apple-touch-icon.png': 180, 'favicon-32.png': 32}.items():
    master.resize((size, size), Image.LANCZOS).save(os.path.join('public', name), optimize=True)
splash = flat('resources/splash-raw.png')
splash.save('resources/splash.png', optimize=True)
splash.save('resources/splash-dark.png', optimize=True)
for raw in ('docs/store/app-icon-1024-raw.png', 'resources/splash-raw.png'):
    os.remove(raw)
print('icons written')
