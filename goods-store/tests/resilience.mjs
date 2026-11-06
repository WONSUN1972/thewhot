import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8791';let cookie='';
async function call(path,body,override){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:override??cookie},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()}}
const products=(await call('products')).data,original=products.find(p=>p.id==='mug');
assert.equal((await call('register',{email:`qa-concurrent-${Date.now()}@example.test`,name:'Concurrency QA',password:randomUUID()})).status,200);const customer=cookie;
assert.equal((await call('admin/login',{email:process.env.BOOTSTRAP_ADMIN_EMAIL,password:process.env.BOOTSTRAP_ADMIN_PASSWORD})).status,200);const admin=cookie;
try{
 assert.equal((await call('admin/product',{id:'mug',price:original.price,stock:1})).status,200);
 const requests=await Promise.all([1,2].map(()=>call('orders',{items:[{id:'mug',quantity:1}],key:randomUUID()},customer)));
 assert.equal(requests.filter(r=>r.status===200).length,1,'only one order can reserve final item');
 assert.equal((await call('products')).data.find(p=>p.id==='mug').stock,0,'stock does not go below zero');
 console.log('PASS concurrent final-stock reservation; exactly one order accepted');
 const r=await call('orders',undefined,customer);assert.equal(r.data.length,1);console.log('PASS failed concurrent order not exposed as saved order');
}finally{cookie=admin;assert.equal((await call('admin/product',{id:'mug',price:original.price,stock:original.stock})).status,200);await call('logout',{});}
