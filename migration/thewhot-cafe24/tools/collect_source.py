import urllib.request,urllib.parse,urllib.error,re,json,hashlib,time,concurrent.futures,html
from pathlib import Path
from html.parser import HTMLParser
BASE='https://www.thewhot.com/'
ROOT=Path(__file__).resolve().parent.parent
class Node:
 def __init__(self,tag='',attrs=(),parent=None):self.tag=tag;self.attrs=dict(attrs);self.children=[];self.parent=parent
 def text(self):
  if self.tag in ('script','style','noscript'):return ''
  return ' '.join(x.text() if isinstance(x,Node) else x for x in self.children)
 def walk(self):
  yield self
  for x in self.children:
   if isinstance(x,Node):yield from x.walk()
class Tree(HTMLParser):
 def __init__(self,s):super().__init__(convert_charrefs=True);self.root=Node();self.cur=self.root;self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a,self.cur);self.cur.children.append(n)
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.cur=n
 def handle_endtag(self,t):
  n=self.cur
  while n.parent:
   if n.tag==t:self.cur=n.parent;return
   n=n.parent
 def handle_data(self,s):self.cur.children.append(s)
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; TheWhotMigrationArchive/1.0)','Accept-Language':'ko,en;q=0.8'})
 for i in range(3):
  try:
   with urllib.request.urlopen(req,timeout=35) as r:return r.read(),r.status,r.headers.get('Content-Type',''),r.url
  except Exception as e:
   if i==2:return None,0,str(e),url
   time.sleep(.6)
def norm(u,base=BASE):
 u=html.unescape(u.replace('\\/','/')).strip(); v=urllib.parse.urlsplit(urllib.parse.urljoin(base,u)); q=urllib.parse.parse_qsl(v.query); q=[(k,x) for k,x in q if k not in ['back_url','q','sort','t']]; return urllib.parse.urlunsplit((v.scheme,v.netloc,v.path,urllib.parse.urlencode(sorted(q)),''))
def pageok(u):
 p=urllib.parse.urlsplit(u)
 if p.hostname not in ['www.thewhot.com','thewhot.com']:return False
 if re.search(r'logout|login|join|cart|order|search|ajax|\.cm|/common/|/css/|/_/',p.path,re.I):return False
 if re.search(r'\.(?:png|jpe?g|webp|gif|svg|pdf|zip|mp4|css|js|ico)$',p.path,re.I):return False
 q=urllib.parse.parse_qs(p.query)
 if any(k not in ['mode','bmode','idx','board','page','category','category2','back_url','t','q','sort'] for k in q):return False
 if 'mode' in q and q['mode'][0] not in ['policy','privacy']:return False
 if 'bmode' in q and q['bmode'][0] not in ['view','list']:return False
 return True
pages={}; failures=[];assets={};external=set();queue=[BASE,BASE+'?mode=policy',BASE+'?mode=privacy'];seen=set()
for fn in ['robots.txt','sitemap.xml']:
 b,st,ct,final=fetch(BASE+fn)
 if b:
  (ROOT/'source'/fn).write_bytes(b)
  if fn=='sitemap.xml':queue += [html.unescape(x) for x in re.findall(r'<loc>(.*?)</loc>',b.decode('utf-8','replace')) if pageok(html.unescape(x))]
while queue and len(pages)<180:
 batch=[]
 while queue and len(batch)<4:
  u=norm(queue.pop(0))
  if u in seen or not pageok(u):continue
  seen.add(u);batch.append(u)
 if not batch:continue
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(fetch,batch))
 for u,(b,st,ct,final) in zip(batch,results):
  if not b or 'html' not in ct:failures.append({'url':u,'status':st,'reason':ct});continue
  s=b.decode('utf-8','replace');tree=Tree(s);nodes=list(tree.root.walk())
  key=(urllib.parse.urlsplit(u).path.strip('/').replace('/','_') or 'home')+ ('__'+hashlib.sha256(u.encode()).hexdigest()[:10] if '?' in u else '')
  key=re.sub(r'[^\w.-]','_',key)
  (ROOT/'source'/(key+'.html')).write_text(s)
  links=[];widgets=[];forms=[];texts=[];refs=set();styles=[]
  for n in nodes:
   a=n.attrs
   if n.tag=='a' and a.get('href'):
    v=norm(a['href'],u)
    if v.startswith(('http:','https:')):
     links.append({'url':v,'label':' '.join(n.text().split())})
     if pageok(v) and v not in seen:queue.append(v)
     elif urllib.parse.urlsplit(v).hostname not in ['www.thewhot.com','thewhot.com']:external.add(v)
   if 'data-widget-type' in a:widgets.append({'type':a['data-widget-type'],'name':a.get('data-widget-name',''),'text':' '.join(n.text().split()),'attributes':a})
   if n.tag in ['h1','h2','h3','h4','h5','h6','p','li']:
    t=' '.join(n.text().split())
    if t and t not in texts:texts.append(t)
   if n.tag=='form':forms.append({'attributes':a,'fields':[x.attrs for x in n.walk() if x.tag in ['input','textarea','select','button']]})
   if n.tag=='style':styles.append(''.join(x for x in n.children if isinstance(x,str)))
   if n.tag in ['img','video','source','iframe','embed','audio']:
    for k in ['src','data-src','data-original','poster','data-lazy-src']:
     if a.get(k):refs.add(norm(a[k],u))
   if n.tag=='link' and a.get('href') and any(x in a.get('rel','') for x in ['stylesheet','icon']):refs.add(norm(a['href'],u))
  raw=html.unescape(s.replace('\\/','/'))
  for x in re.findall(r'https?://[^\s<>"\x27\\)]+',raw):
   x=x.rstrip(';},]')
   p=urllib.parse.urlsplit(x)
   if p.hostname and ('imweb.me' in p.hostname or re.search(r'\.(png|jpe?g|gif|svg|webp|mp4|pdf|woff2?|ttf)(?:\?|$)',x,re.I)):refs.add(x)
   if p.hostname and any(v in p.hostname for v in ['youtube','youtu.be','vimeo']):external.add(x)
  for x in re.findall(r'url\(\s*["\x27]?([^\)"\x27]+)',raw):refs.add(norm(x,u))
  title=next((' '.join(n.text().split()) for n in nodes if n.tag=='title'),key)
  rec={'key':key,'url':u,'final_url':final,'title':title,'bytes':len(b),'source':'source/'+key+'.html','widgets':widgets,'text_blocks':texts,'links':links,'forms':forms,'assets':sorted(refs)}
  pages[u]=rec
  (ROOT/'content'/(key+'.json')).write_text(json.dumps(rec,ensure_ascii=False,indent=2))
  (ROOT/'content'/(key+'.txt')).write_text(title+'\n'+u+'\n\n'+'\n\n'.join(texts))
  (ROOT/'source'/(key+'.inline.css')).write_text('\n\n'.join(styles))
  for x in refs:
   if x.startswith(('http://','https://')):
    p=urllib.parse.urlsplit(x)
    if p.hostname and (p.hostname.endswith('imweb.me') or p.hostname in ['www.thewhot.com','thewhot.com']):assets.setdefault(x,{'url':x,'pages':[]})['pages'].append(key)
    else:external.add(x)
  print('PAGE',key,len(refs),len(widgets),flush=True)
(ROOT/'reports'/'pages.json').write_text(json.dumps(list(pages.values()),ensure_ascii=False,indent=2))
(ROOT/'reports'/'asset-queue.json').write_text(json.dumps(list(assets.values()),ensure_ascii=False,indent=2))
(ROOT/'reports'/'external-links.json').write_text(json.dumps(sorted(external),ensure_ascii=False,indent=2))
(ROOT/'reports'/'collection-issues.json').write_text(json.dumps({'failures':failures,'unvisited_queue':sorted(set(queue)-seen),'visited_count':len(seen)},ensure_ascii=False,indent=2))
print('DONE',len(pages),'pages',len(assets),'assets',len(failures),'failures',flush=True)
