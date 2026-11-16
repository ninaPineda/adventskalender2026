import runpy,io
from pypdf import PdfReader,PdfWriter
from reportlab.pdfgen import canvas
v=runpy.run_path('tmp/pdfs/layout.py')
r=PdfReader('output/pdf/Schilder-31-Seiten-Originalfarben-Layout.pdf');w=PdfWriter()
for i,p in enumerate(r.pages):
 if i in (17,18):
  dec,text,_=v['records'][i]
  v['stream'](p,dec+v['place'](text,i*2+1,(420.945,395,650,130)))
  buf=io.BytesIO(); c=canvas.Canvas(buf,pagesize=(841.89,595.276));c.setStrokeColorRGB(.12,.12,.12);c.setFillColorRGB(.12,.12,.12);c.setLineWidth(7);c.setLineCap(1);c.setLineJoin(1)
  if i==17:
   # Plate, fork and spoon: universal dining symbol.
   c.circle(420.945,215,66,stroke=1,fill=0);c.circle(420.945,215,48,stroke=1,fill=0)
   x=317
   for dx in (-12,0,12):c.line(x+dx,277,x+dx,244)
   q=c.beginPath();q.moveTo(x-12,244);q.curveTo(x-12,226,x+12,226,x+12,244);c.drawPath(q)
   c.line(x,232,x,150)
   c.ellipse(510,235,540,280,stroke=1,fill=0);c.line(525,235,525,150)
  else:
   # Plate held over a wash basin, faucet and water drops.
   c.circle(415,226,46,stroke=1,fill=0);c.circle(415,226,30,stroke=1,fill=0)
   q=c.beginPath();q.moveTo(315,185);q.lineTo(330,155);q.curveTo(333,148,340,145,350,145);q.lineTo(492,145);q.curveTo(502,145,509,148,512,155);q.lineTo(527,185);c.drawPath(q)
   c.line(305,185,537,185)
   q=c.beginPath();q.moveTo(505,285);q.lineTo(505,304);q.curveTo(505,324,470,324,470,304);q.lineTo(470,284);q.lineTo(451,284);c.drawPath(q)
   c.line(505,304,527,304)
   for x,y in [(456,266),(472,247)]:
    q=c.beginPath();q.moveTo(x,y+9);q.curveTo(x-10,y-2,x-7,y-10,x,y-10);q.curveTo(x+7,y-10,x+10,y-2,x,y+9);c.drawPath(q,stroke=0,fill=1)
  c.save();buf.seek(0);p.merge_page(PdfReader(buf).pages[0])
 w.add_page(p)
with open('output/pdf/Schilder-31-Seiten-verbesserte-Piktogramme.pdf','wb') as f:w.write(f)
