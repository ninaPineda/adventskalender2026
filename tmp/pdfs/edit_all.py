from pypdf import PdfReader,PdfWriter
from pypdf.generic import DecodedStreamObject,NameObject
import re
r=PdfReader('/Users/ninaheinrich/Desktop/Schilder 1.0.pdf'); w=PdfWriter()
for n,p in enumerate(r.pages):
 s=p.get_contents().get_data().decode('latin1')
 # First six self-contained vector groups form the shared corner ornaments.
 matches=list(re.finditer(r'q\n.*?\nQ\n',s,re.S))[:6]
 assert len(matches)==6
 out=[]
 for i,m in enumerate(matches):
  x,y=(0,float(p.mediabox.height)) if i in (1,2,3) else (float(p.mediabox.width),0)
  b=m.group().replace('B*','f*')
  out.append(f'q\n0.60 0 0 0.60 {x*.4} {y*.4} cm\n'+b+'Q\n')
 content=s[matches[-1].end():]
 if n not in (6,7,8):
  # Keep semantic red/green on prohibition and entrance signs.
  content=re.sub(r'(?:\d*\.?\d+) (?:\d*\.?\d+) (?:\d*\.?\d+) rg','0.06 0.06 0.06 rg',content)
 out.append(content)
 st=DecodedStreamObject();st.set_data(''.join(out).encode('latin1'));p[NameObject('/Contents')]=st
 w.add_page(p)
w.add_metadata({'/Title':'Schilder – Olympia – überarbeitet'})
with open('output/pdf/Schilder-alle-31-Seiten.pdf','wb') as f:w.write(f)
assert len(PdfReader('output/pdf/Schilder-alle-31-Seiten.pdf').pages)==31
