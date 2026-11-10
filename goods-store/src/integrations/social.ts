/** Server-side configuration preparation. Does not start OAuth or expose credentials. */
export const socialProviders = ['kakao', 'naver', 'google', 'apple', 'facebook'] as const;
export type SocialProvider = typeof socialProviders[number];
type Environment = Record<string, string | undefined>;
export function socialReadiness(env: Environment) {
  let origin: string | null = null;
  try {
    const url = new URL(env.APP_ORIGIN || '');
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) origin = url.origin;
  } catch { /* report missing or invalid origin without logging secrets */ }
  return socialProviders.map(provider => {
    const prefix = `SOCIAL_${provider.toUpperCase()}`;
    const required = provider === 'apple'
      ? ['SOCIAL_APPLE_CLIENT_ID', 'SOCIAL_APPLE_TEAM_ID', 'SOCIAL_APPLE_KEY_ID', 'SOCIAL_APPLE_PRIVATE_KEY_PATH']
      : [`${prefix}_CLIENT_ID`, `${prefix}_CLIENT_SECRET`];
    const missing = required.filter(key => !env[key]?.trim() || /^(REPLACE_|YOUR_|CHANGE_ME)/i.test(env[key]!.trim()));
    return {
      provider,
      credentialsConfigured: missing.length === 0,
      originValid: origin !== null,
      missing,
      // Reserved addresses: register only once the callback implementation is released.
      plannedCallbackUrl: origin ? `${origin}/api/auth/social/${provider}/callback` : null,
      enabled: false,
      status: 'preparation-only' as const,
      pending: ['provider-console-registration', 'oauth-adapter', 'medusa-identity-link', 'end-to-end-verification'],
    };
  });
}
