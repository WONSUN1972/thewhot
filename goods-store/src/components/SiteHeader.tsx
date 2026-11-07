'use client';
import {useEffect,useState} from 'react';
import BrandNav from './BrandNav';
export default function SiteHeader({count,onNavigate}:{count?:number;onNavigate?:(view:string)=>void}){
 const [storedCount,setStoredCount]=useState(0);
 useEffect(()=>{try{const c=JSON.parse(localStorage.getItem('whot-goods-cart')||'{}');setStoredCount(Object.values(c).reduce<number>((n,v)=>n+(typeof v==='number'&&Number.isInteger(v)&&v>0&&v<=20?v:0),0))}catch{}},[]);
 const navigate=(e:React.MouseEvent<HTMLAnchorElement>,view:string)=>{if(onNavigate&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(view)}};
 const total=count??storedCount;
 return <><div className="notice">LOCAL PREVIEW <span>비주류 굿즈 시제품 · 상품·가격·이미지는 검토용 예시입니다.</span></div><header className="site-header"><a className="logo" href="/#home" onClick={e=>navigate(e,'home')}><img src="/wordmark.png" alt="the whot BREWERY"/></a><BrandNav/><div className="tools"><a aria-label="상품 검색" href="/?search=1#shop" onClick={e=>{navigate(e,'shop');if(onNavigate)setTimeout(()=>document.getElementById('search')?.focus(),100)}}><span className="symbol" aria-hidden="true">search</span></a><a aria-label="회원" href="/#account" onClick={e=>navigate(e,'account')}><span className="symbol" aria-hidden="true">person</span></a><a aria-label={'장바구니 '+total+'개'} href="/#cart" onClick={e=>navigate(e,'cart')}><span className="symbol" aria-hidden="true">shopping_bag</span><b>{total}</b></a></div></header></>;
}
