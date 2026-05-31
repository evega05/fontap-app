import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true); // ← NUEVO: esperar a cargar sesión

  // ✅ FIX 1: Cargar sesión guardada al abrir la app
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const tokenGuardado = await AsyncStorage.getItem('token');
        const usuarioGuardado = await AsyncStorage.getItem('usuario');
        if (tokenGuardado && usuarioGuardado) {
          setToken(tokenGuardado);
          setUsuario(JSON.parse(usuarioGuardado));
        }
      } catch (e) {
        console.log('Error cargando sesión:', e);
      } finally {
        setCargando(false);
      }
    };
    cargarSesion();
  }, []);

  const login = async (data) => {
    const usuarioData = {
      tipo: data.tipo_usuario,
      nombre: data.nombre,
      id: data.id,           // ← NUEVO: guardar id para llamadas al backend
      email: data.email,
    };
    setToken(data.access_token);
    setUsuario(usuarioData);
    try {
      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioData));
    } catch (e) {}
  };

  const logout = async () => {
    setToken(null);
    setUsuario(null);
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('usuario');
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);