import runpy,io
v=runpy.run_path('tmp/pdfs/olympic_rooms.py')
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from PIL import Image
from pypdf import PdfReader
out='output/pdf/Gruppenschilder-36-Neues-Design.pdf'
c=canvas.Canvas(out,pagesize=(841.89,595.276));c.setTitle('Gruppenschilder – neues Design – 36 Mannschaften')
for i,((club,team),(sport,motto)) in enumerate(zip(v['v']['groups'],v['sports'])):
 color=next((val for key,val in v['v']['colors'].items() if key in club),(0,0,0))
 # Left-aligned identity is the first visual anchor.
 c.setFillColorRGB(*color);c.roundRect(59,503,50,7,3.5,stroke=0,fill=1)
 size=min(110,720/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size)
 c.drawString(59,410,team)
 c.setFillColorRGB(.22,.22,.22);size=min(32,710/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.drawString(61,355,club)
 c.setStrokeColorRGB(.85,.86,.87);c.setLineWidth(1);c.line(61,309,780,309)
 # Quiet secondary area: large pictogram on the right, theme and motto on the left.
 c.setFillColorRGB(.40,.40,.40);c.setFont('Yovalina',19);c.drawString(61,267,'Unser olympisches Thema')
 lines=['Rhythmische','Sportgymnastik'] if sport=='Rhythmische Sportgymnastik' else [sport]
 size=min(46, min(490/pdfmetrics.stringWidth(line,'Yovalina',1) for line in lines));c.setFont('Yovalina',size);c.setFillColorRGB(.12,.12,.12)
 for j,line in enumerate(lines):c.drawString(61,213-j*51,line)
 # Keep motto lower, giving long sports labels room.
 words=motto.split();lines=[];line=''
 for word in words:
  trial=(line+' '+word).strip()
  if pdfmetrics.stringWidth(trial,'Yovalina',26)>490 and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 c.setFont('Yovalina',26);c.setFillColorRGB(.32,.32,.32)
 for j,line in enumerate(lines):c.drawString(61,107-j*32,line)
 # Preserve the published pictogram; remove only white space surrounding its blue circle.
 im=Image.open(f'tmp/pdfs/picto-{i}.png').convert('RGBA');pix=im.load()
 for yy in range(im.height):
  for xx in range(im.width):
   rr,gg,bb,aa=pix[xx,yy]
   if (xx-im.width/2)**2+(yy-im.height/2)**2>(im.width*.485)**2 and rr>225 and gg>225 and bb>225:pix[xx,yy]=(255,255,255,0)
 path=f'tmp/pdfs/editorial-picto-{i}.png';im.save(path)
 c.drawImage(path,624,135,width=144,height=144,mask='auto')
 c.showPage()
c.save()
assert len(PdfReader(out).pages)==36
