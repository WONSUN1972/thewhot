import fs from 'node:fs';import assert from 'node:assert/strict';
const pages=JSON.parse(fs.readFileSync('src/content/brand-pages.json','utf8'));
const failures=[];let images=0,links=0;
for(const [slug,page] of Object.entries(pages)){
 for(const m of page.html.matchAll(/src="(\/[^"]+)"/g)){images++;if(!fs.existsSync('public'+m[1]))failures.push(slug+': missing '+m[1])}
 for(const m of page.html.matchAll(/href="(\/brand\/[^"#?]+)"/g)){links++;if(!pages[m[1].split('/').pop()])failures.push(slug+': broken '+m[1])}
 if(/undefined|\[object Object\]|localhost:877|file:\/\/|<script/i.test(page.html))failures.push(slug+': invalid embedded content');
}
assert.equal(Object.keys(pages).length,18);assert.ok(pages.Brewmaster);assert.ok(fs.existsSync('public/wordmark.png'));
const ui=fs.readFileSync('src/app/page.tsx','utf8');assert.ok(!ui.includes("api('demo-admin'"));assert.ok(ui.includes('시연 주문'));assert.ok(ui.includes('실제 결제·배송은 발생하지 않습니다.'));
assert.deepEqual(failures,[]);console.log(JSON.stringify({pages:18,imageReferences:images,internalLinks:links,failures,scope:'Retained archive text and local assets. Embedded image copy preserved; current remote Imweb equality not asserted.'},null,2));
