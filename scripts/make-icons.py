#!/usr/bin/env python3
"""Generates build/icons/*.ico + *.png (suite + one per app). Re-run with: npm run icons
Needs Pillow. Colours match styles/tokens.css (--write, --cell, --present, --emerald)."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'build', 'icons')
os.makedirs(OUT, exist_ok=True)
FONTS = ['/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
         'C:/Windows/Fonts/arialbd.ttf']
FONT = next((f for f in FONTS if os.path.exists(f)), None)
S = 1024  # draw big, downscale for smooth edges

APPS = {  # file: (background, letter)
    'evlab':     ('#0f7a5a', None),
    'evwrite':   ('#2b6cd9', 'W'),
    'evcell':    ('#1f9d55', 'C'),
    'evpresent': ('#f2724b', 'P'),
}

def potato(d, cx, cy, w, h):
    d.ellipse([cx - w, cy - h, cx + w, cy + h], fill='#c8923f', outline='#8a5a1f', width=18)
    for dx, dy in [(-0.35, -0.2), (0.25, -0.35), (0.1, 0.25), (-0.2, 0.35), (0.45, 0.15)]:
        r = 22
        x, y = cx + dx * w, cy + dy * h
        d.ellipse([x - r, y - r, x + r, y + r], fill='#8a5a1f')

def make(name, bg, letter):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([40, 40, S - 40, S - 40], radius=210, fill=bg)
    if letter:
        f = ImageFont.truetype(FONT, 640) if FONT else ImageFont.load_default()
        d.text((S / 2, S / 2 - 40), letter, font=f, fill='white', anchor='mm')
        potato(d, S - 235, S - 235, 105, 80)   # small potato badge = suite family
    else:
        potato(d, S / 2, S / 2, 330, 250)
    im.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, name + '.png'))
    im.save(os.path.join(OUT, name + '.ico'),
            sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

for n, (bg, l) in APPS.items():
    make(n, bg, l)
print('icons written to', os.path.abspath(OUT))
