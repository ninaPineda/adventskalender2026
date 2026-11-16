import runpy,io,copy
v=runpy.run_path('tmp/pdfs/olympic_rooms.py')
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
im=Image.open('tmp/pdfs/grid-hi-14.png')
positions=[(1,7),(0,2),(1,8),(2,3),(3,6),(1,11),(2,11),(3,4),(3,10),(3,9),(2,0),(1,10),(3,7),(3,0),(0,7),(1,9),(0,9),(3,1),(2,8),(3,8),(1,6),(1,4),(2,7),(0,1),(0,3),(3,3),(2,6),(2,2),(2,6),(0,0),(1,1),(1,2),(2,1),(2,9),(1,0),(0,8)]
w=PdfWriter()
for i,((club,team),(sport,motto),(row,col)) in enumerate(zip(v['v']['groups'],v['sports'],positions)):
 p=copy.copy(v['v']['base']);st=DecodedStreamObject();st.set_data(v['v']['dec'].encode('latin1'));p[NameObject('/Contents')]=st
 cx=(110+143.6*col)*2;cy=(290+179*row)*2
 crop=im.crop((int(cx-84),int(cy-84),int(cx+84),int(cy+84)));path=f'tmp/pdfs/picto-{i}.png';crop.save(path)
 b=io.BytesIO();c=canvas.Canvas(b,pagesize=(841.89,595.276))
 color=next((val for key,val in v['v']['colors'].items() if key in club),(0,0,0))
 size=min(112,665/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(*color);c.drawCentredString(420.945,390-size*.32,team)
 size=min(35,650/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.14,.14,.14);c.drawCentredString(420.945,290,club)
 # A single horizontal theme panel groups icon, sport and motto.
 c.setFillColorRGB(.965,.97,.975);c.setStrokeColorRGB(.86,.88,.90);c.setLineWidth(.7)
 c.roundRect(111,79,620,134,14,stroke=1,fill=1)
 c.drawImage(path,135,113,width=66,height=66,mask='auto')
 c.setStrokeColorRGB(.82,.84,.86);c.line(220,105,220,187)
 left=243;available=460
 size=min(30,available/pdfmetrics.stringWidth(sport,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.18,.18,.18);c.drawString(left,162,sport)
 # Wrap longer mottos instead of squeezing their type.
 words=motto.split();lines=[];line='';size=23
 for word in words:
  trial=(line+' '+word).strip()
  if pdfmetrics.stringWidth(trial,'Yovalina',size)>available and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 c.setFont('Yovalina',size);c.setFillColorRGB(.32,.32,.32)
 for j,line in enumerate(lines):c.drawString(left,125-j*28,line)
 c.save();b.seek(0);p.merge_page(PdfReader(b).pages[0]);w.add_page(p)
w.add_metadata({'/Title':'Gruppenschilder mit olympischem Thema und Motto','/Subject':'Sportpiktogramme: Paris 2024 Presseunterlage, assets.france.fr/in/Press_Release_Paris2024.pdf, Seite 14'})
with open('output/pdf/Gruppenschilder-36-Themenbox.pdf','wb') as f:w.write(f)
assert len(w.pages)==36
