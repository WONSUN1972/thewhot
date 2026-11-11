import DesignShowcase from '@/components/DesignShowcase';
import pages from '@/content/brand-pages.json';
import SiteHeader from '@/components/SiteHeader';
import {notFound} from 'next/navigation';
export function generateStaticParams(){return Object.keys(pages).filter(k=>k!=='home').map(slug=>({slug}))}
export default async function BrandPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const page=pages[slug as keyof typeof pages];if(!page)notFound();return <><SiteHeader/>{slug==='DesignbyUs'?<DesignShowcase/>:<main className="preserved-main" dangerouslySetInnerHTML={{__html:page.html}}/>}<div className="brand-extra"><a href="/">브랜드 메인</a><a href="/brand/Brewmaster">브루마스터 소개</a><a href="/#shop">굿즈 SHOP</a></div><footer><div className="footer-brand"><img src="/wordmark.png" alt="the whot BREWERY"/></div><div><h3>THE WHOT</h3><p>(주)더홋브루어리농업회사법인<br/>대표 김나래</p></div><div><h3>CONTACT</h3><a href="tel:0316331045">031.633.1045</a><a href="mailto:ceo@thewhot.com">ceo@thewhot.com</a></div><div><h3>SHOP</h3><a href="/#shop">비주류 굿즈</a><a href="/#admin">로컬 백오피스</a></div><div><a href="/privacy">개인정보처리방침</a></div></footer></>}
