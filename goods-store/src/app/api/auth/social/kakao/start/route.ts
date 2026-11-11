import {NextRequest,NextResponse} from 'next/server';
import {medusa,pool,digest} from '@/lib/medusa';
import {kakaoLocation} from '@/lib/kakao';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const origin=process.env.APP_ORIGIN!;
 if(req.headers.get('origin')!==origin)return NextResponse.json({error:'허용되지 않은 요청입니다.'},{status:403});
 if(process.env.KAKAO_ENABLED!=='true')return NextResponse.redirect(new URL('/?social_error=unavailable#account',origin),303);
 try{
  const {location}=await medusa('/auth/customer/kakao',{});
  const url=kakaoLocation(location,origin),state=url.searchParams.get('state')!;
  await pool.query('DELETE FROM whot_oauth_attempts WHERE expires_at<now()');
  await pool.query('INSERT INTO whot_oauth_attempts(state_hash) VALUES($1)',[digest(state)]);
  const response=NextResponse.redirect(url,303);
  response.headers.set('Cache-Control','no-store');
  response.cookies.set('whot-kakao-state',state,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/social/kakao',maxAge:600});
  return response;
 }catch{return NextResponse.redirect(new URL('/?social_error=unavailable#account',origin),303)}
}
