import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';

const API = 'https://fontap-backend-production.up.railway.app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarNotificaciones(userId, token) {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const expoPushToken = await Notifications.getExpoPushTokenAsync();
  const pushToken = expoPushToken.data;

  if (userId && token) {
    try {
      await axios.post(
        `${API}/usuarios/${userId}/push-token`,
        { token: pushToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {}
  }

  return pushToken;
}

export async function enviarNotificacionLocal(titulo, cuerpo) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger: null,
  });
}
