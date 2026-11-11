import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest,NextResponse} from 'next/server';
const mocks=vi.hoisted(()=>({medusa:vi.fn(),login:vi.fn()}));
vi.mock('../src/lib/medusa',()=>({medusa:mocks.medusa,login:mocks.login,pool:{},session:vi.fn(),digest:vi.fn(),catalog:vi.fn(),orderView:vi.fn(),ApiError:class extends Error{constructor(message:string,public status=400){super(message)}}}));
import {POST} from '../src/app/api/[...path]/route';
const body={name:'테스트',email:'test@example.com',password:'test-only-password',phone:'010-1234-5678',birthday:'11-11',requiredConsent:true};
const req=(data:object,origin='https://new.thewhot.com')=>new NextRequest('https://new.thewhot.com/api/register',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
describe('registration API integration (mocked Medusa)',()=>{
 beforeEach(()=>{vi.resetAllMocks();process.env.APP_ORIGIN='https://new.thewhot.com'});
 it('rejects foreign origins before registering',async()=>{expect((await POST(req(body,'https://foreign.example'))).status).toBe(403);expect(mocks.medusa).not.toHaveBeenCalled()});
 it('rejects absent consent before creating an identity',async()=>{expect((await POST(req({...body,requiredConsent:false}))).status).toBe(400);expect(mocks.medusa).not.toHaveBeenCalled()});
 it('persists profile and consent then opens a customer session',async()=>{mocks.medusa.mockResolvedValueOnce({token:'registration-token'}).mockResolvedValueOnce({customer:{id:'test'}}).mockResolvedValueOnce({token:'login-token'});mocks.login.mockResolvedValue(NextResponse.json({ok:true}));expect((await POST(req(body))).status).toBe(200);expect(mocks.medusa).toHaveBeenNthCalledWith(2,'/store/customers',expect.objectContaining({phone:'01012345678',metadata:expect.objectContaining({birthday:'11-11',phone_verified:false,privacy_consent_version:'2026-11-11'})}),'registration-token');expect(mocks.login).toHaveBeenCalledWith('login-token','customer')});
});
