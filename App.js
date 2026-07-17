import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './AuthContext';
import StripeWrapper from './StripeWrapper';
import { rutaParaNotificacion } from './pushNavigation';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import MapaScreen from './screens/MapaScreen';
import SolicitudScreen from './screens/SolicitudScreen';
import ConfirmacionScreen from './screens/ConfirmacionScreen';
import PanelFontaneroScreen from './screens/PanelFontaneroScreen';
import PerfilFontaneroScreen from './screens/PerfilFontaneroScreen';
import ReseñaScreen from './screens/ReseñaScreen';
import ReseñaClienteScreen from './screens/ReseñaClienteScreen';
import PagoScreen from './screens/PagoScreen';
import ChatScreen from './screens/ChatScreen';
import FavoritosScreen from './screens/FavoritosScreen';
import NotificacionesScreen from './screens/NotificacionesScreen';
import OfertasScreen from './screens/OfertasScreen';
import CalendarioScreen from './screens/CalendarioScreen';
import MisServiciosScreen from './screens/MisServiciosScreen';
import ServiciosRecurrentesScreen from './screens/ServiciosRecurrentesScreen';
import ProyectosScreen from './screens/ProyectosScreen';
import EstadisticasScreen from './screens/EstadisticasScreen';
import OfertasClienteScreen from './screens/OfertasClienteScreen';
import ChatsRecientesScreen from './screens/ChatsRecientesScreen';
import PerfilFontaneroPublicoScreen from './screens/PerfilFontaneroPublicoScreen';
import TerminosScreen from './screens/TerminosScreen';
import OlvidePasswordScreen from './screens/OlvidePasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import VerificarEmailScreen from './screens/VerificarEmailScreen';
import AjustesCuentaScreen from './screens/AjustesCuentaScreen';
import SeguimientoScreen from './screens/SeguimientoScreen';
import { IdiomaProvider } from './i18n';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function SplashScreen({ onFinish }) {
  const escala = new Animated.Value(0.3);
  const opacidad = new Animated.Value(0);
  const opacidadTexto = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(escala, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(opacidadTexto, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(opacidad, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={s.splash}>
      <Animated.View style={[s.splashLogo, { transform: [{ scale: escala }], opacity: opacidad }]}>
        <Text style={s.splashEmoji}>🔧</Text>
      </Animated.View>
      <Animated.Text style={[s.splashNombre, { opacity: opacidadTexto }]}>Multiservicios Provenza</Animated.Text>
      <Animated.Text style={[s.splashSub, { opacity: opacidadTexto }]}>Profesionales del hogar</Animated.Text>
    </View>
  );
}

function NavegadorPrincipal() {
  const { logout, usuario, token } = useAuth();

  // Si ya hay una sesión guardada (token restaurado por AuthContext al arrancar),
  // hay que abrir directo en la pantalla que le toca, no siempre en Login: si no,
  // cualquier recarga de página (web) o reapertura de la app tira la sesión guardada
  // a la basura y obliga a volver a iniciar sesión aunque el token siga siendo válido.
  const rutaInicial = !token ? 'Login'
    : usuario?.tipo === 'fontanero' ? 'PanelFontanero'
    : usuario?.tipo === 'administrador_fincas' ? 'Proyectos'
    : 'Mapa';

  // Deep-link de notificaciones push: al tocar una notificación (app en primer/segundo
  // plano, o cerrada del todo) navega a la pantalla relevante en vez de dejar al usuario
  // en la pantalla por defecto. expo-notifications no soporta esto en web.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const irA = (data) => {
      if (!navigationRef.isReady()) return;
      const ruta = rutaParaNotificacion(data, usuario);
      if (ruta) navigationRef.navigate(ruta.name, ruta.params);
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      irA(response.notification.request.content.data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) irA(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [usuario]);

  // Sesión caducada: si una llamada autenticada devuelve 401, el token JWT expiró.
  // Se limpia la sesión y se vuelve al Login con un aviso. El login normal (contraseña
  // incorrecta) también devuelve 401 pero sin header Authorization, así que no le afecta.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const conToken = !!error?.config?.headers?.Authorization;
        if (error?.response?.status === 401 && conToken) {
          logout();
          if (navigationRef.isReady()) {
            navigationRef.reset({ index: 0, routes: [{ name: 'Login', params: { sesionCaducada: true } }] });
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={rutaInicial} screenOptions={{ animation: 'slide_from_right', contentStyle: { backgroundColor: '#070B14' } }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Registro" component={RegistroScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Mapa" component={MapaScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Solicitud" component={SolicitudScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PanelFontanero" component={PanelFontaneroScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PerfilFontanero" component={PerfilFontaneroScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Resena" component={ReseñaScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ResenaCliente" component={ReseñaClienteScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Pago" component={PagoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Favoritos" component={FavoritosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notificaciones" component={NotificacionesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Ofertas" component={OfertasScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Calendario" component={CalendarioScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MisServicios" component={MisServiciosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ServiciosRecurrentes" component={ServiciosRecurrentesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Proyectos" component={ProyectosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Estadisticas" component={EstadisticasScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OfertasCliente" component={OfertasClienteScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatsRecientes" component={ChatsRecientesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PerfilFontaneroPublico" component={PerfilFontaneroPublicoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Terminos" component={TerminosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OlvidePassword" component={OlvidePasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VerificarEmail" component={VerificarEmailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AjustesCuenta" component={AjustesCuentaScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Seguimiento" component={SeguimientoScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [splashListo, setSplashListo] = useState(false);

  if (!splashListo) {
    return (
      <SplashScreen onFinish={() => setSplashListo(true)} />
    );
  }

  return (
    <StripeWrapper>
      <AuthProvider>
        <IdiomaProvider>
          <NavegadorPrincipal />
        </IdiomaProvider>
      </AuthProvider>
    </StripeWrapper>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#070B14', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 120, height: 120, borderRadius: 36, backgroundColor: '#0A1836', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#3D7EFF' },
  splashEmoji: { fontSize: 56 },
  splashNombre: { fontSize: 30, fontWeight: 'bold', color: '#E8EDF5', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center', paddingHorizontal: 24 },
  splashSub: { fontSize: 15, color: '#7A8BA8' },
});