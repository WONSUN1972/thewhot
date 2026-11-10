import {describe, it, expect} from 'vitest';
import {socialReadiness} from '../src/integrations/social';
describe('social connection preparation', () => {
  it('fails closed with absent configuration', () => {
    for (const result of socialReadiness({})) {
      expect(result.enabled).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.plannedCallbackUrl).toBeNull();
    }
  });
  it.each(['http://new.thewhot.com', 'https://user:pass@new.thewhot.com', 'https://new.thewhot.com/other', 'not-a-url'])('rejects invalid origin %s', APP_ORIGIN => {
    expect(socialReadiness({APP_ORIGIN})[0].originValid).toBe(false);
  });
  it('provides reserved callback addresses without activating or leaking keys', () => {
    const result = socialReadiness({APP_ORIGIN:'https://new.thewhot.com', SOCIAL_GOOGLE_CLIENT_ID:'test-client', SOCIAL_GOOGLE_CLIENT_SECRET:'private-test-value'});
    expect(result[2].credentialsConfigured).toBe(true);
    expect(result[0].enabled).toBe(false);
    expect(result[2].plannedCallbackUrl).toBe('https://new.thewhot.com/api/auth/social/google/callback');
    expect(JSON.stringify(result)).not.toContain('private-test-value');
    expect(result[1].credentialsConfigured).toBe(false);
  });
  it('does not accept example placeholders', () => {
    expect(socialReadiness({SOCIAL_GOOGLE_CLIENT_ID:'REPLACE_ME', SOCIAL_GOOGLE_CLIENT_SECRET:'YOUR_SECRET'})[2].missing).toHaveLength(2);
  });
});
