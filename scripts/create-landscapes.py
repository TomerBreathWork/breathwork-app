"""Generate original, locally bundled placeholder landscape illustrations."""
from PIL import Image, ImageDraw, ImageFilter
import random, math
from pathlib import Path
random.seed(24)
W,H=1800,1200
for scene in ['alpine','coast']:
 im=Image.new('RGB',(W,H));pix=im.load()
 for y in range(H):
  t=y/H
  color=tuple(int(a+(b-a)*t) for a,b in zip((217,225,202),(74,121,125)))
  for x in range(W): pix[x,y]=color
 d=ImageDraw.Draw(im)
 d.ellipse((1190,120,1330,260),fill=(238,234,202))
 if scene=='alpine':
  for layer,color in enumerate([(149,172,164),(112,146,143),(71,115,117)]):
   points=[(-100,720)]
   for x in range(-100,W+200,100):points.append((x,480+layer*70+int(100*math.sin(x/210+layer))+random.randint(-70,70)))
   points.extend([(W+100,850),(-100,850)])
   d.polygon(points,fill=color)
  d.polygon([(0,680),(250,620),(500,735),(800,765),(400,850),(0,920)],fill=(46,88,87))
 else:
  d.polygon([(0,710),(400,650),(700,725),(W,700),(W,H),(0,H)],fill=(87,143,149))
  d.polygon([(0,800),(280,755),(520,820),(700,1000),(900,H),(0,H)],fill=(171,179,153))
 for i in range(130):
  y=random.randint(780,H);x=random.randint(0,W);length=random.randint(20,210)
  d.line((x,y,x+length,y),fill=(131,169,161),width=random.randint(1,3))
 if scene=='alpine':
  for x in range(0,380,17):
   height=random.randint(80,240);y=950+int(x/8)
   d.polygon([(x,y-height),(x-32,y),(x+32,y)],fill=(31,68,65))
 im=im.filter(ImageFilter.GaussianBlur(1.1))
 Path('public/media').mkdir(parents=True,exist_ok=True)
 im.save(f'public/media/{scene}.webp',quality=88)
