from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
import re
r=PdfReader('/Users/ninaheinrich/Desktop/Beschilderung.pdf'); p=r.pages[0]
s=p.get_contents().get_data().decode('latin1')
parts=s.split('q\n/GS3 gs')
dec=parts[0]
# Reduce corner ornaments around their respective page corners.
blocks=re.findall(r'q\n.*?\nQ',dec,re.S)
out=[]
for i,b in enumerate(blocks):
    anchor=(0,595.44) if i in (1,2,3) else (841.92,0)
    x,y=anchor
    out.append(f'q\n0.65 0 0 0.65 {x*.35} {y*.35} cm\n'+b+'\nQ\n')
for i,b in enumerate(parts[1:]):
    b='q\n/GS3 gs'+b
    b=b.replace('0 0.521569 0.780392 rg','0.06 0.06 0.06 rg')
    if i==1:
        # Keep original embedded font; scale ampersand about its visual centre.
        b='q\n0.62 0 0 0.62 159.965 110.5 cm\n'+b+'\nQ\n'
    out.append(b)
stream=DecodedStreamObject();stream.set_data(''.join(out).encode('latin1'));p[NameObject('/Contents')]=stream
w=PdfWriter();w.add_page(p);w.add_metadata({'/Title':'Beschilderung – Oeversee & Schuby'})
with open('output/pdf/Beschilderung-ueberarbeitet.pdf','wb') as f:w.write(f)
