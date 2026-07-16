import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = '1037459588867-dum7jb79ef3c5lc5icnd4le4fgnicesj.apps.googleusercontent.com';

export function useGoogleAuth() {
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const redirectUri = AuthSession.makeRedirectUri();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: {
        nonce: Crypto.randomUUID(),
      },
    },
    discovery
  );
  return { request, response, promptAsync, redirectUri };
}

export function googleConfigurado() {
  return !!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_GOOGLE_CLIENT_ID');
}
