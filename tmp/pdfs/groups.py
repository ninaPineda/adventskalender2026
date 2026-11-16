from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
import io,re,copy
pdfmetrics.registerFont(TTFont('Yovalina','/Users/ninaheinrich/Library/Fonts/YovalinaDream-Regular.ttf'))
groups=[
('VfL Geesthacht von 1885','QueenBees'),('VfL Geesthacht von 1885','Mallikas'),
('VfB Schuby','Schlümpfe'),('VfB Schuby','Schlumpfinen'),
('TSV Oeversee','Funkelfüchse'),('TSV Oeversee','Glitzermäuse'),
('TSV Nordmark Satrup','Zitronen'),('TSV Nordmark Satrup','Kirschen'),('TSV Nordmark Satrup','Strawberries'),('TSV Nordmark Satrup','Himbeeren'),
('TSV Nord Harrislee','Nordminis'),('TSV Nord Harrislee','Nordgirls'),('TSV Nord Harrislee','Nordmix'),('TSV Nord Harrislee','Nord Mini Minis'),('TSV Nord Harrislee','Nordkids'),
('TSV Großsolt-Freienwill','Zimtis'),('TSV Großsolt-Freienwill','Zimtschnecken'),('TSV Großsolt-Freienwill','Fridays'),
('TSV Gadeland','Kaulis'),('TSB Flensburg','Klabauter'),('Tönninger SV','Minnie Mäuse'),
('THW Kiel e. V. von 1904','Zebralinas'),('THW Kiel e. V. von 1904','Glitzerzebras'),
('SVT Neumünster','Marinies'),('SVT Neumünster','Sternies'),
('STV Sörup','Glückslichter'),('STV Sörup','Nordlichter'),('STV Sörup','Sternlichter'),('STV Sörup','Minilichter'),
('Kaltenkirchener Turnerschaft','Die Novas'),('ETSV Fortuna Glückstadt','TGW 4'),('ETSV Fortuna Glückstadt','TGW 3'),
('Büdelsdorfer TSV','BlauBärchen'),('Büdelsdorfer TSV','BlauWale'),('Büdelsdorfer TSV','BlueStars'),('1. SC Norderstedt','Supernovas')]
colors={'VfL':(0,.52,.78),'VfB':(0,.52,.78),'Oeversee':(0,.52,.78),'Nordmark':(.875,0,.14),'Harrislee':(0,.624,.24),'Großsolt':(.875,0,.14),'Gadeland':(0,.624,.24),'Flensburg':(.875,0,.14),'Tönninger':(.956,.765,0),'Kiel':(0,0,0),'Neumünster':(.956,.765,0),'Sörup':(0,.624,.24),'Kaltenkirchener':(0,0,0),'Fortuna':(0,0,0),'Büdelsdorfer':(0,.52,.78),'Norderstedt':(0,0,0)}
source=PdfReader('/Users/ninaheinrich/Desktop/Schilder 1.0.pdf');base=source.pages[0];s=base.get_contents().get_data().decode('latin1');ms=list(re.finditer(r'q\n.*?\nQ\n',s,re.S))[:6];dec=''
for i,m in enumerate(ms):
 x,y=(0,595.276) if i in (1,2,3) else (841.89,0)
 dec+=f'q\n0.60 0 0 0.60 {x*.4} {y*.4} cm\n'+m.group().replace('B*','f*')+'Q\n'
w=PdfWriter()
for club,team in groups:
 p=copy.copy(base);st=DecodedStreamObject();st.set_data(dec.encode('latin1'));p[NameObject('/Contents')]=st
 b=io.BytesIO();c=canvas.Canvas(b,pagesize=(841.89,595.276))
 c.setFillColorRGB(.35,.35,.35);c.setFont('Yovalina',23);# Label entfernt
 col=next((v for k,v in colors.items() if k in club),(0,0,0));c.setFillColorRGB(*col)
 size=min(112,665/pdfmetrics.stringWidth(team,'Yovalina',1));c.setFont('Yovalina',size);c.drawCentredString(420.945,307-size*.32,team)
 c.setStrokeColorRGB(.82,.82,.82);c.setLineWidth(1);c.line(360,226,482,226)
 size=min(35,650/pdfmetrics.stringWidth(club,'Yovalina',1));c.setFont('Yovalina',size);c.setFillColorRGB(.18,.18,.18);c.drawCentredString(420.945,169,club)
 c.save();b.seek(0);p.merge_page(PdfReader(b).pages[0]);w.add_page(p)
w.add_metadata({'/Title':'Schlafraumschilder – 36 Mannschaften'})
with open('output/pdf/Gruppenschilder-36-Mannschaften.pdf','wb') as f:w.write(f)
print('Seiten:',len(w.pages))
