import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './AuthContext';
import StripeWrapper from './StripeWrapper';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
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
import EstadisticasScreen from './screens/EstadisticasScreen';
import OfertasClienteScreen from './screens/OfertasClienteScreen';
import ChatsRecientesScreen from './screens/ChatsRecientesScreen';
import PerfilFontaneroPublicoScreen from './screens/PerfilFontaneroPublicoScreen';
import TerminosScreen from './screens/TerminosScreen';
import OlvidePasswordScreen from './screens/OlvidePasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import VerificarEmailScreen from './screens/VerificarEmailScreen';

const Stack = createNativeStackNavigator();

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
      <Animated.Text style={[s.splashNombre, { opacity: opacidadTexto }]}>FonTap</Animated.Text>
      <Animated.Text style={[s.splashSub, { opacity: opacidadTexto }]}>Fontaneros profesionales</Animated.Text>
    </View>
  );
}

function NavegadorPrincipal() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ animation: 'slide_from_right', contentStyle: { backgroundColor: '#070B14' } }}>
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
        <Stack.Screen name="Estadisticas" component={EstadisticasScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OfertasCliente" component={OfertasClienteScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatsRecientes" component={ChatsRecientesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PerfilFontaneroPublico" component={PerfilFontaneroPublicoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Terminos" component={TerminosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OlvidePassword" component={OlvidePasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VerificarEmail" component={VerificarEmailScreen} options={{ headerShown: false }} />
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
        <NavegadorPrincipal />
      </AuthProvider>
    </StripeWrapper>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#070B14', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 120, height: 120, borderRadius: 36, backgroundColor: '#0A1836', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#3D7EFF' },
  splashEmoji: { fontSize: 56 },
  splashNombre: { fontSize: 42, fontWeight: 'bold', color: '#E8EDF5', letterSpacing: -1, marginBottom: 8 },
  splashSub: { fontSize: 15, color: '#7A8BA8' },
});