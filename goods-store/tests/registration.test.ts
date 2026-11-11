import {describe,it,expect} from 'vitest';
import {registrationDetails} from '../src/lib/registration';
const base={name:'테스트',phone:'010-1234-5678',birthday:'02-29',requiredConsent:true};
describe('registration privacy and validation',()=>{
 it('accepts leap birthday and omitted optional data without asserting verification',()=>{const d=registrationDetails(base);expect(d.phone).toBe('01012345678');expect(d.metadata.phone_verified).toBe(false);expect(d.metadata).not.toHaveProperty('gender')});
 it.each(['02-30','04-31','13-01','00-10'])('rejects impossible birthday %s',birthday=>expect(()=>registrationDetails({...base,birthday})).toThrow());
 it('rejects missing required consent',()=>expect(()=>registrationDetails({...base,requiredConsent:false})).toThrow());
 it('rejects optional data without consent',()=>expect(()=>registrationDetails({...base,gender:'female'})).toThrow());
 it('records consent with optional data',()=>expect(registrationDetails({...base,gender:'female',optionalConsent:true}).metadata.gender).toBe('female'));
 it('rejects invalid phone',()=>expect(()=>registrationDetails({...base,phone:'123'})).toThrow());
});
