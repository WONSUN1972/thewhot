import {ExecArgs} from '@medusajs/framework/types'
import {Modules} from '@medusajs/framework/utils'
export default async function bootstrap({container}:ExecArgs){
 const email=process.env.BOOTSTRAP_ADMIN_EMAIL,password=process.env.BOOTSTRAP_ADMIN_PASSWORD
 if(!email||!password||password.length<16)throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and a unique BOOTSTRAP_ADMIN_PASSWORD (16+ characters).')
 const users=container.resolve(Modules.USER),auth=container.resolve(Modules.AUTH)
 if((await users.listUsers({email})).length) {console.log('Admin exists; preserved.');return}
 const workflow=container.resolve(Modules.WORKFLOW_ENGINE)
 const {result}=await workflow.run('create-users-workflow',{input:{users:[{email}]}})
 const {authIdentity,error}=await auth.register('emailpass',{body:{email,password}})
 if(error||!authIdentity)throw Error(error||'Admin identity failed')
 await auth.updateAuthIdentities({id:authIdentity.id,app_metadata:{user_id:result[0].id}})
 console.log('Administrator created. Credentials were not printed.')
}
