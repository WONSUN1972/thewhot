import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base=process.env.TEST_BACKEND_URL||'http://127.0.0.1:9001';
const res=await fetch(base+'/auth/user/emailpass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.BOOTSTRAP_ADMIN_EMAIL,password:process.env.BOOTSTRAP_ADMIN_PASSWORD})});
assert.equal(res.status,200,'admin authentication');
const {token}=await res.json();const headers={Authorization:`Bearer ${token}`};
const data=fs.readFileSync(process.env.TEST_IMAGE_PATH||'../goods-store/public/logo.png');
const form=new FormData();form.append('files',new Blob([data],{type:'image/png'}),'upload-regression.png');
const upload=await fetch(base+'/admin/uploads',{method:'POST',headers,body:form});assert.equal(upload.status,200,'image upload');
const {files}=await upload.json();assert.equal(files.length,1);const file=files[0];
assert.equal(new URL(file.url).origin,base,'public URL uses browser backend port');
const image=await fetch(file.url);assert.equal(image.status,200,'uploaded image publicly readable');
const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(Buffer.from(await image.arrayBuffer())),hash(data),'image bytes preserved');
if(process.env.TEST_KEEP_FILE==='true')fs.writeFileSync('/private/tmp/thewhot-upload-proof.json',JSON.stringify({id:file.id,url:file.url,sha256:hash(data)}));
else {const removed=await fetch(base+'/admin/uploads/'+encodeURIComponent(file.id),{method:'DELETE',headers});assert.equal(removed.status,200,'test upload cleanup');}
console.log('PASS authenticated upload, public URL and exact image bytes');
