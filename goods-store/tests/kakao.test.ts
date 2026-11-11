import {describe,it,expect,vi,beforeEach} from 'vitest';
import {validOAuthState,kakaoLocation} from '../src/lib/kakao';
describe('OAuth boundaries',()=>{
 it('requires exact browser state',()=>{expect(validOAuthState('a'.repeat(64),'a'.repeat(64))).toBe(true);expect(validOAuthState('a'.repeat(64),'b'.repeat(64))).toBe(false);expect(validOAuthState(null,undefined)).toBe(false);expect(validOAuthState('x','x')).toBe(false)});
 it('rejects foreign authorize endpoint',()=>expect(()=>kakaoLocation('https://evil.test','https://new.thewhot.com')).toThrow());
 it('rejects alternate callback',()=>expect(()=>kakaoLocation('https://kauth.kakao.com/oauth/authorize?redirect_uri=https://evil.test&state='+ 'a'.repeat(64),'https://new.thewhot.com')).toThrow());
});
const mocks=vi.hoisted(()=>({medusa:vi.fn(),query:vi.fn(),login:vi.fn()}));
vi.mock('../src/lib/medusa',()=>({medusa:mocks.medusa,pool:{query:mocks.query},digest:(s:string)=>s,login:mocks.login,ApiError:class extends Error{}}));
import {NextRequest,NextResponse} from 'next/server';
import {GET} from '../src/app/api/auth/social/kakao/callback/route';
describe('Kakao callback integration with mocked backend',()=>{
 beforeEach(()=>{vi.resetAllMocks();process.env.APP_ORIGIN='https://new.thewhot.com';process.env.KAKAO_ENABLED='true'});
 const request=()=>new NextRequest('https://new.thewhot.com/api/auth/social/kakao/callback?code=test&state='+'a'.repeat(64),{headers:{cookie:'whot-kakao-state='+'a'.repeat(64)}});
 it('rejects replay before token exchange',async()=>{mocks.query.mockResolvedValue({rowCount:0});const r=await GET(request());expect(r.headers.get('location')).toContain('expired');expect(mocks.medusa).not.toHaveBeenCalled()});
 it('creates a customer and exchanges a session without leaking bearer',async()=>{
  mocks.query.mockResolvedValue({rowCount:1});const token='x.'+Buffer.from(JSON.stringify({actor_type:'customer',auth_identity_id:'auth_test',user_metadata:{email:'test@example.com'}})).toString('base64url')+'.x';
  mocks.medusa.mockResolvedValueOnce({token}).mockResolvedValueOnce({customer:{id:'cus_test'}}).mockResolvedValueOnce({token:'refreshed'}).mockResolvedValueOnce({customer:{id:'cus_test'}});
  const session=NextResponse.json({ok:true});session.cookies.set('whot-session','opaque',{secure:true,httpOnly:true});mocks.login.mockResolvedValue(session);
  const r=await GET(request());expect(r.status).toBe(303);expect(r.headers.get('location')).toBe('https://new.thewhot.com/#account');expect(mocks.login).toHaveBeenCalledWith('refreshed','customer');expect(r.cookies.get('whot-session')?.value).toBe('opaque');
 });
 it('never merges existing email after registration conflict',async()=>{mocks.query.mockResolvedValue({rowCount:1});const token='x.'+Buffer.from(JSON.stringify({actor_type:'customer',auth_identity_id:'a',user_metadata:{email:'existing@example.com'}})).toString('base64url')+'.x';mocks.medusa.mockResolvedValueOnce({token}).mockRejectedValueOnce(Error('conflict'));expect((await GET(request())).headers.get('location')).toContain('account');expect(mocks.login).not.toHaveBeenCalled()});
});
