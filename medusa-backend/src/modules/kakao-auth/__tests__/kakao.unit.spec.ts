import Kakao from '../service'
const config={clientId:'test-id',clientSecret:'test-secret',callbackUrl:'https://new.thewhot.com/api/auth/social/kakao/callback'}
describe('Kakao provider',()=>{
 const originalFetch=global.fetch
 afterEach(()=>{global.fetch=originalFetch})
 it('rejects administrator authentication',async()=>{
  const service=new Kakao({},config),identity={setState:jest.fn()}
  expect((await service.authenticate({actor_type:'user'} as any,identity as any)).success).toBe(false)
  expect(identity.setState).not.toHaveBeenCalled()
 })
 it('uses only configured callback, ignoring supplied callback',async()=>{
  const service=new Kakao({},config),identity={setState:jest.fn()}
  const result=await service.authenticate({actor_type:'customer',body:{callback_url:'https://evil.test'}} as any,identity as any)
  const url=new URL(result.location!)
  expect(url.searchParams.get('redirect_uri')).toBe(config.callbackUrl)
  expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/)
 })
 it('rejects missing state without contacting Kakao',async()=>{
  global.fetch=jest.fn() as any
  expect((await new Kakao({},config).validateCallback({query:{code:'x'}} as any,{} as any)).success).toBe(false)
  expect(global.fetch).not.toHaveBeenCalled()
 })
 it('requires verified email for new identity',async()=>{
  global.fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({access_token:'token'})}).mockResolvedValueOnce({ok:true,json:async()=>({id:123,kakao_account:{email:'x@example.com',is_email_verified:false}})}) as any
  const identity={getState:async()=>({callback:config.callbackUrl}),retrieve:async()=>{throw {type:'not_found'}},create:jest.fn()}
  const result=await new Kakao({},config).validateCallback({query:{state:'a'.repeat(64),code:'code'}} as any,identity as any)
  expect(result.error).toBe('KAKAO_EMAIL_REQUIRED');expect(identity.create).not.toHaveBeenCalled()
 })
 it('creates provider identity by Kakao id and never stores access token',async()=>{
  global.fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({access_token:'secret-token'})}).mockResolvedValueOnce({ok:true,json:async()=>({id:123,kakao_account:{email:'X@example.com',is_email_valid:true,is_email_verified:true}})}) as any
  const identity={getState:async()=>({callback:config.callbackUrl}),retrieve:async()=>{throw {type:'not_found'}},create:jest.fn().mockResolvedValue({id:'auth_test'})}
  const result=await new Kakao({},config).validateCallback({query:{state:'a'.repeat(64),code:'code'}} as any,identity as any)
  expect(result.success).toBe(true);expect(identity.create.mock.calls[0][0].entity_id).toBe('123')
  expect(JSON.stringify(identity.create.mock.calls)).not.toContain('secret-token')
 })
})
