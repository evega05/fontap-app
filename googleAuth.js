import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Reemplaza esto con tu Client ID de Google Cloud Console (tipo "Web application").
// Ver instrucciones en README o pídeselas a Claude — sin esto el botón de Google
// muestra un aviso en vez de abrir el flujo de login.
export const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

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
        nonce: Math.random().toString(36).substring(2, 15),
      },
    },
    discovery
  );
  return { request, response, promptAsync, redirectUri };
}

export function googleConfigurado() {
  return !!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_GOOGLE_CLIENT_ID');
}
