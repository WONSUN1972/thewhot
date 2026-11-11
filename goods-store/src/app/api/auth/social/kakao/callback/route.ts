import {NextRequest,NextResponse} from 'next/server';
import {medusa,pool,digest,login,ApiError} from '@/lib/medusa';
import {validOAuthState} from '@/lib/kakao';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const origin=process.env.APP_ORIGIN!;
 function finish(error?:string){
  const r=NextResponse.redirect(new URL(error?'/?social_error='+error+'#account':'/#account',origin),303);
  r.cookies.set('whot-kakao-state','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/social/kakao',maxAge:0});
  r.headers.set('Cache-Control','no-store');r.headers.set('Referrer-Policy','no-referrer');return r;
 }
 if(process.env.KAKAO_ENABLED!=='true')return finish('unavailable');
 const state=req.nextUrl.searchParams.get('state');
 if(!validOAuthState(state,req.cookies.get('whot-kakao-state')?.value))return finish('expired');
 try{
  const consumed=await pool.query('DELETE FROM whot_oauth_attempts WHERE state_hash=$1 AND expires_at>now() RETURNING state_hash',[digest(state!)]);
  if(!consumed.rowCount)return finish('expired');
  if(req.nextUrl.searchParams.has('error'))return finish('cancelled');
  const code=req.nextUrl.searchParams.get('code');if(!code || code.length>2048)return finish('expired');
  let token:string;
  try{({token}=await medusa('/auth/customer/kakao/callback?'+new URLSearchParams({code,state:state!})))}catch(e){return finish(e instanceof ApiError&&e.code==='KAKAO_EMAIL_REQUIRED'?'email':'unavailable')}
  // Token received only from the trusted private Medusa backend, never from the browser.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if(claims.actor_type!=='customer' || !claims.auth_identity_id)return finish('unavailable');
  if(!claims.actor_id){
   const email=claims.user_metadata?.email,name=claims.user_metadata?.name;
   if(typeof email!=='string')return finish('email');
   try{await medusa('/store/customers',{email,first_name:typeof name==='string'?name:'카카오 회원'},token)}catch{return finish('account')}
   ({token}=await medusa('/auth/token/refresh',{},token));
  }
  await medusa('/store/customers/me',undefined,token);
  const session=await login(token,'customer'),result=finish();
  for(const cookie of session.cookies.getAll())result.cookies.set(cookie);
  return result;
 }catch{return finish('unavailable')}
}
