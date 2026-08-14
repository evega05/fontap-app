import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, type, shadow } from '../theme';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';
import { confirmarAccion, avisar } from '../confirmar';
import { iniciarSeguimientoUbicacion, detenerSeguimientoUbicacion } from '../ubicacionSeguimiento';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';

function getSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

const ESTADO_INFO = {
  pendiente: { label: 'Nueva', color: colors.accent, icon: 'ellipse' },
  aceptada: { label: 'Aceptada', color: colors.amber, icon: 'checkmark-circle' },
  en_camino: { label: 'En camino', color: colors.green, icon: 'car-sport' },
};

export default function PanelEmpleadoScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const nombre = usuario?.nombre || route.params?.nombre || 'Profesional';
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(null);
  const pollingRef = useRef(null);

  const cargarTareas = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/tareas`, { headers });
      setTareas(res.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [userId, token]);

  useEffect(() => {
    cargarTareas();
    pollingRef.current = setInterval(cargarTareas, 8000);
    return () => clearInterval(pollingRef.current);
  }, [cargarTareas]);

  // Igual que el tracking de "en camino" del panel del profesional dueño: solo se
  // enciende mientras hay una tarea activa en ese estado, nunca todo el tiempo.
  const hayTareaEnCamino = tareas.some(t => t.estado === 'en_camino');
  useEffect(() => {
    if (hayTareaEnCamino) {
      iniciarSeguimientoUbicacion();
    } else {
      detenerSeguimientoUbicacion();
    }
    return () => { detenerSeguimientoUbicacion(); };
  }, [hayTareaEnCamino]);

  const avanzarEstado = async (tarea, nuevoEstado) => {
    setActualizando(tarea.id);
    try {
      await axios.put(`${API}/tareas/${tarea.id}/estado`, { estado: nuevoEstado }, { headers });
      if (nuevoEstado === 'terminada') {
        setTareas(prev => prev.filter(t => t.id !== tarea.id));
      } else {
        setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, estado: nuevoEstado } : t));
      }
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo actualizar la tarea'));
    } finally {
      setActualizando(null);
    }
  };

  return (
    <View style={s.container}>
      <GradientBg />

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.saludo}>{getSaludo()} 👋</Text>
          <Text style={s.nombre} numberOfLines={1}>{nombre}</Text>
        </View>
        <Pressable haptic onPress={() => confirmarAccion('Cerrar sesión', '¿Seguro que quieres salir?', () => { logout(); navigation.replace('Login'); }, { textoConfirmar: 'Salir' })}>
          <Glass style={s.logoutBtn} colorTint={colors.redGlass}>
            <Ionicons name="log-out-outline" size={17} color={colors.red} />
          </Glass>
        </Pressable>
      </View>

      {hayTareaEnCamino && (
        <View style={s.trackingBanner}>
          <Ionicons name="navigate" size={14} color={colors.green} />
          <Text style={s.trackingBannerText}>Compartiendo tu ubicación con la empresa</Text>
        </View>
      )}

      <ScrollView style={s.lista} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
        <Text style={s.seccionTitulo}>Tus tareas</Text>

        {cargando ? (
          <Text style={s.vacioSub}>Cargando…</Text>
        ) : tareas.length === 0 ? (
          <View style={s.vacio}>
            <View style={s.vacioIconWrap}>
              <Ionicons name="checkmark-done" size={26} color={colors.green} />
            </View>
            <Text style={s.vacioTitulo}>Al día</Text>
            <Text style={s.vacioSub}>No tienes tareas pendientes de tu empresa</Text>
          </View>
        ) : (
          tareas.map((t, i) => {
            const info = ESTADO_INFO[t.estado] || ESTADO_INFO.pendiente;
            return (
              <FadeInUp key={t.id} index={i}>
                <Glass style={s.tareaCard}>
                  <View style={s.tareaHeader}>
                    <View style={[s.estadoPill, { backgroundColor: `${info.color}22` }]}>
                      <Ionicons name={info.icon} size={11} color={info.color} />
                      <Text style={[s.estadoPillText, { color: info.color }]}>{info.label}</Text>
                    </View>
                  </View>
                  <Text style={s.tareaDescripcion}>{t.descripcion}</Text>

                  {t.estado === 'pendiente' && (
                    <Pressable haptic disabled={actualizando === t.id} onPress={() => avanzarEstado(t, 'aceptada')}>
                      <LinearGradient colors={[colors.accent, colors.accent2]} style={s.btnAccion}>
                        <Text style={s.btnAccionText}>{actualizando === t.id ? '...' : 'Aceptar'}</Text>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </LinearGradient>
                    </Pressable>
                  )}
                  {t.estado === 'aceptada' && (
                    <Pressable haptic disabled={actualizando === t.id} onPress={() => avanzarEstado(t, 'en_camino')} style={s.btnAccionOutline}>
                      <Text style={s.btnAccionOutlineText}>{actualizando === t.id ? '...' : 'Voy en camino'}</Text>
                      <Ionicons name="car-sport-outline" size={16} color={colors.accent2} />
                    </Pressable>
                  )}
                  {t.estado === 'en_camino' && (
                    <Pressable haptic disabled={actualizando === t.id} onPress={() => avanzarEstado(t, 'terminada')}>
                      <LinearGradient colors={[colors.green, colors.green]} style={s.btnAccion}>
                        <Text style={s.btnAccionText}>{actualizando === t.id ? '...' : 'Marcar terminada'}</Text>
                        <Ionicons name="checkmark-done" size={16} color="#fff" />
                      </LinearGradient>
                    </Pressable>
                  )}
                </Glass>
              </FadeInUp>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: 50, paddingBottom: spacing.sm },
  saludo: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  nombre: { color: colors.text, ...type.h1 },
  logoutBtn: { width: 38, height: 38, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.redLight },
  trackingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.greenGlass, marginHorizontal: spacing.xl, marginTop: spacing.sm, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: spacing.md },
  trackingBannerText: { color: colors.green, fontSize: 12, fontWeight: '600' },
  lista: { flex: 1 },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: spacing.md },
  vacio: { alignItems: 'center', paddingTop: 40 },
  vacioIconWrap: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.greenGlass, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  vacioTitulo: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  vacioSub: { color: colors.textMuted, fontSize: 13.5 },
  tareaCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadow.md },
  tareaHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  estadoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  estadoPillText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  tareaDescripcion: { color: colors.text, fontSize: 14.5, lineHeight: 21, marginBottom: spacing.md },
  btnAccion: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md },
  btnAccionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnAccionOutline: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.accent },
  btnAccionOutlineText: { color: colors.accent2, fontWeight: 'bold', fontSize: 14 },
});
