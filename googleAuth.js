import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = '1037459588867-dum7jb79ef3c5lc5icnd4le4fgnicesj.apps.googleusercontent.com';

export function useGoogleAuth() {
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  // "native" fija la URL que se usará en un build real (app instalada, no Expo Go):
  // fontap:/// — esa no cambia nunca, así que solo hay que darla de alta una vez
  // en Google Cloud Console. En Expo Go se sigue usando la URL de desarrollo
  // (exp://...), que si cambia hay que volver a registrar aparte.
  const redirectUri = AuthSession.makeRedirectUri({ native: 'fontap:///' });
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
