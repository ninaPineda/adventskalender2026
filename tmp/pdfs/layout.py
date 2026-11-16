exec(open('tmp/pdfs/edit_all.py').read().split('for n,p')[0])
import copy,subprocess
from PIL import Image,ImageChops
records=[]; probe=PdfWriter()
def stream(p,s):
 st=DecodedStreamObject();st.set_data(s.encode('latin1'));p[NameObject('/Contents')]=st
for n,p in enumerate(r.pages):
 s=p.get_contents().get_data().decode('latin1'); ms=list(re.finditer(r'q\n.*?\nQ\n',s,re.S))[:6]
 dec=[]
 for i,m in enumerate(ms):
  x,y=(0,595.276) if i in (1,2,3) else (841.89,0)
  dec.append(f'q\n0.60 0 0 0.60 {x*.4} {y*.4} cm\n'+m.group().replace('B*','f*')+'Q\n')
 rest=s[ms[-1].end():]; groups=[]; start=0; depth=0
 for m in re.finditer(r'(?m)^[qQ]\s*$',rest):
  if m.group().strip()=='q':
   if depth==0:start=m.start()
   depth+=1
  else:
   depth-=1
   if depth==0:groups.append(rest[start:m.end()]+'\n')
 text=''.join(g for g in groups if ' Tf' in g)
 icons=''.join(g for g in groups if ' Tf' not in g)
 if not text: icons=rest
 records.append((''.join(dec),text,icons))
 for c in (text,icons):
  pp=copy.copy(p);stream(pp,c);probe.add_page(pp)
with open('tmp/pdfs/probes.pdf','wb') as f:probe.write(f)
subprocess.run(['pdftoppm','-scale-to','842','-png','tmp/pdfs/probes.pdf','tmp/pdfs/probe'],check=True,stdout=subprocess.DEVNULL)
def place(c,idx,target):
 if not c.strip():return ''
 im=Image.open(f'tmp/pdfs/probe-{idx:02}.png').convert('RGB'); diff=ImageChops.difference(im,Image.new('RGB',im.size,'white')); bb=diff.convert('L').point(lambda a:255 if a>30 else 0).getbbox()
 if not bb:return c
 l,t,rr,b=bb; sx=841.89/im.width;sy=595.276/im.height
 x=l*sx;y=(im.height-b)*sy;ww=(rr-l)*sx;hh=(b-t)*sy
 cx,cy,mw,mh=target;scale=min(mw/ww,mh/hh)
 return f'q\n{scale} 0 0 {scale} {cx-scale*(x+ww/2)} {cy-scale*(y+hh/2)} cm\n'+f'{x} {y} {ww} {hh} re W n\n'+c+'Q\n'
w=PdfWriter()
for n,(dec,text,icons) in enumerate(records):
 if text and icons:
  a=place(text,n*2+1,(420.945,395,650,130));b=place(icons,n*2+2,(420.945,215,340,165))
 elif text:a=place(text,n*2+1,(420.945,297.638,650,280));b=''
 else:a='';b=place(icons,n*2+2,(420.945,297.638,550,300))
 p=copy.copy(r.pages[n]);stream(p,dec+a+b);w.add_page(p)
with open('output/pdf/Schilder-31-Seiten-Originalfarben-Layout.pdf','wb') as f:w.write(f)
