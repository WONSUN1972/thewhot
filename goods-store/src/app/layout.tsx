import type {Metadata} from 'next';
import './style.css';
import './legacy.css';
export const metadata:Metadata={title:'the whot · OBJECTS & STORIES',description:'더홋 굿즈와 브랜드 아카이브 — 로컬 시제품'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
