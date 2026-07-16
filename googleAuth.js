import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = '1037459588867-dum7jb79ef3c5lc5icnd4le4fgnicesj.apps.googleusercontent.com';

const API = 'https://fontap-backend-production.up.railway.app';
// Google exige que el redirect_uri sea un dominio real (rechaza fontap:///),
// así que Google vuelve primero a esta página del backend, que reenvía el
// resultado al esquema propio de la app. Esta es la URL que hay que dar de
// alta en Google Cloud Console, no fontap:///.
const GOOGLE_LOGIN_CALLBACK = `${API}/auth/google/login/callback`;

export function useGoogleAuth() {
  const [response, setResponse] = useState(null);

  const promptAsync = useCallback(async () => {
    const nonce = Crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_LOGIN_CALLBACK,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    // fontap:/// solo lo captura expo-web-browser en un build real (EAS);
    // en Expo Go esta pantalla nunca completa el login (limitación ya asumida).
    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'fontap:///');
    if (result.type === 'success' && result.url) {
      const query = result.url.split('?')[1] || '';
      // El nonce viaja de vuelta al backend para que verifique que el id_token
      // corresponde a ESTE intento de login y no a uno interceptado/reproducido.
      setResponse({ type: 'success', params: Object.fromEntries(new URLSearchParams(query)), nonce });
    } else {
      setResponse({ type: result.type });
    }
  }, []);

  return {
    request: googleConfigurado() ? {} : null,
    response,
    promptAsync,
    redirectUri: GOOGLE_LOGIN_CALLBACK,
  };
}

export function googleConfigurado() {
  return !!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_GOOGLE_CLIENT_ID');
}
