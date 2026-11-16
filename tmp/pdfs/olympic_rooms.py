import runpy,io,copy
v=runpy.run_path('tmp/pdfs/sleep.py')
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
sports=[
('Fechten','Elegant und blitzschnell.'),('Badminton','Leicht im Spiel, stark im Team.'),('Fußball','Kleine Helden, großes Team.'),('Hockey','Gemeinsam am Ball.'),('Bogenschießen','Schlau gezielt. Gemeinsam getroffen.'),('Rhythmische Sportgymnastik','Mit Schwung und Glanz.'),('Rugby Sevens','Spritzig und voller Energie.'),('Tischtennis','Klein, flink und voller Power.'),('Beachvolleyball','Sonne im Herzen, Teamgeist im Spiel.'),('Volleyball','Gemeinsam hoch hinaus.'),('Trampolinturnen','Kleine Sprünge, große Träume.'),('Gerätturnen','Mut zeigen. Haltung bewahren.'),('Triathlon','Vielfalt ist unsere Stärke.'),('Skateboarding','Mut beginnt mit dem ersten Versuch.'),('BMX-Racing','Zusammen nehmen wir Fahrt auf.'),('Golf','Mit Ruhe und Gefühl zum Ziel.'),('Radsport Bahn','Gemeinsam drehen wir auf.'),('Surfen','Wir reiten unsere eigene Welle.'),('Wasserspringen','Mit Mut ins Abenteuer.'),('Segeln','Gemeinsam auf Kurs.'),('Sportklettern','Schritt für Schritt nach oben.'),('Reitsport','Vertrauen macht uns stark.'),('Synchronschwimmen','Gemeinsam im gleichen Rhythmus.'),('Rudern','Alle in einem Boot.'),('Basketball','Wir greifen nach den Sternen.'),('Tennis','Mit Freude zum nächsten Punkt.'),('Freiwasserschwimmen','Unser Kurs führt nach vorn.'),('Handball','Zusammen bringen wir das Spiel zum Leuchten.'),('Schwimmen','Jede Bahn ein kleines Abenteuer.'),('Leichtathletik','Neue Energie. Große Ziele.'),('Kanusprint','Gemeinsam mit voller Kraft voraus.'),('Kanuslalom','Geschickt durch jede Herausforderung.'),('Gewichtheben','Zusammen sind wir bärenstark.'),('Wasserball','In unserem Element.'),('Mountainbike','Unser Weg darf abenteuerlich sein.'),('BMX-Freestyle','Unsere Ideen kennen keine Grenzen.')]
w=PdfWriter()
for (club,team),(sport,motto) in zip(v['groups'],sports):
 p=copy.copy(v['base']);st=DecodedStreamObject();st.set_data(v['dec'].encode('latin1'));p[NameObject('/Contents')]=st
 b=io.BytesIO();c=canvas.Canvas(b,pagesize=(841.89,595.276))
 col=next((val for key,val in v['colors'].items() if key in club),(0,0,0))
 lines=['Rhythmische','Sportgymnastik'] if sport=='Rhythmische Sportgymnastik' else [sport]
 size=min(80 if len(lines)==2 else 100,min(665/pdfmetrics.stringWidth(t,'Yovalina',1) for t in lines))
 c.setFillColorRGB(*col);c.setFont('Yovalina',size)
 for j,line in enumerate(lines):c.drawCentredString(420.945,(405 if len(lines)==2 else 350)-j*size*1.12,line)
 c.setFillColorRGB(.10,.10,.10);size=min(45,660/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size);c.drawCentredString(420.945,235,team)
 size=min(27,650/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.30,.30,.30);c.drawCentredString(420.945,190,club)
 c.setStrokeColorRGB(*col);c.setLineWidth(2);c.line(391,150,451,150)
 size=min(27,640/pdfmetrics.stringWidth(motto,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.18,.18,.18);c.drawCentredString(420.945,109,motto)
 c.save();b.seek(0);p.merge_page(PdfReader(b).pages[0]);w.add_page(p)
w.add_metadata({'/Title':'Olympische Gruppenräume – 36 Schilder mit Motto'})
with open('output/pdf/Olympische-Gruppenraeume-36-Schilder.pdf','wb') as f:w.write(f)
assert len(w.pages)==36
