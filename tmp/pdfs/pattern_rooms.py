import runpy,io,copy
v=runpy.run_path('tmp/pdfs/olympic_rooms.py')
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
from PIL import Image
src=PdfReader('/Users/ninaheinrich/Desktop/Gruppenschilder-36-Olympiarahmen-Silhouetten.pdf');base=src.pages[0]
s=base.get_contents().get_data().decode('latin1');dec=s[s.index('q\n0 0 m'):]
w=PdfWriter()
for i,((club,team),(sport,motto)) in enumerate(zip(v['v']['groups'],v['sports'])):
 p=copy.copy(base);st=DecodedStreamObject();st.set_data(dec.encode('latin1'));p[NameObject('/Contents')]=st
 b=io.BytesIO();c=canvas.Canvas(b,pagesize=(842,596))
 color=next((val for key,val in v['v']['colors'].items() if key in club),(0,0,0))
 size=min(110,715/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(*color);c.drawCentredString(421,377.724,team)
 size=min(34,710/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.22,.22,.22);c.drawCentredString(421,322.724,club)
 c.setStrokeColorRGB(.85,.86,.87);c.setLineWidth(1);c.line(61,242.724,780,242.724)
 c.setFont('Yovalina',27);c.setFillColorRGB(.12,.12,.12);c.drawString(88.4175,153.043,sport)
 words=motto.split();lines=[];line=''
 for word in words:
  trial=(line+' '+word).strip()
  if pdfmetrics.stringWidth(trial,'Yovalina',27)>420 and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 c.setFillColorRGB(.32,.32,.32)
 for j,line in enumerate(lines):c.drawString(90.4175,116.043-j*33,line)
 im=Image.open(f'tmp/pdfs/silhouette-{i}.png');ww,hh=im.size;scale=min(133/ww,125/hh)
 c.drawImage(f'tmp/pdfs/silhouette-{i}.png',605.47-ww*scale/2,123-hh*scale/2,width=ww*scale,height=hh*scale,mask='auto')
 c.save();b.seek(0);p.merge_page(PdfReader(b).pages[0]);w.add_page(p)
w.add_metadata({'/Title':'36 Gruppenschilder nach deinem Muster'})
with open('output/pdf/Gruppenschilder-36-Nach-deinem-Muster.pdf','wb') as f:w.write(f)
assert len(w.pages)==36
