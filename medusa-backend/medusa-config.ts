import { loadEnv, defineConfig } from '@medusajs/framework/utils'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())
for (const name of ['DATABASE_URL','JWT_SECRET','COOKIE_SECRET','STORE_CORS','ADMIN_CORS','AUTH_CORS']) {
 if(!process.env[name]) throw new Error(`Required environment variable: ${name}`)
}
if(process.env.NODE_ENV==='production' && !process.env.REDIS_URL) throw new Error('REDIS_URL is required in production')
for(const name of ['JWT_SECRET','COOKIE_SECRET']) if(process.env[name]!.length<32)throw new Error(name+' must be at least 32 characters')
const localHttp=process.env.ALLOW_LOCAL_HTTP==='true'
if(localHttp){
 for(const list of [process.env.STORE_CORS!,process.env.ADMIN_CORS!,process.env.AUTH_CORS!]) for(const origin of list.split(',')) {
  const url=new URL(origin)
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('ALLOW_LOCAL_HTTP is restricted to loopback CORS origins')
 }
}
module.exports = defineConfig({
 projectConfig: {
  cookieOptions:{sameSite:'lax',secure:!localHttp},
  databaseUrl: process.env.DATABASE_URL,
  databaseDriverOptions:{connection:{ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:true}}},
  redisUrl: process.env.REDIS_URL,
  http: {storeCors:process.env.STORE_CORS!,adminCors:process.env.ADMIN_CORS!,authCors:process.env.AUTH_CORS!,jwtSecret:process.env.JWT_SECRET!,cookieSecret:process.env.COOKIE_SECRET!}
 },
 modules: [
  ...(process.env.KAKAO_ENABLED==='true' ? [{resolve:'@medusajs/medusa/auth',options:{providers:[
   {resolve:'@medusajs/medusa/auth-emailpass',id:'emailpass'},
   {resolve:'./src/modules/kakao-auth',id:'kakao',options:{clientId:process.env.SOCIAL_KAKAO_CLIENT_ID,clientSecret:process.env.SOCIAL_KAKAO_CLIENT_SECRET,callbackUrl:process.env.KAKAO_CALLBACK_URL}}
  ]}}] : []),
  {resolve:'@medusajs/medusa/file',options:{providers:[{resolve:'@medusajs/medusa/file-local',id:'local',options:{backend_url:process.env.FILE_PUBLIC_URL || 'http://localhost:9000/static'}}]}},
  ...(process.env.REDIS_URL ? [
  {resolve:'@medusajs/medusa/event-bus-redis', options:{redisUrl:process.env.REDIS_URL}},
  {resolve:'@medusajs/medusa/workflow-engine-redis',options:{redis:{redisUrl:process.env.REDIS_URL}}},
  {resolve:'@medusajs/medusa/locking',options:{providers:[{resolve:'@medusajs/medusa/locking-redis',id:'locking-redis',is_default:true,options:{redisUrl:process.env.REDIS_URL}}]}}
 ] : [])]
})
