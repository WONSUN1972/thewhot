'use client';
import {useEffect,useState} from 'react';
import {kakaoErrors} from '@/lib/social-errors';
export default function SocialLogin(){
 const [error,setError]=useState('');
 useEffect(()=>{const key=new URLSearchParams(window.location.search).get('social_error');if(key)setError(kakaoErrors[key]||kakaoErrors.unavailable)},[]);
 return <div style={{marginTop:24}}>
  {error&&<p role="alert" style={{color:'#9b3024',lineHeight:1.6}}>{error}</p>}
  <form action="/api/auth/social/kakao/start" method="post"><button type="submit" style={{width:'100%',background:'#FEE500',color:'#191919',border:0,borderRadius:6,padding:'14px 20px',fontSize:16,fontWeight:600,cursor:'pointer'}}>카카오 로그인</button></form>
  <p className="muted" style={{fontSize:12,marginTop:10}}>처음 로그인하면 카카오 계정으로 회원가입이 진행됩니다.</p>
 </div>
}
