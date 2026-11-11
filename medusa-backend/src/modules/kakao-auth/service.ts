import { randomBytes } from 'node:crypto'
import { AbstractAuthModuleProvider, MedusaError } from '@medusajs/framework/utils'
import type { AuthenticationInput, AuthenticationResponse, AuthIdentityProviderService } from '@medusajs/framework/types'
type Options = {clientId:string; clientSecret:string; callbackUrl:string}
export default class KakaoAuthService extends AbstractAuthModuleProvider {
  static identifier = 'kakao'
  static DISPLAY_NAME = 'Kakao'
  protected options: Options
  static validateOptions(o: Options) {
    if (!o.clientId || !o.clientSecret || !o.callbackUrl.startsWith('https://')) throw Error('Kakao HTTPS configuration required')
  }
  constructor(container: Record<string, unknown>, options: Options) { super(); this.options = options }
  async register(): Promise<AuthenticationResponse> { return {success:false,error:'Use Kakao authentication'} }
  async authenticate(input: AuthenticationInput, service: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    if ((input as AuthenticationInput & {actor_type?:string}).actor_type !== 'customer') return {success:false,error:'Customer authentication only'}
    const state = randomBytes(32).toString('hex')
    await service.setState(state, {callback:this.options.callbackUrl}, 600)
    const url = new URL('https://kauth.kakao.com/oauth/authorize')
    url.search = new URLSearchParams({client_id:this.options.clientId,redirect_uri:this.options.callbackUrl,response_type:'code',state}).toString()
    return {success:true,location:url.toString()}
  }
  async validateCallback(input: AuthenticationInput, service: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    try {
      const query = input.query ?? {}
      if (typeof query.state !== 'string' || !/^[a-f0-9]{64}$/.test(query.state)) throw Error()
      const state = await service.getState(query.state)
      if (!state || state.callback !== this.options.callbackUrl || query.error || typeof query.code !== 'string' || query.code.length > 2048) throw Error()
      const response = await fetch('https://kauth.kakao.com/oauth/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:this.options.clientId,client_secret:this.options.clientSecret,redirect_uri:this.options.callbackUrl,code:query.code}),signal:AbortSignal.timeout(15000)})
      if (!response.ok) throw Error()
      const tokens = await response.json()
      if (typeof tokens.access_token !== 'string') throw Error()
      const profileResponse = await fetch('https://kapi.kakao.com/v2/user/me', {headers:{Authorization:`Bearer ${tokens.access_token}`},signal:AbortSignal.timeout(15000)})
      if (!profileResponse.ok) throw Error()
      const profile = await profileResponse.json()
      if (!Number.isSafeInteger(profile.id) || profile.id <= 0) throw Error()
      const entity_id = String(profile.id)
      let authIdentity
      try { authIdentity = await service.retrieve({entity_id}) }
      catch (error) {
        if (error.type !== MedusaError.Types.NOT_FOUND) throw error
        const account = profile.kakao_account
        if (!account?.is_email_valid || !account?.is_email_verified || typeof account.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) return {success:false,error:'KAKAO_EMAIL_REQUIRED'}
        authIdentity = await service.create({entity_id,user_metadata:{email:account.email.toLowerCase(),name:String(account.profile?.nickname || '카카오 회원').slice(0,40)}})
      }
      return {success:true,authIdentity}
    } catch { return {success:false,error:'Kakao authentication failed'} }
  }
}
