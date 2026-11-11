import SiteHeader from '@/components/SiteHeader';
import SignupForm from '@/components/SignupForm';
export const metadata={title:'회원가입 | the whot'};
export default function Signup(){return <><SiteHeader/><main className="signup-page"><div className="signup-intro"><span className="eyebrow">JOIN THE WHOT</span><h1>더홋과 함께하는 일상</h1><p>회원가입</p></div><SignupForm/></main></>}
