import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'usuario']).then(([[, tok], [, usr]]) => {
      if (tok) setToken(tok);
      if (usr) setUsuario(JSON.parse(usr));
      setListo(true);
    }).catch(() => setListo(true));
  }, []);

  const login = async (data) => {
    const tok = data.access_token;
    const usr = { tipo: data.tipo_usuario, nombre: data.nombre, id: data.id };
    setToken(tok);
    setUsuario(usr);
    await AsyncStorage.multiSet([['token', tok], ['usuario', JSON.stringify(usr)]]);
  };

  const logout = async () => {
    setToken(null);
    setUsuario(null);
    await AsyncStorage.multiRemove(['token', 'usuario']);
  };

  if (!listo) return null;

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
