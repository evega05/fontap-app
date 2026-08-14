import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Fecha/hora de la tarea en formato corto — "Hoy 16:30", "Mañana 09:00" o
// "12 ago 14:00" si es más lejos, para no obligar a leer una fecha completa.
function formatFechaTarea(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  const ahora = new Date();
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  const mañana = new Date(ahora);
  mañana.setDate(mañana.getDate() + 1);
  if (mismoDia) return `Hoy · ${hora}`;
  if (fecha.toDateString() === mañana.toDateString()) return `Mañana · ${hora}`;
  const dia = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${dia} · ${hora}`;
}

const ESTADO_INFO = {
  pendiente: { label: 'Nueva', color: colors.accent, icon: 'ellipse' },
  aceptada: { label: 'Aceptada', color: colors.amber, icon: 'checkmark-circle' },
  en_camino: { label: 'En camino', color: colors.green, icon: 'car-sport' },
  terminada: { label: 'Terminada', color: colors.green, icon: 'checkmark-done' },
  rechazada: { label: 'Rechazada', color: colors.textMuted, icon: 'close-circle' },
};

const CLAVE_CACHE = (userId) => `tareas_empleado_cache_${userId}`;

export default function PanelEmpleadoScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const nombre = usuario?.nombre || route.params?.nombre || 'Profesional';
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [tab, setTab] = useState('activas');
  const [tareas, setTareas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [rechazando, setRechazando] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [terminando, setTerminando] = useState(null);
  const [notaTexto, setNotaTexto] = useState('');
  const pollingRef = useRef(null);

  const cargarTareas = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/tareas`, { headers, params: { historial: tab === 'historial' } });
      const datos = res.data || [];
      if (tab === 'historial') {
        setHistorial(datos);
      } else {
        setTareas(datos);
        setSinConexion(false);
        AsyncStorage.setItem(CLAVE_CACHE(userId), JSON.stringify({ datos, guardadoEn: Date.now() })).catch(() => {});
      }
    } catch (e) {
      if (tab === 'activas') {
        // Sin señal: mostrar la última lista guardada en vez de una pantalla vacía o un error.
        try {
          const cache = await AsyncStorage.getItem(CLAVE_CACHE(userId));
          if (cache) {
            const { datos, guardadoEn } = JSON.parse(cache);
            setTareas(datos);
            setSinConexion(true);
            setUltimaActualizacion(guardadoEn);
          }
        } catch (e2) {}
      }
    } finally {
      setCargando(false);
    }
  }, [userId, token, tab]);

  useEffect(() => {
    setCargando(true);
    cargarTareas();
    if (tab === 'activas') {
      pollingRef.current = setInterval(cargarTareas, 8000);
      return () => clearInterval(pollingRef.current);
    }
  }, [cargarTareas, tab]);

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
      setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, estado: nuevoEstado } : t));
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo actualizar la tarea'));
    } finally {
      setActualizando(null);
    }
  };

  const confirmarRechazo = async () => {
    if (!rechazando) return;
    setActualizando(rechazando.id);
    try {
      await axios.put(`${API}/tareas/${rechazando.id}/estado`, { estado: 'rechazada', motivo: motivoTexto.trim() || null }, { headers });
      setTareas(prev => prev.filter(t => t.id !== rechazando.id));
      setRechazando(null);
      setMotivoTexto('');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo rechazar la tarea'));
    } finally {
      setActualizando(null);
    }
  };

  const confirmarTerminar = async () => {
    if (!terminando) return;
    setActualizando(terminando.id);
    try {
      await axios.put(`${API}/tareas/${terminando.id}/estado`, { estado: 'terminada', nota: notaTexto.trim() || null }, { headers });
      setTareas(prev => prev.filter(t => t.id !== terminando.id));
      setTerminando(null);
      setNotaTexto('');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo completar la tarea'));
    } finally {
      setActualizando(null);
    }
  };

  const llamarEmpresa = (tarea) => {
    if (!tarea.empresa_telefono) {
      avisar('Sin teléfono', 'La empresa no tiene un teléfono cargado');
      return;
    }
    Linking.openURL(`tel:${tarea.empresa_telefono}`).catch(() => {});
  };

  const abrirChat = (tarea) => {
    navigation.navigate('TareaChat', { tareaId: tarea.id, otroNombre: tarea.nombre_empresa || 'Tu empresa' });
  };

  const listaVisible = tab === 'historial' ? historial : tareas;

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

      {sinConexion && tab === 'activas' && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.textMuted} />
          <Text style={s.offlineBannerText}>
            Sin conexión — {ultimaActualizacion ? `última actualización hace ${Math.max(1, Math.round((Date.now() - ultimaActualizacion) / 60000))} min` : 'mostrando lo último guardado'}
          </Text>
        </View>
      )}

      <View style={s.tabs}>
        <Pressable haptic onPress={() => setTab('activas')} style={s.tabItem}>
          <Text style={[s.tabText, tab === 'activas' && s.tabTextActiva]}>Activas</Text>
          {tab === 'activas' && <View style={s.tabIndicador} />}
        </Pressable>
        <Pressable haptic onPress={() => setTab('historial')} style={s.tabItem}>
          <Text style={[s.tabText, tab === 'historial' && s.tabTextActiva]}>Historial</Text>
          {tab === 'historial' && <View style={s.tabIndicador} />}
        </Pressable>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
        {cargando ? (
          <Text style={s.vacioSub}>Cargando…</Text>
        ) : listaVisible.length === 0 ? (
          <View style={s.vacio}>
            <View style={s.vacioIconWrap}>
              <Ionicons name={tab === 'historial' ? 'time-outline' : 'checkmark-done'} size={26} color={colors.green} />
            </View>
            <Text style={s.vacioTitulo}>{tab === 'historial' ? 'Todavía nada' : 'Al día'}</Text>
            <Text style={s.vacioSub}>{tab === 'historial' ? 'Acá vas a ver las tareas ya cerradas' : 'No tienes tareas pendientes de tu empresa'}</Text>
          </View>
        ) : (
          listaVisible.map((t, i) => {
            const info = ESTADO_INFO[t.estado] || ESTADO_INFO.pendiente;
            const fechaTexto = formatFechaTarea(t.fecha_objetivo);
            const enRechazo = rechazando?.id === t.id;
            const enTerminar = terminando?.id === t.id;
            return (
              <FadeInUp key={t.id} index={i}>
                <Glass style={[s.tareaCard, t.urgente && tab === 'activas' && s.tareaCardUrgente]}>
                  <View style={s.tareaHeader}>
                    {t.urgente && tab === 'activas' && (
                      <View style={s.urgentePill}>
                        <Ionicons name="alert-circle" size={11} color={colors.red} />
                        <Text style={s.urgentePillText}>Urgente</Text>
                      </View>
                    )}
                    <View style={[s.estadoPill, { backgroundColor: `${info.color}22` }]}>
                      <Ionicons name={info.icon} size={11} color={info.color} />
                      <Text style={[s.estadoPillText, { color: info.color }]}>{info.label}</Text>
                    </View>
                    {fechaTexto && (
                      <View style={s.fechaPill}>
                        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                        <Text style={s.fechaPillText}>{fechaTexto}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.tareaDescripcion}>{t.descripcion}</Text>

                  {tab === 'historial' && (t.nota_finalizacion || t.motivo_rechazo) && (
                    <View style={s.notaBox}>
                      <Text style={s.notaBoxLabel}>{t.estado === 'rechazada' ? 'Motivo' : 'Nota'}</Text>
                      <Text style={s.notaBoxTexto}>{t.nota_finalizacion || t.motivo_rechazo}</Text>
                    </View>
                  )}

                  {tab === 'activas' && enRechazo && (
                    <View style={s.panelInline}>
                      <TextInput
                        style={s.panelInput}
                        placeholder="¿Por qué no podés? (opcional)"
                        placeholderTextColor={colors.textFaint}
                        value={motivoTexto}
                        onChangeText={setMotivoTexto}
                        multiline
                      />
                      <View style={s.panelBotones}>
                        <Pressable haptic onPress={() => { setRechazando(null); setMotivoTexto(''); }} style={s.panelCancelar}>
                          <Text style={s.panelCancelarText}>Cancelar</Text>
                        </Pressable>
                        <Pressable haptic disabled={actualizando === t.id} onPress={confirmarRechazo} style={s.panelConfirmarRojo}>
                          <Text style={s.panelConfirmarText}>{actualizando === t.id ? '...' : 'Confirmar'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {tab === 'activas' && enTerminar && (
                    <View style={s.panelInline}>
                      <Text style={s.panelLabel}>¿Algo que el jefe deba saber? (opcional)</Text>
                      <TextInput
                        style={s.panelInput}
                        placeholder="Ej: se cambió tal cosa por tal otra..."
                        placeholderTextColor={colors.textFaint}
                        value={notaTexto}
                        onChangeText={setNotaTexto}
                        multiline
                      />
                      <View style={s.panelBotones}>
                        <Pressable haptic onPress={() => { setTerminando(null); setNotaTexto(''); }} style={s.panelCancelar}>
                          <Text style={s.panelCancelarText}>Cancelar</Text>
                        </Pressable>
                        <Pressable haptic disabled={actualizando === t.id} onPress={confirmarTerminar} style={s.panelConfirmarVerde}>
                          <Text style={s.panelConfirmarText}>{actualizando === t.id ? '...' : 'Terminar tarea'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {tab === 'activas' && !enRechazo && !enTerminar && (
                    <View style={s.accionesRow}>
                      {t.estado === 'pendiente' && (
                        <>
                          <Pressable haptic disabled={actualizando === t.id} onPress={() => avanzarEstado(t, 'aceptada')} style={{ flex: 1 }}>
                            <LinearGradient colors={[colors.accent, colors.accent2]} style={s.btnAccion}>
                              <Text style={s.btnAccionText}>{actualizando === t.id ? '...' : 'Aceptar'}</Text>
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </LinearGradient>
                          </Pressable>
                          <Pressable haptic disabled={actualizando === t.id} onPress={() => setRechazando(t)} style={s.btnNoPuedo}>
                            <Text style={s.btnNoPuedoText}>No puedo</Text>
                          </Pressable>
                        </>
                      )}
                      {t.estado === 'aceptada' && (
                        <Pressable haptic disabled={actualizando === t.id} onPress={() => avanzarEstado(t, 'en_camino')} style={[s.btnAccionOutline, { flex: 1 }]}>
                          <Text style={s.btnAccionOutlineText}>{actualizando === t.id ? '...' : 'Voy en camino'}</Text>
                          <Ionicons name="car-sport-outline" size={16} color={colors.accent2} />
                        </Pressable>
                      )}
                      {t.estado === 'en_camino' && (
                        <Pressable haptic disabled={actualizando === t.id} onPress={() => setTerminando(t)} style={{ flex: 1 }}>
                          <LinearGradient colors={[colors.green, colors.green]} style={s.btnAccion}>
                            <Text style={s.btnAccionText}>Marcar terminada</Text>
                            <Ionicons name="checkmark-done" size={16} color="#fff" />
                          </LinearGradient>
                        </Pressable>
                      )}
                      {t.estado !== 'pendiente' && (
                        <>
                          <Pressable haptic onPress={() => abrirChat(t)} style={s.iconBtn}>
                            <Ionicons name="chatbubble-outline" size={15} color={colors.text} />
                          </Pressable>
                          <Pressable haptic onPress={() => llamarEmpresa(t)} style={s.iconBtn}>
                            <Ionicons name="call-outline" size={15} color={colors.text} />
                          </Pressable>
                        </>
                      )}
                    </View>
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
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.glass, marginHorizontal: spacing.xl, marginTop: spacing.sm, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: spacing.md },
  offlineBannerText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600', flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.xl, paddingHorizontal: spacing.xl, marginTop: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  tabItem: { paddingBottom: spacing.sm },
  tabText: { color: colors.textFaint, fontSize: 13, fontWeight: '700' },
  tabTextActiva: { color: colors.text },
  tabIndicador: { height: 2, borderRadius: 2, backgroundColor: colors.accent, marginTop: 8 },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 40 },
  vacioIconWrap: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.greenGlass, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  vacioTitulo: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  vacioSub: { color: colors.textMuted, fontSize: 13.5 },
  tareaCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadow.md },
  tareaCardUrgente: { borderWidth: 1.3, borderColor: colors.red },
  tareaHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  urgentePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.redGlass },
  urgentePillText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', color: colors.red },
  estadoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  estadoPillText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  fechaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.glass },
  fechaPillText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },
  tareaDescripcion: { color: colors.text, fontSize: 14.5, lineHeight: 21, marginBottom: spacing.md },
  notaBox: { backgroundColor: colors.glass, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  notaBoxLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 3 },
  notaBoxTexto: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  accionesRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  btnAccion: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md },
  btnAccionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnAccionOutline: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.accent },
  btnAccionOutlineText: { color: colors.accent2, fontWeight: 'bold', fontSize: 14 },
  btnNoPuedo: { paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.redGlass },
  btnNoPuedoText: { color: colors.red, fontWeight: '700', fontSize: 13 },
  iconBtn: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  panelInline: { backgroundColor: colors.glass, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  panelLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  panelInput: { color: colors.text, fontSize: 13.5, minHeight: 56, backgroundColor: colors.bgCard2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, padding: spacing.sm, textAlignVertical: 'top' },
  panelBotones: { flexDirection: 'row', gap: spacing.sm },
  panelCancelar: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border2 },
  panelCancelarText: { color: colors.textMuted, fontWeight: '700', fontSize: 12.5 },
  panelConfirmarRojo: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', backgroundColor: colors.red },
  panelConfirmarVerde: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', backgroundColor: colors.green },
  panelConfirmarText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
});
