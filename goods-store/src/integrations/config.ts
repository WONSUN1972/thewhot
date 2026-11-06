/** Connection preparation only: no SDK initialization, credentials or network calls. */
export const integrations={firebase:{enabled:false,projectId:''},social:{enabled:false,providers:['google','kakao','naver']},payments:{enabled:false,mode:'disabled',scope:'non-alcohol-goods-only'},deployment:{enabled:false,environment:'local'}} as const;
export type ExternalService='firebase'|'social'|'payments'|'deployment';
export function integrationStatus(service:ExternalService){return {service,connected:false,reason:'계정 및 운영 조건 확인 후 연결'};}
