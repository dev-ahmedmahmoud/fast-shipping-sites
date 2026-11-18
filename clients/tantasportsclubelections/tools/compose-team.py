# Usage: python3 clients/tantasportsclubelections/tools/compose-team.py clients/tantasportsclubelections/media <out-dir>
# Builds a symmetric team picture (1400x780, transparent) from the individual cut-outs:
# back row of 5 with the leader at the exact centre and on top, front row of 7 centred on the
# same axis (vice-president in the middle). Bodies run off the bottom edge.
import sys, os
BACK_Y = int(os.environ.get('BACK_Y', 165)); LEAD_Y = int(os.environ.get('LEAD_Y', 120))
from PIL import Image, ImageFilter
M, OUT = sys.argv[1], sys.argv[2]
W, H, CX = 1400, 780, 700
back = ['mohamed-el-menshawy', 'ashoush', 'hussein-dawood', 'mostafa-el-shamkawy', 'khaled-hamza']
# Photos cropped on one side face that side inwards, under the next person in (drawn later):
# Mabrouk (cropped right) left of centre; Attia (cropped left) at the left end, past the edge.
front = ['mohamed-attia', 'karim-abu-elazm', 'mohamed-mabrouk', 'mohamed-sedky', 'waleed-afify', 'fathy-selim', 'ahmed-sweilem']

def card(name, scale, extend=0):
    im = Image.open(f'{M}/{name}-card.webp').convert('RGBA')
    if extend:
        # Continue the body below the photo's bottom edge: the bottom rows mirrored, fading out,
        # so a raised back row never shows its cut between the front row's shoulders.
        strip = im.crop((0, im.height - extend, im.width, im.height)).transpose(Image.FLIP_TOP_BOTTOM)
        fade = Image.linear_gradient('L').resize((im.width, extend))  # 0 at top -> 255 at bottom
        a = Image.composite(Image.new('L', strip.size, 0), strip.getchannel('A'), fade)
        strip.putalpha(a)
        tall = Image.new('RGBA', (im.width, im.height + extend), (0, 0, 0, 0))
        tall.paste(im, (0, 0)); tall.paste(strip, (0, im.height))
        im = tall
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

def head_top(im):
    a = im.getchannel('A')
    for y in range(im.height):
        if a.crop((0, y, im.width, y + 1)).getextrema()[1] > 128: return y
    return 0

def place(canvas, im, cx, top_of_head, shadow=False):
    x = round(cx - im.width / 2)
    y = round(top_of_head - head_top(im))
    if shadow:
        sh = Image.new('RGBA', im.size, (8, 12, 30, 0))
        sh.putalpha(im.getchannel('A').point(lambda v: int(v * 0.45)).filter(ImageFilter.GaussianBlur(10)))
        canvas.alpha_composite(sh, (x, y + 8)) if x >= 0 and y + 8 >= 0 else canvas.paste(sh, (x, y + 8), sh)
    if x >= 0 and y >= 0:
        canvas.alpha_composite(im, (x, y))
    else:
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); layer.paste(im, (x, y), im)
        canvas.alpha_composite(layer)

canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
# Back row: outer pairs first, the leader last (on top), slightly larger and higher.
sb, sl, sf = 0.45, 0.51, 0.48
back_x = {0: CX - 360, 1: CX - 180, 2: CX, 3: CX + 180, 4: CX + 360}
for i in (0, 4, 1, 3):
    place(canvas, card(back[i], sb, 260), back_x[i], BACK_Y)
place(canvas, card(back[2], sl, 260), CX, LEAD_Y)
# Front row: from the ends inwards, the centre on top; each casts a soft shadow on the row behind.
step = 172
front_x = {i: CX + (i - 3) * step for i in range(7)}
for i in (0, 6, 1, 5, 2, 4, 3):
    place(canvas, card(front[i], sf), front_x[i], 372, shadow=True)
canvas.save(OUT + '/team.webp', quality=90, method=6)
bg = Image.new('RGBA', (W, H), (20, 30, 80, 255)); bg.alpha_composite(canvas)
g = bg.copy(); 
from PIL import ImageDraw
d = ImageDraw.Draw(g); d.line([(CX, 0), (CX, H)], fill=(255, 0, 255, 255), width=1)
g.convert('RGB').save(OUT + '/team-navy.jpg', quality=88)
print('ok', canvas.size)
