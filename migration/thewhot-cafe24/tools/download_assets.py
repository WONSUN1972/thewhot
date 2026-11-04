import json,urllib.request,urllib.parse,concurrent.futures,hashlib,re,time
from pathlib import Path
R=Path(__file__).resolve().parent.parent
a=json.loads((R/'reports/asset-queue.json').read_text()); old={x['url']:x for x in json.loads((R/'reports/assets.json').read_text())} if (R/'reports/assets.json').exists() else {}
def one(x):
 u=x['url'];
 if u in old and old[u]['status']=='downloaded':return old[u]
 p=urllib.parse.urlsplit(u);suffix=Path(p.path).suffix.lower()
 if suffix in ['.js','.mjs'] or not suffix:return dict(x,status='reference_only',reason='platform runtime not migrated')
 name=hashlib.sha256(u.encode()).hexdigest()[:12]+'_'+re.sub(r'[^A-Za-z0-9._-]','_',Path(p.path).name)
 folder='assets' if suffix in ['.png','.jpg','.jpeg','.gif','.svg','.webp','.ico','.pdf','.mp4'] else 'source/styles'
 dest=R/folder/name;dest.parent.mkdir(parents=True,exist_ok=True)
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.thewhot.com/'})
  with urllib.request.urlopen(req,timeout=45) as r:b=r.read();ct=r.headers.get('Content-Type','')
  dest.write_bytes(b)
  return dict(x,status='downloaded',file=str(dest.relative_to(R)),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),content_type=ct)
 except Exception as e:return dict(x,status='failed',reason=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
 out=[]
 for i,x in enumerate(ex.map(one,a)):
  out.append(x)
  if i%30==0:print('ASSETS',i,'/',len(a),flush=True)
(R/'reports/assets.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('DONE',len([x for x in out if x['status']=='downloaded']),'downloaded',len([x for x in out if x['status']=='failed']),'failed',flush=True)
