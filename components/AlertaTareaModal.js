import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { navigationRef } from '../navigationRef';
import { colors, spacing, radius, type, shadow } from '../theme';
import Pressable from './Pressable';
import Glass from './Glass';

const API = 'https://fontap-backend-production.up.railway.app';

// Alerta a pantalla completa cuando el jefe le manda una tarea a un empleado: se
// engancha a la notificación push (foreground) con tipo "nueva_tarea" (o
// "nueva_tarea_urgente"), pide el detalle real a la API (no confía solo en el
// payload del push) y bloquea la app hasta que el empleado la acepte — igual que
// pide el diseño, no es descartable tocando afuera. expo-notifications no soporta
// este listener en web.
export default function AlertaTareaModal() {
  const { usuario, token } = useAuth();
  const [tarea, setTarea] = useState(null);
  const [aceptando, setAceptando] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !token) return;

    const cargarYMostrar = async (tareaId) => {
      try {
        const res = await axios.get(`${API}/tareas/${tareaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.estado === 'pendiente') {
          setTarea(res.data);
          // Una tarea urgente se siente distinto, no solo se ve distinto: doble golpe
          // fuerte en vez del impacto liviano de siempre.
          if (res.data.urgente) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}), 350);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        }
      } catch (e) {}
    };

    const sub = Notifications.addNotificationReceivedListener((notificacion) => {
      const data = notificacion.request.content.data;
      if ((data?.tipo === 'nueva_tarea' || data?.tipo === 'nueva_tarea_urgente') && data?.referencia_id) {
        cargarYMostrar(data.referencia_id);
      }
    });

    return () => sub.remove();
  }, [token]);

  if (!tarea) return null;

  const colorPrincipal = tarea.urgente ? colors.red : colors.accent;
  const colorSecundario = tarea.urgente ? colors.red : colors.accent2;

  const aceptar = async () => {
    setAceptando(true);
    try {
      await axios.put(`${API}/tareas/${tarea.id}/estado`, { estado: 'aceptada' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
    setAceptando(false);
    setTarea(null);
    if (navigationRef.isReady()) {
      navigationRef.navigate('PanelEmpleado', { nombre: usuario?.nombre, userId: usuario?.id });
    }
  };

  return (
    <View style={s.overlay}>
      <Glass strong style={[s.card, tarea.urgente && s.cardUrgente]}>
        {tarea.urgente && (
          <View style={s.urgentePill}>
            <Ionicons name="alert-circle" size={13} color={colors.red} />
            <Text style={s.urgentePillText}>Urgente</Text>
          </View>
        )}
        {tarea.logo_empresa_url ? (
          <Image source={{ uri: `${API}${tarea.logo_empresa_url}` }} style={s.logo} />
        ) : (
          <LinearGradient colors={[colorPrincipal, colorSecundario]} style={s.logoFallback}>
            <Ionicons name="business" size={36} color="#fff" />
          </LinearGradient>
        )}
        <Text style={s.titulo}>{tarea.urgente ? '🔴 ¡Aviso urgente!' : '🚨 ¡Nuevo mensaje de la empresa!'}</Text>
        <Text style={[s.empresa, { color: colorSecundario }]}>{tarea.nombre_empresa || 'Tu empresa'}</Text>
        <Text style={s.descripcion}>{tarea.descripcion}</Text>
        <Pressable haptic disabled={aceptando} onPress={aceptar} style={{ width: '100%' }}>
          <LinearGradient colors={[colorPrincipal, colorSecundario]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.boton}>
            <Text style={s.botonTexto}>{aceptando ? 'Un momento...' : 'Ver tarea'}</Text>
            <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Glass>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(3,4,10,0.94)',
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
    zIndex: 1000, elevation: 1000,
  },
  card: { width: '100%', maxWidth: 380, padding: spacing.xxl, alignItems: 'center', ...shadow.lg },
  cardUrgente: { borderWidth: 1.5, borderColor: colors.red },
  urgentePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.redGlass, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.md },
  urgentePillText: { color: colors.red, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  logo: { width: 88, height: 88, borderRadius: radius.lg, marginBottom: spacing.lg },
  logoFallback: { width: 88, height: 88, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  titulo: { color: colors.text, ...type.h1, textAlign: 'center', marginBottom: spacing.sm },
  empresa: { color: colors.accent2, fontWeight: '700', fontSize: 15, marginBottom: spacing.lg },
  descripcion: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl },
  boton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, borderRadius: radius.full, width: '100%', ...shadow.glow(colors.accent) },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});
