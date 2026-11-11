export const CONSENT_VERSION='2026-11-11';
export function registrationDetails(body:Record<string,unknown>){
 const name=String(body.name||'').trim(), phone=String(body.phone||'').replace(/[\s()-]/g,''),birthday=String(body.birthday||'');
 if(!name||name.length>40)throw Error('이름을 입력해 주세요.');
 if(!/^01[016789]\d{7,8}$/.test(phone))throw Error('휴대전화번호를 확인해 주세요.');
 if(!/^\d{2}-\d{2}$/.test(birthday))throw Error('생일의 월과 일을 선택해 주세요.');
 const [m,d]=birthday.split('-').map(Number),date=new Date(Date.UTC(2000,m-1,d));
 if(date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('유효한 생일을 입력해 주세요.');
 if(body.requiredConsent!==true)throw Error('필수 개인정보 수집·이용에 동의해 주세요.');
 const gender=String(body.gender||''),ageRange=String(body.ageRange||''),birthyear=String(body.birthyear||'');
 if(gender&&!['female','male','other'].includes(gender))throw Error('성별 선택을 확인해 주세요.');
 if(ageRange&&!['10-19','20-29','30-39','40-49','50-59','60-69','70+'].includes(ageRange))throw Error('연령대 선택을 확인해 주세요.');
 if(birthyear&&(!/^\d{4}$/.test(birthyear)||Number(birthyear)<1900||Number(birthyear)>new Date().getFullYear()))throw Error('출생 연도를 확인해 주세요.');
 if((gender||ageRange||birthyear)&&body.optionalConsent!==true)throw Error('선택 정보를 제공하려면 선택 수집·이용에 동의해 주세요.');
 return {name,phone,metadata:{birthday,...(gender?{gender}:{}),...(ageRange?{age_range:ageRange}:{}),...(birthyear?{birthyear}:{}),privacy_consent_version:CONSENT_VERSION,privacy_consented_at:new Date().toISOString(),optional_privacy_consent:body.optionalConsent===true,phone_verified:false}};
}
