import {timingSafeEqual} from 'node:crypto';
export function validOAuthState(value: string | null, cookie: string | undefined) {
  return !!value && !!cookie && /^[a-f0-9]{64}$/.test(value) && /^[a-f0-9]{64}$/.test(cookie) && timingSafeEqual(Buffer.from(value),Buffer.from(cookie));
}
export function kakaoLocation(location: string, origin: string) {
  const url = new URL(location);
  if(url.origin!=='https://kauth.kakao.com' || url.pathname!=='/oauth/authorize' || url.searchParams.get('redirect_uri')!==origin+'/api/auth/social/kakao/callback' || !/^[a-f0-9]{64}$/.test(url.searchParams.get('state')||'')) throw Error('Invalid authorization redirect');
  return url;
}
