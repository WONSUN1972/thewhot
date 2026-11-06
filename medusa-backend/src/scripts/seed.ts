import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules, ProductStatus } from '@medusajs/framework/utils'
import { createProductsWorkflow, createRegionsWorkflow, createSalesChannelsWorkflow, updateStoresWorkflow, createStockLocationsWorkflow, createShippingProfilesWorkflow, createShippingOptionsWorkflow, createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow, linkSalesChannelsToStockLocationWorkflow, createInventoryLevelsWorkflow } from '@medusajs/medusa/core-flows'

export default async function seed({container}:ExecArgs) {
 const query=container.resolve(ContainerRegistrationKeys.QUERY), link=container.resolve(ContainerRegistrationKeys.LINK)
 const stores=container.resolve(Modules.STORE), sales=container.resolve(Modules.SALES_CHANNEL), regions=container.resolve(Modules.REGION), locations=container.resolve(Modules.STOCK_LOCATION), fulfillment=container.resolve(Modules.FULFILLMENT)
 const [store]=await stores.listStores()
 let [channel]=await sales.listSalesChannels({name:'THE WHOT Goods Demo'})
 if(!channel) [channel]=(await createSalesChannelsWorkflow(container).run({input:{salesChannelsData:[{name:'THE WHOT Goods Demo'}]}})).result
 await updateStoresWorkflow(container).run({input:{selector:{id:store.id},update:{name:'THE WHOT · GOODS DEMO',supported_currencies:[{currency_code:'krw',is_default:true}],default_sales_channel_id:channel.id}}})
 let [region]=await regions.listRegions({name:'Korea · simulation only'})
 if(!region) [region]=(await createRegionsWorkflow(container).run({input:{regions:[{name:'Korea · simulation only',currency_code:'krw',countries:['kr'],automatic_taxes:false,payment_providers:['pp_system_default']}]}})).result
 let [location]=await locations.listStockLocations({name:'Local sample warehouse'})
 if(!location) {
  [location]=(await createStockLocationsWorkflow(container).run({input:{locations:[{name:'Local sample warehouse',address:{city:'Simulation',country_code:'KR',address_1:'No real delivery'}}]}})).result
  await link.create({[Modules.STOCK_LOCATION]:{stock_location_id:location.id},[Modules.FULFILLMENT]:{fulfillment_provider_id:'manual_manual'}})
  await linkSalesChannelsToStockLocationWorkflow(container).run({input:{id:location.id,add:[channel.id]}})
 }
 await updateStoresWorkflow(container).run({input:{selector:{id:store.id},update:{default_location_id:location.id}}})
 let [profile]=await fulfillment.listShippingProfiles({type:'default'})
 if(!profile) [profile]=(await createShippingProfilesWorkflow(container).run({input:{data:[{name:'Sample goods',type:'default'}]}})).result
 let [set]=await fulfillment.listFulfillmentSets({name:'Goods simulation delivery'},{relations:['service_zones']})
 if(!set) {
  set=await fulfillment.createFulfillmentSets({name:'Goods simulation delivery',type:'shipping',service_zones:[{name:'Korea simulation',geo_zones:[{country_code:'kr',type:'country'}]}]})
  await link.create({[Modules.STOCK_LOCATION]:{stock_location_id:location.id},[Modules.FULFILLMENT]:{fulfillment_set_id:set.id}})
 }
 const existingShipping=await fulfillment.listShippingOptions({name:'시연 배송 · 실제 배송 없음'})
 if(!existingShipping.length) await createShippingOptionsWorkflow(container).run({input:[{name:'시연 배송 · 실제 배송 없음',price_type:'flat',provider_id:'manual_manual',service_zone_id:set.service_zones[0].id,shipping_profile_id:profile.id,type:{label:'Simulation',description:'No real shipping',code:'demo'},prices:[{currency_code:'krw',amount:3000}],rules:[{attribute:'enabled_in_store',operator:'eq',value:'true'},{attribute:'is_return',operator:'eq',value:'false'}]}]})
 const {data:keys}=await query.graph({entity:'api_key',fields:['id'],filters:{type:'publishable',title:'THE WHOT Local Goods'}})
 if(keys.length) await linkSalesChannelsToApiKeyWorkflow(container).run({input:{id:keys[0].id,add:[channel.id]}})
 if(!keys.length){ const [key]=(await createApiKeysWorkflow(container).run({input:{api_keys:[{title:'THE WHOT Local Goods',type:'publishable',created_by:''}]}})).result;await linkSalesChannelsToApiKeyWorkflow(container).run({input:{id:key.id,add:[channel.id]}}) }
 const samples=[{id:'glass',title:'시그니처 글라스',category:'DRINKWARE',price:18000,stock:24,variant:'CLEAR · 350ml'},{id:'tee',title:'에센셜 티셔츠',category:'APPAREL',price:39000,stock:18,variant:'CREAM · M'},{id:'tote',title:'데일리 에코백',category:'ACCESSORIES',price:24000,stock:30,variant:'NATURAL · ONE SIZE'},{id:'mug',title:'스튜디오 머그',category:'DRINKWARE',price:22000,stock:16,variant:'FOREST · 300ml'}]
 for(const p of samples){
  const {data:old}=await query.graph({entity:'product',fields:['id'],filters:{handle:p.id}})
  if(old.length) continue
  await createProductsWorkflow(container).run({input:{products:[{title:p.title,handle:p.id,description:'비주류 굿즈 시연용 샘플입니다. 이미지·가격·사양은 확정 전이며 실제 결제와 배송은 발생하지 않습니다.',status:ProductStatus.PUBLISHED,shipping_profile_id:profile.id,metadata:{goods_demo:true,category:p.category,image:p.id},options:[{title:'Sample',values:[p.variant]}],variants:[{title:p.variant,sku:'WHOT-DEMO-'+p.id.toUpperCase(),manage_inventory:true,options:{Sample:p.variant},prices:[{currency_code:'krw',amount:p.price}]}],sales_channels:[{id:channel.id}]}]}})
  const {data:items}=await query.graph({entity:'inventory_item',fields:['id','sku'],filters:{sku:'WHOT-DEMO-'+p.id.toUpperCase()}})
  await createInventoryLevelsWorkflow(container).run({input:{inventory_levels:items.map(i=>({inventory_item_id:i.id,location_id:location.id,stocked_quantity:p.stock}))}})
 }
 console.log('Goods sample seed complete. Existing product prices and stock preserved.')
}
