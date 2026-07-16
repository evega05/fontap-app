import { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext(null);

// El token de sesión es sensible: en nativo se guarda con SecureStore (Keychain en
// iOS, Keystore cifrado en Android) en vez de AsyncStorage (texto plano sin cifrar).
// SecureStore no existe en web, así que ahí se sigue usando AsyncStorage.
const esNativo = Platform.OS !== 'web';

const guardarToken = (tok) => esNativo ? SecureStore.setItemAsync('token', tok) : AsyncStorage.setItem('token', tok);
const leerToken = () => esNativo ? SecureStore.getItemAsync('token') : AsyncStorage.getItem('token');
const borrarToken = () => esNativo ? SecureStore.deleteItemAsync('token') : AsyncStorage.removeItem('token');

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let tok = await leerToken();
        const usr = await AsyncStorage.getItem('usuario');
        if (!tok && esNativo) {
          // Migración única: sesiones guardadas antes de este cambio vivían en
          // AsyncStorage sin cifrar. Se mueven a SecureStore y se borra el rastro.
          const tokLegado = await AsyncStorage.getItem('token');
          if (tokLegado) {
            await SecureStore.setItemAsync('token', tokLegado);
            await AsyncStorage.removeItem('token');
            tok = tokLegado;
          }
        }
        if (tok) setToken(tok);
        if (usr) setUsuario(JSON.parse(usr));
      } catch {
        // sesión no recuperable: se queda deslogueado
      } finally {
        setListo(true);
      }
    })();
  }, []);

  const login = async (data) => {
    const tok = data.access_token;
    const usr = { tipo: data.tipo_usuario, nombre: data.nombre, id: data.id };
    setToken(tok);
    setUsuario(usr);
    await Promise.all([guardarToken(tok), AsyncStorage.setItem('usuario', JSON.stringify(usr))]);
  };

  const logout = async () => {
    setToken(null);
    setUsuario(null);
    await Promise.all([borrarToken(), AsyncStorage.removeItem('usuario')]);
  };

  if (!listo) return null;

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
