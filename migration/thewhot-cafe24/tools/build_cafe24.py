import json,re,html,shutil,hashlib,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
exec(Path(__file__).with_name('collect_source.py').read_text().split('pages={};')[0])
OUT=ROOT/'cafe24';SKIN=OUT/'skin';UPLOAD=OUT/'web/upload/thewhot';PRE=ROOT/'preview'
for p in [SKIN/'brand',SKIN/'layout/basic',SKIN/'css',UPLOAD/'images',PRE/'brand',ROOT/'review'] :p.mkdir(parents=True,exist_ok=True)
assets=json.loads((ROOT/'reports/assets.json').read_text());pages=json.loads((ROOT/'reports/pages.json').read_text())
byurl={x['url']:x for x in assets if x['status']=='downloaded'};byname={Path(urllib.parse.urlsplit(x['url']).path).name:x for x in byurl.values() if x['file'].startswith('assets/')}
used={};issues=[];configs=[];productmap=[];routing=[]
E=lambda s:html.escape(str(s),quote=True)
labels={'home':'THE WHOT','BrandStory':'Brand Story','OurProcess':'Our Process','thewhotBrewery':'the whot Brewery','Year-Round':'Year-Round','SpecialSeasonal':'Special & Seasonal','Pairing':'Pairing','OurPartners':'Our Partners','DesignbyUs':'Design by Us','DesignYourOwn':'Design Your Own','Promotion':'Promotion','People':'People','CONTACT':'CONTACT'}
aliases={'about':'BrandStory','product':'Year-Round','partnership':'OurPartners','NEWS':'Promotion','main':'home'}
for k in labels:routing.append({'source':'https://www.thewhot.com/'+('' if k=='home' else k),'target':'/index.html' if k=='home' else '/brand/'+k+'.html','action':'domain switch + redirect configuration required'})
for a,b in aliases.items():routing.append({'source':'https://www.thewhot.com/'+a,'target':'/index.html' if b=='home' else '/brand/'+b+'.html','action':'redirect alias'})
def local(u):
 u=html.unescape(u.replace('\\/','/'));x=byurl.get(u) or byname.get(Path(urllib.parse.urlsplit(u).path).name)
 if not x or not x['file'].startswith('assets/'):issues.append({'kind':'unresolved_asset','url':u});return ''
 name=Path(x['file']).name;used[x['url']]=x
 shutil.copy2(ROOT/x['file'],UPLOAD/'images'/name)
 return '/web/upload/thewhot/images/'+name
def link(u):
 if u.startswith(('mailto:','tel:','#')):return u
 p=urllib.parse.urlsplit(urllib.parse.urljoin(BASE,u));k=p.path.strip('/')
 if p.hostname in ['www.thewhot.com','thewhot.com']:
  q=urllib.parse.parse_qs(p.query)
  if q.get('mode')==['policy']:return '/member/agreement.html'
  if q.get('mode')==['privacy']:return '/member/privacy.html'
  k=aliases.get(k,k)
  if k in labels:return '/index.html' if k=='home' else '/brand/'+k+'.html'
  if not k:return '/index.html'
  issues.append({'kind':'internal_link_review','url':u});return '/brand/CONTACT.html'
 return u if p.scheme in ['http','https'] else '#'
def img(u,alt='',extra=''):
 f=local(u)
 return f'<img src="{E(f)}" alt="{E(alt)}" loading="lazy" decoding="async" {extra}>' if f else ''
def serialize(n):
 if isinstance(n,str):return E(n)
 if n.tag in ['script','style','iframe','form','input','button','textarea','select']:return ''
 if n.tag=='img':return img(n.attrs.get('src',''),n.attrs.get('alt',''))
 content=''.join(serialize(c) for c in n.children)
 if n.tag not in ['p','div','span','strong','b','em','i','u','br','h1','h2','h3','h4','ul','ol','li','a','table','thead','tbody','tr','td','th']:return content
 attrs=''
 if n.tag=='a' and n.attrs.get('href'):attrs=' href="'+E(link(n.attrs['href']))+'"'
 style=n.attrs.get('style','');allow=[]
 for part in style.split(';'):
  if ':' in part and part.split(':')[0].strip() in ['text-align','font-weight','font-style','color']:allow.append(part)
 if allow:attrs+=' style="'+E(';'.join(allow))+'"'
 return '<'+n.tag+attrs+'>'+content+('' if n.tag=='br' else '</'+n.tag+'>')
def ancestor(n,pred):
 n=n.parent
 while n:
  if pred(n):return n
  n=n.parent
 return None
def getwidgets(t):return [n for n in t.root.walk() if 'data-widget-type' in n.attrs and not n.attrs['data-widget-type'].startswith('inline')]
def gallery(n,k,index):
 items=[];seen=set(); source=(ROOT/'source'/(k+'.html')).read_text(); parent=ancestor(n,lambda z:z.attrs.get('id','').startswith('w')); wid=parent.attrs.get('id','') if parent else ''; setting={}; match=re.search(r"gallery_"+re.escape(wid)+r"\.init\('[^']+',",source);
 if match:setting,_=json.JSONDecoder().raw_decode(source[match.end():])
 for x in n.walk():
  a=x.attrs;u=''
  if x.tag=='img' and 'trans_img' not in a.get('class',''):u=a.get('src','')
  elif 'img_wrap' in a.get('class',''):
   u=a.get('data-src','')
   if not u:
    m=re.search(r'url\(["\x27]?([^\)"\x27]+)',a.get('style',''));u=m.group(1) if m else ''
  if not u or u in seen:continue
  seen.add(u)
  par=ancestor(x,lambda z: 'item_container' in z.attrs.get('class','') or 'item_gallary' in z.attrs.get('class',''))
  title=' '.join(par.text().split()) if par else a.get('alt',''); title=' '.join(dict.fromkeys(title.split()))
  target=par.attrs.get('href','') if par else ''
  picture=img(u,title)
  if target and not target.startswith('javascript:'):picture='<a href="'+E(link(target))+'">'+picture+'</a>'
  else:picture='<a href="'+E(local(u))+'" target="_blank" rel="noopener">'+picture+'</a>'
  items.append('<figure>'+picture+('<figcaption>'+E(title)+'</figcaption>' if title else '')+'</figure>')
  if k in ['Year-Round','SpecialSeasonal']:
   productmap.append({'page':k,'position':len(items),'asset':local(u),'name':title,'cafe24_product_no':None,'price':None,'sale_enabled':False,'note':'상품명/가격/옵션/판매 자격 확정 후 관리자 상품 등록 및 번호 매핑'})
 return '<div class="whot-gallery" style="--whot-cols:'+str(setting.get('grid_col_count',3))+';--whot-mobile-cols:'+str(setting.get('grid_mobile_col_count',2))+'">'+''.join(items)+'</div>'
def form(n,k):
 fields=[]
 for x in n.walk():
  if x.tag in ['input','select','textarea'] and x.attrs.get('type')!='hidden':
   parent=ancestor(x,lambda z:'form-group' in z.attrs.get('class',''))
   label=next((' '.join(z.text().split()) for z in parent.walk() if z.tag=='label'),'') if parent else ''
   fields.append({'tag':x.tag,'type':x.attrs.get('type',''),'name':x.attrs.get('name',''),'label':label,'required':'required' in x.attrs,'options':[{'value':z.attrs.get('value',''),'label':' '.join(z.text().split())} for z in x.walk() if z.tag=='option']})
 configs.append({'page':k,'fields':fields,'status':'requires Cafe24 board/form integration; source POST endpoint not reused'})
 return '<aside class="whot-inquiry"><h2>제작 문의</h2><p>문의: <a href="mailto:thewhot0@gmail.com">thewhot0@gmail.com</a> · <a href="tel:0316331045">031.633.1045</a></p></aside><!-- MIGRATION: 원본 폼 항목은 reports/forms.json 참조. 카페24 문의 게시판 연결 전 제출 기능 없음. -->'
def hero(s,t):
 out=[]
 for n in t.root.walk():
  if 'visual_section' not in n.attrs.get('class','') or 'section_wrap' not in n.attrs.get('class',''):continue
  mode='mobile' if 'mobile_section' in n.attrs.get('class','') else 'desktop';cards=[]
  for a in n.walk():
   if a.tag=='a' and 'visual_link' in a.attrs.get('class',''):
    parent=a.parent
    while parent and not ('item' in parent.attrs.get('class','').split()):parent=parent.parent
    if not parent:continue
    u=''
    for x in parent.walk():
     m=re.search(r'url\(["\x27]?([^\)"\x27]+)',x.attrs.get('style',''))
     if m:u=m.group(1);break
    if u:cards.append('<a href="'+E(link(a.attrs.get('href','')))+'">'+img(u,labels.get(urllib.parse.urlsplit(a.attrs.get('href','')).path.strip('/'),'THE WHOT'))+'</a>')
  if cards:out.append('<div class="whot-hero whot-'+mode+'" aria-label="브랜드 소개 배너">'+''.join(cards)+'</div>')
 return ''.join(out)
# Curate board: preserve all records, only explicit brewery topic is staged for publication.
posts=[]
for p in pages:
 if 'bmode=view' not in p['url']:continue
 t=Tree((ROOT/p['source']).read_text());body=next((n for n in t.root.walk() if 'board_txt_area' in n.attrs.get('class','')),None)
 title=p['title'].split(' : 더홋')[0];included='[커스터마이징]' in title and '한살림' in title
 record={'source_url':p['url'],'key':p['key'],'title':title,'status':'brand_content' if included else 'excluded_pending_review','reason':'' if included else '브랜드와 무관한 광고성 내용으로 판단; 원본 보존, 공개 이전 제외'}
 posts.append(record)
 if included and body:
  b='<article class="whot-article"><h1>'+E(title)+'</h1>'+serialize(body)+'</article>'
  (SKIN/'brand/hansalim.html').write_text('<!--@layout(/layout/basic/layout.html)-->\n<!--@css(/css/whot-brand.css)-->\n<div class="whot-brand">'+b+'</div>')
  (ROOT/'content/hansalim-clean.html').write_text(b)
header='<header class="whot-preview-header"><a href="/index.html">'+img('https://cdn.imweb.me/thumbnail/20250417/88031c27c990e.png','THE WHOT')+'</a><nav>'
for group,keys in [('ABOUT',['BrandStory','OurProcess','thewhotBrewery']),('PRODUCT',['Year-Round','SpecialSeasonal','Pairing']),('PARTNERSHIP',['OurPartners','DesignbyUs','DesignYourOwn']),('NEWS',['Promotion','People'])]:
 header+='<details><summary>'+group+'</summary><div>'+''.join('<a href="/brand/'+k+'.html">'+E(labels[k])+'</a>' for k in keys)+'</div></details>'
header+='<a href="/brand/CONTACT.html">CONTACT</a></nav></header>'
footer='<footer class="whot-preview-footer"><p>(주)더홋브루어리농업회사법인 / 대표 김나래</p><p><a href="tel:0316331045">031.633.1045</a> · <a href="mailto:thewhot0@gmail.com">thewhot0@gmail.com</a></p><p>Copyright © 2026 THE WHOT BREWERY</p></footer>'
for k in labels:
 raw=(ROOT/'source'/(k+'.html')).read_text();t=Tree(raw);bits=[hero(raw,t)] if k=='home' else []
 for idx,n in enumerate(getwidgets(t)):
  typ=n.attrs['data-widget-type'];ns=list(n.walk());b=''
  if typ=='image':
   x=next((x for x in ns if x.tag=='img'),None)
   if x:b='<figure class="whot-image">'+img(x.attrs.get('src',''),x.attrs.get('alt') or labels[k]+' — '+str(idx+1))+'</figure>'
  elif typ=='gallery2':b=gallery(n,k,idx)
  elif typ=='text':b='<div class="whot-text">'+serialize(n)+'</div>'
  elif typ=='video':
   vid=next((x.attrs['data-vimeo-id'] for x in ns if x.attrs.get('data-vimeo-id')),None)
   if vid:b='<div class="whot-video"><iframe src="https://player.vimeo.com/video/'+E(vid)+'" title="THE WHOT 영상" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
  elif typ=='form':b=form(n,k)
  elif typ=='button':
   links=[x for x in ns if x.tag=='a']
   b='<div class="whot-buttons">'+''.join('<a href="'+E(link(x.attrs.get('href','')))+'">'+E(' '.join(x.text().split()))+'</a>' for x in links)+'</div>'
  elif typ=='sub_menu':b='<nav class="whot-subnav">'+''.join('<a href="/brand/'+x+'.html">'+E(labels[x])+'</a>' for x in ['OurPartners','DesignbyUs','DesignYourOwn'])+'</nav>'
  elif typ=='board':
   if k=='Promotion':b='<div class="whot-news"><h1>Promotion</h1>'+''.join('<a href="/brand/hansalim.html">'+E(p['title'])+'</a>' for p in posts if p['status']=='brand_content')+'</div>'
   else:b='<div class="whot-news"><h1>'+E(labels[k])+'</h1></div><!-- 공개 게시글 없음 / 카페24 게시판 연결 필요 -->'
  elif typ=='hr':b='<hr>'
  if b:bits.append(b)
 body='<div class="whot-brand" data-source-page="'+E(k)+'">'+''.join(bits)+'</div>'
 path=SKIN/'index.html' if k=='home' else SKIN/'brand'/(k+'.html')
 path.write_text('<!--@layout(/layout/basic/layout.html)-->\n<!--@css(/css/whot-brand.css)-->\n'+body)
 configs.append({'page':k,'widget_count':len(getwidgets(t)),'source_url':BASE+('' if k=='home' else k),'target':str(path.relative_to(SKIN))})
 (ROOT/'content'/(k+'.body.html')).write_text(body)
# Common CSS is scoped to content; preview-only chrome is isolated.
css='''
.whot-brand{width:100%;margin:0 auto;color:#111;font-family:Arial,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.65;background:#fff}.whot-brand *{box-sizing:border-box}.whot-brand img{display:block;max-width:100%;height:auto}.whot-brand figure{margin:0}.whot-brand a{color:inherit}.whot-brand .whot-image img{width:100%}.whot-brand .whot-gallery{display:grid;grid-template-columns:repeat(var(--whot-cols,3),minmax(0,1fr));gap:18px;max-width:1280px;padding:24px;margin:auto}.whot-brand .whot-gallery img{width:100%}.whot-brand figcaption{text-align:center;padding:10px}.whot-brand .whot-text,.whot-brand .whot-inquiry,.whot-brand .whot-news,.whot-brand .whot-article{max-width:1200px;margin:auto;padding:24px}.whot-brand .whot-article img{margin:12px auto}.whot-brand .whot-buttons,.whot-brand .whot-subnav{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;padding:24px}.whot-brand .whot-buttons a{padding:12px 24px;border:1px solid #222;text-decoration:none}.whot-brand .whot-video{position:relative;aspect-ratio:16/9;max-width:1280px;margin:auto}.whot-brand iframe{width:100%;height:100%;border:0}.whot-brand .whot-hero{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.whot-brand .whot-hero>a{flex:0 0 100%;scroll-snap-align:start}.whot-brand .whot-hero img{width:100%}.whot-brand .whot-mobile{display:none}.whot-brand hr{border:0;border-top:1px solid #eee}.whot-brand .whot-inquiry{background:#f6f6f6}.whot-brand .whot-news a{display:block;padding:16px 0;border-bottom:1px solid #ddd}@media(max-width:767px){.whot-brand .whot-gallery{grid-template-columns:repeat(var(--whot-mobile-cols,2),minmax(0,1fr));gap:10px;padding:12px}.whot-brand .whot-desktop{display:none}.whot-brand .whot-mobile{display:flex}.whot-brand .whot-text,.whot-brand .whot-inquiry{padding:18px}}
'''
(SKIN/'css/whot-brand.css').write_text(css)
(SKIN/'layout/basic/whot-navigation.html').write_text('<!-- 기존 layout.html의 메뉴 위치에서 @import로 연결할 메뉴 조각. 기존 헤더 전체를 덮어쓰지 마세요. -->\n'+header.replace('whot-preview-header','whot-brand-header'))
(SKIN/'layout/basic/whot-footer-content.html').write_text('<!-- 기존 스킨 푸터 안에 회사정보를 반영할 참고 조각 -->\n'+footer)
# Preview reproduces body with local assets, not Cafe24's runtime.
for p in SKIN.rglob('*.html'):
 if 'layout/' in str(p.relative_to(SKIN)):continue
 rel=p.relative_to(SKIN);dest=PRE/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 body=re.sub(r'<!--.*?-->','',p.read_text(),flags=re.S)
 dest.write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE WHOT · 이전 검토</title><link rel="stylesheet" href="/css/whot-brand.css"><link rel="stylesheet" href="/preview.css"></head><body>'+header+'<main>'+body+'</main>'+footer+'</body></html>')
(PRE/'css').mkdir(exist_ok=True);shutil.copy2(SKIN/'css/whot-brand.css',PRE/'css/whot-brand.css')
(PRE/'preview.css').write_text('body{margin:0;font-family:Arial,"Apple SD Gothic Neo",sans-serif}.whot-preview-header{display:flex;justify-content:space-between;align-items:center;padding:24px 5%;background:#fff;border-bottom:1px solid #eee;gap:20px}.whot-preview-header img{width:121px}.whot-preview-header nav{display:flex;gap:26px;align-items:center}.whot-preview-header a{color:#111;text-decoration:none}.whot-preview-header details{position:relative}.whot-preview-header summary{cursor:pointer}.whot-preview-header details div{position:absolute;z-index:3;background:#fff;padding:20px;min-width:180px;box-shadow:0 5px 20px #0002}.whot-preview-header details a{display:block;padding:8px}.whot-preview-footer{padding:40px 5%;font-size:13px;color:#444;border-top:1px solid #ddd}.whot-preview-footer a{color:inherit}@media(max-width:767px){.whot-preview-header{flex-direction:column;padding:20px 12px}.whot-preview-header nav{gap:12px;flex-wrap:wrap;font-size:11px;justify-content:center}.whot-preview-header details div{left:-30px}}')
# Keep previews self-contained without multiplying archive size using symlink, excluded from upload archive.
(PRE/'web').mkdir(exist_ok=True);(PRE/'web/upload').mkdir(exist_ok=True)
sy=PRE/'web/upload/thewhot'
if not sy.exists():sy.symlink_to(UPLOAD.resolve(),target_is_directory=True)
for name,data in [('route-map',routing),('forms',[c for c in configs if 'fields'in c]),('page-conversion',[c for c in configs if 'target'in c]),('product-mapping-draft',productmap),('board-review',posts),('conversion-issues',issues),('upload-assets',list(used.values()))]:
 (ROOT/'reports'/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
# Remove only stale artifacts created by the earlier interrupted collection.
keys={p['key'] for p in pages}
for d in ['source','content']:
 for p in (ROOT/d).glob('Promotion__*'):
  if p.name.split('.')[0] not in keys:p.unlink()
print('GENERATED',len(labels),'pages;',len(used),'upload assets;',len(posts),'posts;',len(productmap),'product images; issues',len(issues))
