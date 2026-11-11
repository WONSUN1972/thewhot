import {NextRequest,NextResponse} from 'next/server';
import {medusa,pool,ApiError,session,login,digest,catalog,orderView} from '@/lib/medusa';
import {registrationDetails} from '@/lib/registration';
import {validateCart,shipping} from '@/lib/domain';
export const runtime='nodejs';
const json=NextResponse.json;
function failure(e:unknown){console.error(e instanceof Error?e.message:'API failure');return json({error:e instanceof ApiError?e.message:'서비스 요청을 처리하지 못했습니다.'},{status:e instanceof ApiError?e.status:503})}
export async function GET(req:NextRequest){try{
 const path=req.nextUrl.pathname;
 if(path==='/api/health'){await pool.query('SELECT 1');await fetch((process.env.MEDUSA_BACKEND_URL||'http://127.0.0.1:9000')+'/health',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error('Medusa unhealthy')});return json({ok:true,backend:'medusa',mode:'goods-demo',externalIntegrations:false})}
 if(path==='/api/products')return json((await catalog()).products);
 const me=await session(req);if(path==='/api/me')return json({user:me?.user||null});if(!me)throw new ApiError('로그인해 주세요.',401);
 if(path==='/api/orders'){if(me.role==='admin')return json([]);const {orders}=await medusa('/store/orders?limit=100&fields=*items,metadata,total,shipping_total,created_at',undefined,me.bearer);return json(orders.filter((o:any)=>o.metadata?.goods_demo===true).map(orderView))}
 if(path==='/api/admin'){if(me.role!=='admin')throw new ApiError('관리자 권한이 필요합니다.',403);
 const [p,o,c,a]=await Promise.all([catalog(),medusa('/admin/orders?limit=100&fields=*items,*customer,metadata,total,shipping_total,created_at,email',undefined,me.bearer),medusa('/admin/customers?limit=100',undefined,me.bearer),pool.query('SELECT * FROM whot_audit ORDER BY id DESC LIMIT 20')]);
 return json({products:p.products,orders:o.orders.filter((o:any)=>o.metadata?.goods_demo===true).map(orderView),members:c.customers.map((c:any)=>({id:c.id,name:c.first_name,email:c.email,role:'customer'})),audit:a.rows})}
 throw new ApiError('찾을 수 없습니다.',404)
 }catch(e){return failure(e)}}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==process.env.APP_ORIGIN) return json({error:'허용되지 않은 요청입니다.'},{status:403});
 try{
 const raw=await req.text();if(raw.length>16000)throw new ApiError('입력 크기를 확인해 주세요.');let body:any;try{body=JSON.parse(raw||'{}')}catch{throw new ApiError('입력 형식을 확인해 주세요.')}
 const path=req.nextUrl.pathname;
 if(['/api/register','/api/login','/api/admin/login'].includes(path)){
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||''),name=String(body.name||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<1||password.length>128)throw new ApiError('이메일과 비밀번호를 확인해 주세요.');
  const role=path==='/api/admin/login'?'admin':'customer',actor=role==='admin'?'user':'customer';
  if(path==='/api/register'){
   if(name.length<1||name.length>40||password.length<10||email.endsWith('@local.invalid'))throw new ApiError('이름과 10자 이상의 비밀번호를 확인해 주세요.');
   let details;try{details=registrationDetails(body)}catch(e){throw new ApiError((e as Error).message)}
   const {token}=await medusa('/auth/customer/emailpass/register',{email,password});
   await medusa('/store/customers',{email,first_name:details.name,phone:details.phone,metadata:details.metadata},token);
  }
  const {token}=await medusa('/auth/'+actor+'/emailpass',{email,password});return login(token,role)
 }
 if(path==='/api/logout'){await pool.query('DELETE FROM whot_sessions WHERE token_hash=$1',[digest(req.cookies.get('whot-session')?.value||'')]);const r=json({ok:true});r.cookies.delete('whot-session');return r}
 const me=await session(req);if(!me)throw new ApiError('로그인해 주세요.',401);
 if(path==='/api/orders'){
  if(me.role!=='customer')throw new ApiError('고객 계정으로 시연해 주세요.',403);
  let cart;try{cart=validateCart(body.items)}catch(e){throw new ApiError((e as Error).message)}
  const key=String(body.key||'');if(!/^[a-zA-Z0-9-]{10,80}$/.test(key))throw new ApiError('주문 확인 키가 필요합니다.');
  const fingerprint=digest(JSON.stringify([...cart].sort((a,b)=>a.id.localeCompare(b.id))));
  const client=await pool.connect();try{
   await client.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[me.user.id+key]);
   await client.query('INSERT INTO whot_demo_requests(customer_id,request_key,fingerprint) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[me.user.id,key,fingerprint]);
   const record=(await client.query('SELECT * FROM whot_demo_requests WHERE customer_id=$1 AND request_key=$2',[me.user.id,key])).rows[0];
   if(record.fingerprint!==fingerprint)throw new ApiError('같은 요청 키의 상품을 변경할 수 없습니다.',409);
   if(record.order_id)return json(orderView((await medusa('/store/orders/'+record.order_id,undefined,me.bearer)).order));
   let cartId=record.cart_id;
   if(!cartId){
    const {products,region}=await catalog();const items=cart.map(i=>{const p=products.find((p:any)=>p.id===i.id);if(!p||p.stock<i.quantity)throw new ApiError('상품 재고가 부족하거나 지원하지 않는 상품입니다.');return {variant_id:p.variant_id,quantity:i.quantity}});
    const {cart:created}=await medusa('/store/carts',{region_id:region.id,email:me.user.email,items,shipping_address:{first_name:'시연',last_name:'배송없음',address_1:'Simulation only',city:'Local',country_code:'kr',postal_code:'00000'},metadata:{goods_demo:true,demo_status:'DEMO_RECEIVED'}},me.bearer);
    cartId=created.id;await client.query('UPDATE whot_demo_requests SET cart_id=$1 WHERE customer_id=$2 AND request_key=$3',[cartId,me.user.id,key]);
   }
   const {cart:current}=await medusa('/store/carts/'+cartId,undefined,me.bearer);
   if(!current.shipping_methods?.length){const {shipping_options}=await medusa('/store/shipping-options?cart_id='+cartId,undefined,me.bearer);if(!shipping_options.length)throw new ApiError('시연 배송 설정을 확인해 주세요.',503);await medusa('/store/carts/'+cartId+'/shipping-methods',{option_id:shipping_options[0].id},me.bearer)}
   const {payment_collection}=await medusa('/store/payment-collections',{cart_id:cartId},me.bearer);
   if(!payment_collection.payment_sessions?.length)await medusa('/store/payment-collections/'+payment_collection.id+'/payment-sessions',{provider_id:'pp_system_default',data:{simulation:true}},me.bearer);
   const result=await medusa('/store/carts/'+cartId+'/complete',{},me.bearer);if(result.type!=='order')throw new ApiError('시연 주문을 완료하지 못했습니다.',409);
   await client.query('UPDATE whot_demo_requests SET order_id=$1 WHERE customer_id=$2 AND request_key=$3',[result.order.id,me.user.id,key]);return json(orderView(result.order));
  }finally{await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[me.user.id+key]);client.release()}
 }
 if(path.startsWith('/api/admin/')){
  if(me.role!=='admin')throw new ApiError('관리자 권한이 필요합니다.',403);
  if(path==='/api/admin/product'){
   if(!Number.isInteger(body.price)||body.price<0||body.price>1000000||!Number.isInteger(body.stock)||body.stock<0||body.stock>10000)throw new ApiError('가격과 재고를 확인해 주세요.');
   const p=(await catalog()).products.find((p:any)=>p.id===body.id);if(!p)throw new ApiError('샘플 상품을 찾을 수 없습니다.');
   const {inventory_items}=await medusa('/admin/inventory-items?sku='+encodeURIComponent('WHOT-DEMO-'+p.id.toUpperCase()),undefined,me.bearer);const item=inventory_items[0],level=item?.location_levels?.[0];if(!level)throw new ApiError('재고 위치를 확인해 주세요.',503);
   await medusa('/admin/products/'+p.medusa_id+'/variants/'+p.variant_id,{prices:[{currency_code:'krw',amount:body.price}]},me.bearer);
   await medusa('/admin/inventory-items/'+item.id+'/location-levels/'+level.location_id,{stocked_quantity:body.stock+Number(level.reserved_quantity)},me.bearer);
   await pool.query('INSERT INTO whot_audit(action) VALUES($1)',[p.name+' 샘플 가격·가용 재고 수정']);return json({ok:true});
  }
  if(path==='/api/admin/order'){
   if(!['DEMO_RECEIVED','DEMO_PACKING','DEMO_DONE'].includes(body.status))throw new ApiError('지원하지 않는 상태입니다.');
   if(typeof body.id!=='string'||!/^order_[a-zA-Z0-9]+$/.test(body.id))throw new ApiError('주문을 확인해 주세요.');
   const {order}=await medusa('/admin/orders/'+body.id,undefined,me.bearer);if(order.metadata?.goods_demo!==true)throw new ApiError('시연 주문만 수정할 수 있습니다.',403);
   await medusa('/admin/orders/'+body.id,{metadata:{...order.metadata,demo_status:body.status}},me.bearer);await pool.query('INSERT INTO whot_audit(action) VALUES($1)',[body.id+' 시연 상태 변경: '+body.status]);return json({ok:true});
  }
 }
 throw new ApiError('찾을 수 없습니다.',404);
 }catch(e){return failure(e)}
}
