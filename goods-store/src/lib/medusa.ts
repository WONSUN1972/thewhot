import {Pool} from 'pg';
import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
const globalDb=globalThis as unknown as {medusaAdapterPool?:Pool};
export const pool=globalDb.medusaAdapterPool??=new Pool({connectionString:process.env.DATABASE_URL,max:8});
export class ApiError extends Error {constructor(message:string,public status=400){super(message)}}
export async function medusa(path:string,body?:unknown,bearer?:string){
 const r=await fetch((process.env.MEDUSA_BACKEND_URL||'http://127.0.0.1:9000')+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(path.startsWith('/store/')?{'x-publishable-api-key':process.env.MEDUSA_PUBLISHABLE_KEY||''}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(30000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new ApiError(r.status>=500?'상품 서비스 연결을 확인해 주세요.':r.status===401?'이메일 또는 비밀번호를 확인해 주세요.':data.message||'요청을 확인해 주세요.',r.status);
 return data;
}
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function session(req:NextRequest){
 const token=req.cookies.get('whot-session')?.value;if(!token)return null;
 const s=(await pool.query('SELECT bearer,role FROM whot_sessions WHERE token_hash=$1 AND expires_at>now()',[digest(token)])).rows[0];if(!s)return null;
 try{const data=await medusa(s.role==='admin'?'/admin/users/me':'/store/customers/me',undefined,s.bearer);const u=data.user||data.customer;return {...s,user:{id:u.id,email:u.email,name:u.first_name||u.email,role:s.role}}}catch(e){if(e instanceof ApiError&&e.status===401)return null;throw e}
}
export async function login(bearer:string,role:string){const id=randomBytes(32).toString('hex');await pool.query('INSERT INTO whot_sessions(token_hash,bearer,role) VALUES($1,$2,$3)',[digest(id),bearer,role]);const r=NextResponse.json({ok:true});r.cookies.set('whot-session',id,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',path:'/',maxAge:28800});return r}
export async function catalog(){
 const {regions}=await medusa('/store/regions');const region=regions.find((r:any)=>r.currency_code==='krw');if(!region)throw new ApiError('시연 지역 설정을 확인해 주세요.',503);
 const q=new URLSearchParams({region_id:region.id,fields:'+metadata,+variants.calculated_price,+variants.inventory_quantity',limit:'100'});
 const {products}=await medusa('/store/products?'+q);
 return {region,products:products.filter((p:any)=>p.metadata?.goods_demo===true&&['glass','tee','mug','tote'].includes(p.handle)).map((p:any)=>({id:p.handle,medusa_id:p.id,variant_id:p.variants[0].id,name:p.title,category:p.metadata.category,price:p.variants[0].calculated_price?.calculated_amount,stock:p.variants[0].inventory_quantity,description:p.description,variant:p.variants[0].title,image:p.metadata.image}))};
}
export function orderView(o:any){return {id:o.id,total:o.total,shipping:o.shipping_total,status:o.metadata?.demo_status||'DEMO_RECEIVED',created_at:o.created_at,name:o.customer?.first_name||o.email,items:(o.items||[]).map((i:any)=>({name:i.product_title||i.title,quantity:i.quantity,price:i.unit_price}))}}
