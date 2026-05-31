import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import MapaScreen from './screens/MapaScreen';
import SolicitudScreen from './screens/SolicitudScreen';
import ConfirmacionScreen from './screens/ConfirmacionScreen';
import PanelFontaneroScreen from './screens/PanelFontaneroScreen';
import PerfilFontaneroScreen from './screens/PerfilFontaneroScreen';
import ReseñaScreen from './screens/ReseñaScreen';
import PagoScreen from './screens/PagoScreen';

const Stack = createStackNavigator();

// ✅ FIX 2: Navegador que decide ruta inicial según sesión guardada
function AppNavigator() {
  const { usuario, cargando } = useAuth();

  // Mientras carga la sesión guardada, mostrar spinner
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Determinar pantalla inicial según sesión
  let initialRoute = 'Login';
  let initialParams = undefined;
  if (usuario) {
    if (usuario.tipo === 'fontanero') {
      initialRoute = 'PanelFontanero';
      initialParams = { nombre: usuario.nombre };
    } else {
      initialRoute = 'Mapa';
    }
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroScreen} />
      <Stack.Screen name="Mapa" component={MapaScreen} />
      <Stack.Screen name="Solicitud" component={SolicitudScreen} />
      <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
      <Stack.Screen
        name="PanelFontanero"
        component={PanelFontaneroScreen}
        initialParams={initialParams}
      />
      <Stack.Screen name="PerfilFontanero" component={PerfilFontaneroScreen} />
      <Stack.Screen name="Resena" component={ReseñaScreen} />
      <Stack.Screen name="Pago" component={PagoScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}