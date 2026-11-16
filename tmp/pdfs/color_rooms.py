import runpy,io
v=runpy.run_path('tmp/pdfs/olympic_rooms.py')
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from PIL import Image
from pypdf import PdfReader
out='output/pdf/Gruppenschilder-36-Farbige-Icons.pdf'
c=canvas.Canvas(out,pagesize=(841.89,595.276));c.setTitle('Gruppenschilder – neues Design – 36 Mannschaften')
for i,((club,team),(sport,motto)) in enumerate(zip(v['v']['groups'],v['sports'])):
 color=next((val for key,val in v['v']['colors'].items() if key in club),(0,0,0))
 # Left-aligned identity is the first visual anchor.
 c.setFillColorRGB(*color);c.roundRect(59,503,50,7,3.5,stroke=0,fill=1)
 size=min(110,720/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size)
 c.drawString(59,410,team)
 c.setFillColorRGB(.22,.22,.22);size=min(45,710/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.drawString(61,355,club)
 c.setStrokeColorRGB(.85,.86,.87);c.setLineWidth(1);c.line(61,242,780,242)
 # Quiet secondary area: large pictogram on the right, theme and motto on the left.
 
 lines=[sport]
 size=27;c.setFont('Yovalina',size);c.setFillColorRGB(.12,.12,.12)
 for j,line in enumerate(lines):c.drawString(61,192-j*36,line)
 # Keep motto lower, giving long sports labels room.
 words=motto.split();lines=[];line=''
 for word in words:
  trial=(line+' '+word).strip()
  if pdfmetrics.stringWidth(trial,'Yovalina',27)>490 and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 c.setFont('Yovalina',27);c.setFillColorRGB(.32,.32,.32)
 for j,line in enumerate(lines):c.drawString(61,137-j*34,line)
 # Preserve the published pictogram; remove only white space surrounding its blue circle.
 im=Image.open(f'tmp/pdfs/picto-{i}.png').convert('RGBA');pix=im.load()
 for yy in range(im.height):
  for xx in range(im.width):
   rr,gg,bb,aa=pix[xx,yy]
   if rr>225 and gg>225 and bb>225:
    if (xx-im.width/2)**2+(yy-im.height/2)**2>(im.width*.485)**2:pix[xx,yy]=(255,255,255,0)
   else:
    # Retain the white athlete and recolor the blue background, including antialiased edges.
    a=max(0,min(1,(255-rr)/255))
    pix[xx,yy]=tuple(int(255*(1-a)+255*k*a) for k in color)+(aa,)
 path=f'tmp/pdfs/editorial-picto-{i}.png';im.save(path)
 c.drawImage(path,624,90,width=144,height=144,mask='auto')
 c.showPage()
c.save()
assert len(PdfReader(out).pages)==36
