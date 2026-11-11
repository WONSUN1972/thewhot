import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import KakaoAuthService from './service'
export default ModuleProvider(Modules.AUTH, { services: [KakaoAuthService] })
