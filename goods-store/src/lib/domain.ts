export const categories = ['DRINKWARE', 'APPAREL', 'ACCESSORIES'] as const;
export type CartItem = {id:string;quantity:number};
export function validateCart(value:unknown):CartItem[]{
 if(!Array.isArray(value)||value.length<1||value.length>20)throw Error('장바구니를 확인해 주세요.');
 const ids=new Set<string>();
 return value.map(x=>{if(!x||typeof x.id!=='string'||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>20||ids.has(x.id))throw Error('상품 수량이 올바르지 않습니다.');ids.add(x.id);return {id:x.id,quantity:x.quantity}});
}
export function shipping(total:number){return 3000;}
export function money(n:number){return new Intl.NumberFormat('ko-KR').format(n)+'원';}
