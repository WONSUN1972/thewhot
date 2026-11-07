'use client';
import {useEffect,useState} from 'react';
import archived from '@/content/home-slides.json';
export default function HomeHero(){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false);const total=archived.length+1;
 useEffect(()=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setIndex(i=>(i+1)%total),6500);return()=>clearInterval(timer)},[paused,total]);
 const jump=(i:number)=>{setIndex((i+total)%total);setPaused(true)};
 return <section className="home-carousel" aria-label="브랜드 소개 슬라이드" aria-roledescription="carousel" onKeyDown={e=>{if(e.key==='ArrowRight')jump(index+1);if(e.key==='ArrowLeft')jump(index-1)}} onMouseEnter={()=>setPaused(true)} onFocusCapture={()=>setPaused(true)}>
 <div className="home-slide" role="group" aria-label={`${index+1} / ${total}`}>
 {index===0?<a className="jinmyosu-slide" href="/#brand"><div><span>HIGH JINMYOSU · BRAND STORY</span><h1>이천의 재료,<br/>진묘수의 이야기.</h1><p>쌀과 복숭아에서 시작된<br/>더홋의 새로운 브랜드를 만나보세요.</p><span className="hero-more">브랜드 이야기 보기 ↗</span></div><img src="/brand/pouring.jpg" alt="복숭아와 하이진묘수 캔, 잔에 따르는 장면" fetchPriority="high"/></a>:<a href={archived[index-1].href}><picture><source media="(max-width:767px)" srcSet={archived[index-1].mobile}/><img src={archived[index-1].desktop} alt={archived[index-1].title}/></picture></a>}
 </div><div className="carousel-controls"><button aria-label="이전 슬라이드" onClick={()=>jump(index-1)}>←</button><div className="carousel-dots">{['High Jinmyosu',...archived.map(s=>s.title)].map((name,i)=><button key={name} aria-label={`${i+1}. ${name}`} aria-current={index===i?'true':undefined} onClick={()=>jump(i)}/>)}</div><span>{index+1} / {total}</span><button aria-label="다음 슬라이드" onClick={()=>jump(index+1)}>→</button><button aria-label={paused?'슬라이드 자동 재생':'슬라이드 일시 정지'} onClick={()=>setPaused(p=>!p)}>{paused?'▷':'Ⅱ'}</button></div>
 </section>
}
