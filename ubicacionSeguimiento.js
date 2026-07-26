import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';

const API = 'https://fontap-backend-production.up.railway.app';
const TAREA_UBICACION = 'seguimiento-ubicacion-profesional';

// Definida a nivel de módulo (no dentro de un componente) porque el sistema operativo
// puede despertar esta tarea con la app en segundo plano, sin que haya ningún
// componente de React montado — por eso lee el token/usuario directo de donde
// AuthContext los persiste, en vez de recibirlos por props.
TaskManager.defineTask(TAREA_UBICACION, async ({ data, error }) => {
  if (error) return;
  const ubicaciones = data?.locations;
  if (!ubicaciones || ubicaciones.length === 0) return;
  const { latitude, longitude } = ubicaciones[ubicaciones.length - 1].coords;
  try {
    const token = Platform.OS !== 'web' ? await SecureStore.getItemAsync('token') : await AsyncStorage.getItem('token');
    const usuarioRaw = await AsyncStorage.getItem('usuario');
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;
    if (!token || !usuario?.id) return;
    await axios.put(`${API}/fontaneros/${usuario.id}/ubicacion`, {
      latitud: latitude,
      longitud: longitude,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    // Sin conexión o error puntual: se reintenta solo con la siguiente actualización de ubicación.
  }
});

// Solo se usa mientras el profesional va "en camino" a un trabajo concreto — no se deja
// corriendo todo el tiempo, para cuidar batería y porque Google Play exige justificar
// cada uso de ubicación en segundo plano por el propósito puntual que cumple.
export async function iniciarSeguimientoUbicacion() {
  if (Platform.OS === 'web') return;
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return;
    const yaActivo = await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION).catch(() => false);
    if (yaActivo) return;
    await Location.startLocationUpdatesAsync(TAREA_UBICACION, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000,
      distanceInterval: 30,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Compartiendo tu ubicación',
        notificationBody: 'El cliente puede ver que vas de camino a su trabajo.',
      },
    });
  } catch (e) {}
}

export async function detenerSeguimientoUbicacion() {
  if (Platform.OS === 'web') return;
  try {
    const yaActivo = await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION).catch(() => false);
    if (yaActivo) await Location.stopLocationUpdatesAsync(TAREA_UBICACION);
  } catch (e) {}
}
