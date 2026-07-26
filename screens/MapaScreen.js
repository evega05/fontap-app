import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as Location from 'expo-location';
import { colors, spacing, radius, type, shadow } from '../theme';
import { useAuth } from '../AuthContext';
import MapaFontaneros from './MapComponent';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';
import { useIdioma } from '../i18n';

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistancia(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const API = 'https://fontap-backend-production.up.railway.app';
const DRAWER_WIDTH = 288;
const SELECTED_FLOAT_WIDTH = 250;
const SELECTED_FLOAT_HEIGHT = 176;

export const CIUDADES = [
  { valor: 'Bilbao', lat: 43.2630, lon: -2.9350 },
  { valor: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { valor: 'Barcelona', lat: 41.3851, lon: 2.1734 },
  { valor: 'Valencia', lat: 39.4699, lon: -0.3763 },
  { valor: 'Sevilla', lat: 37.3891, lon: -5.9845 },
];

export default function MapaScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const { t } = useIdioma();
  const clienteId = route.params?.clienteId || usuario?.id || null;
  const [ciudad, setCiudad] = useState('Bilbao');
  const [filtroGremio, setFiltroGremio] = useState('');
  const [orden, setOrden] = useState('cercania'); // cercania | valoracion | precio
  const [valoracionMinima, setValoracionMinima] = useState(0); // 0 = sin filtro

  // --- State ---
  const [seleccionado, setSeleccionado] = useState(null);
  const [pinPos, setPinPos] = useState(null);
  const [mapAreaSize, setMapAreaSize] = useState({ width: 0, height: 0 });
  const [fontaneros, setFontaneros] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [mostrar24h, setMostrar24h] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [notifNoLeidas, setNotifNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [ubicacionDenegada, setUbicacionDenegada] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setUbicacionDenegada(true); return; }
        const pos = await Location.getCurrentPositionAsync({});
        setMiUbicacion({ latitud: pos.coords.latitude, longitud: pos.coords.longitude });
      } catch (e) {
        setUbicacionDenegada(true);
      }
    })();
  }, []);

  // La pantalla de "Profesionales cercanos" tiene sus propios controles de filtro (más
  // espacio ahí que en esta hoja); al volver, manda los valores elegidos aquí para que
  // el mapa muestre los mismos pines filtrados.
  useEffect(() => {
    const f = route.params?.filtrosActualizados;
    if (!f) return;
    if (f.ciudad !== undefined) setCiudad(f.ciudad);
    if (f.filtroGremio !== undefined) setFiltroGremio(f.filtroGremio);
    if (f.orden !== undefined) setOrden(f.orden);
    if (f.mostrar24h !== undefined) setMostrar24h(f.mostrar24h);
    if (f.valoracionMinima !== undefined) setValoracionMinima(f.valoracionMinima);
    navigation.setParams({ filtrosActualizados: undefined });
  }, [route.params?.filtrosActualizados]);

  // --- Drawer animation ---
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const abrirDrawer = () => {
    setDrawerAbierto(true);
    Animated.parallel([
      Animated.spring(drawerX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const cerrarDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerX, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerAbierto(false));
  };

  // --- Load fontaneros ---
  const cargarFontaneros = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCargando(true);
    axios
      .get(`${API}/fontaneros`, { params: { ...(filtroGremio ? { gremio: filtroGremio } : {}), ciudad, ...(clienteId ? { cliente_id: clienteId } : {}) }, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => { setFontaneros(res.data || []); setErrorCarga(false); })
      .catch(() => { setFontaneros([]); setErrorCarga(true); })
      .finally(() => {
        setCargando(false);
        setRefreshing(false);
      });
  }, [filtroGremio, ciudad, clienteId, token]);

  const centroCiudad = CIUDADES.find((c) => c.valor === ciudad);
  const centroForzado = centroCiudad ? { latitud: centroCiudad.lat, longitud: centroCiudad.lon } : null;

  useEffect(() => {
    cargarFontaneros();
  }, [cargarFontaneros]);

  // Al cambiar de gremio, el sub-filtro de tipo de servicio ya no es válido
  useEffect(() => {
    setFiltroServicio('Todos');
  }, [filtroGremio]);

  // --- Load notifications + favorites ---
  const cargarNotifs = useCallback(() => {
    const hds = token ? { Authorization: `Bearer ${token}` } : {};
    if (!clienteId) return;
    axios
      .get(`${API}/clientes/${clienteId}/favoritos`, { headers: hds })
      .then((res) => setFavoritos((res.data || []).map((f) => f.id)))
      .catch(() => {});
    axios
      .get(`${API}/usuarios/${clienteId}/notificaciones`, { headers: hds })
      .then((res) => setNotifNoLeidas((res.data || []).filter((n) => !n.leida).length))
      .catch(() => {});
  }, [clienteId, token]);

  useEffect(() => {
    cargarNotifs();
  }, [cargarNotifs]);

  useFocusEffect(useCallback(() => {
    cargarNotifs();
  }, [cargarNotifs]));

  // --- Filter + real distance ---
  const fontanerosFiltrados = fontaneros
    .filter((f) => {
      if (
        busqueda &&
        !f.nombre?.toLowerCase().includes(busqueda.toLowerCase()) &&
        !f.zona?.toLowerCase().includes(busqueda.toLowerCase())
      )
        return false;
      if (filtroServicio !== 'Todos' && f.servicios && !f.servicios.includes(filtroServicio))
        return false;
      if (mostrar24h && !f.disponible_24h) return false;
      if (valoracionMinima > 0 && (f.valoracion == null || f.valoracion < valoracionMinima)) return false;
      return true;
    })
    .map((f) => {
      const km = (miUbicacion && f.latitud != null && f.longitud != null)
        ? distanciaKm(miUbicacion.latitud, miUbicacion.longitud, f.latitud, f.longitud)
        : null;
      return { ...f, distanciaKm: km, distancia: formatDistancia(km) || '—' };
    })
    .sort((a, b) => {
      if (orden === 'valoracion') {
        if (a.valoracion == null && b.valoracion == null) return 0;
        if (a.valoracion == null) return 1;
        if (b.valoracion == null) return -1;
        return b.valoracion - a.valoracion;
      }
      if (orden === 'precio') {
        if (a.precio_desde == null && b.precio_desde == null) return 0;
        if (a.precio_desde == null) return 1;
        if (b.precio_desde == null) return -1;
        return a.precio_desde - b.precio_desde;
      }
      if (a.distanciaKm == null && b.distanciaKm == null) return 0;
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });

  if (seleccionado) {
    const idx = fontanerosFiltrados.findIndex((f) => f.id === seleccionado.id);
    if (idx > 0) fontanerosFiltrados.unshift(fontanerosFiltrados.splice(idx, 1)[0]);
  }

  const disponiblesCount = fontanerosFiltrados.filter((f) => f.disponible).length;

  // --- Toggle favorite ---
  const toggleFavorito = (f) => {
    const esFav = favoritos.includes(f.id);
    if (esFav) {
      setFavoritos((prev) => prev.filter((id) => id !== f.id));
      axios
        .delete(`${API}/clientes/${clienteId}/favoritos/${f.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        .catch(() => {});
    } else {
      setFavoritos((prev) => [...prev, f.id]);
      axios
        .post(
          `${API}/clientes/${clienteId}/favoritos/${f.id}`,
          null,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        .catch(() => {});
    }
  };

  // --- Iniciar chat con un fontanero (crea un servicio "Consulta" para poder mandar mensajes) ---
  const [iniciandoChat, setIniciandoChat] = useState(false);
  const iniciarChat = async (f) => {
    if (iniciandoChat) return;
    setIniciandoChat(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API}/servicios`,
        { tipo: 'Consulta', urgente: false, fontanero_id: f.id, es_consulta: true },
        { params: { cliente_id: clienteId }, headers }
      );
      navigation.navigate('Chat', { servicioId: res.data.id, otroNombre: f.nombre });
    } catch (e) {
      console.log('[Mapa] Error al iniciar chat:', e.message);
    } finally {
      setIniciandoChat(false);
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    cerrarDrawer();
    setTimeout(() => {
      logout();
      navigation.replace('Login');
    }, 300);
  };

  const DRAWER_ITEMS = [
    { icon: 'compass-outline', label: t('explorar'), action: () => { cerrarDrawer(); } },
    { icon: 'receipt-outline', label: t('misServicios'), action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('MisServicios', { clienteId }), 250); } },
    { icon: 'heart-outline', label: t('favoritos'), action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('Favoritos'), 250); } },
    { icon: 'notifications-outline', label: t('notificaciones'), badge: notifNoLeidas, action: () => { setNotifNoLeidas(0); cerrarDrawer(); setTimeout(() => navigation.navigate('Notificaciones'), 250); } },
    { icon: 'chatbubbles-outline', label: t('chatsRecientes'), action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('ChatsRecientes'), 250); } },
    { icon: 'document-text-outline', label: t('terminos'), action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('Terminos'), 250); } },
    { icon: 'settings-outline', label: t('miCuenta'), action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('AjustesCuenta'), 250); } },
  ];

  const renderDrawer = () => (
    <>
      {drawerAbierto && (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrarDrawer}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020610', opacity: overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) }]} />
        </TouchableOpacity>
      )}
      <Animated.View style={[s.drawerWrap, { transform: [{ translateX: drawerX }] }]}>
        <Glass strong style={s.drawer}>
          <View style={s.drawerUserBlock}>
            <LinearGradient colors={[colors.accent, colors.accent2]} style={s.drawerAvatar}>
              <Text style={s.drawerAvatarText}>{usuario?.nombre?.[0]?.toUpperCase() || 'U'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.drawerNombre} numberOfLines={1}>{usuario?.nombre || 'Usuario'}</Text>
              <Text style={s.drawerTipo}>{t('cliente')}</Text>
            </View>
          </View>

          <View style={s.drawerSep} />

          {DRAWER_ITEMS.map((item, idx) => (
            <Pressable key={idx} style={s.drawerItem} haptic onPress={item.action}>
              <View style={s.drawerItemIconWrap}>
                <Ionicons name={item.icon} size={20} color={colors.text} />
              </View>
              <Text style={s.drawerItemLabel}>{item.label}</Text>
              {item.badge > 0 && (
                <View style={s.drawerBadge}>
                  <Text style={s.drawerBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}

          <View style={s.drawerSep} />

          <Pressable style={s.drawerItemDanger} haptic onPress={handleLogout}>
            <View style={[s.drawerItemIconWrap, s.drawerItemIconWrapDanger]}>
              <Ionicons name="log-out-outline" size={20} color={colors.red} />
            </View>
            <Text style={s.drawerItemLabelDanger}>{t('cerrarSesion')}</Text>
          </Pressable>
        </Glass>
      </Animated.View>
    </>
  );

  return (
    <View style={s.container}>
      <GradientBg />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* MAPA — siempre visible arriba */}
      <View style={s.mapArea} onLayout={(e) => setMapAreaSize(e.nativeEvent.layout)}>
        <MapaFontaneros
          fontaneros={fontanerosFiltrados}
          miUbicacion={miUbicacion}
          centroForzado={centroForzado}
          seleccionado={seleccionado}
          onSelect={setSeleccionado}
          onPinPosition={setPinPos}
        />

        {/* Fila flotante de vidrio sobre el mapa */}
        <View style={s.floatRow} pointerEvents="box-none">
          <Pressable style={s.floatCircle} haptic onPress={abrirDrawer}>
            <Glass style={StyleSheet.absoluteFill} intensity={45} />
            <Ionicons name="menu" size={20} color={colors.text} />
          </Pressable>

          {mostrarBusqueda ? (
            <Glass style={s.floatSearch} intensity={45}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={s.floatSearchInput}
                placeholder="Buscar profesional o zona..."
                placeholderTextColor={colors.textFaint}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setBusqueda(''); setMostrarBusqueda(false); }}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </Glass>
          ) : (
            <View style={s.floatOnlineWrap}>
              <Glass style={s.floatOnline} intensity={45}>
                <View style={s.onlineDot} />
                <Text style={s.floatOnlineText}>{disponiblesCount} en línea ahora</Text>
              </Glass>
            </View>
          )}

          {!mostrarBusqueda && (
            <Pressable style={s.floatCircle} haptic onPress={() => setMostrarBusqueda(true)}>
              <Glass style={StyleSheet.absoluteFill} intensity={45} />
              <Ionicons name="search" size={18} color={colors.text} />
            </Pressable>
          )}

          <Pressable style={s.floatCircle} haptic onPress={() => { setNotifNoLeidas(0); navigation.navigate('Notificaciones'); }}>
            <Glass style={StyleSheet.absoluteFill} intensity={45} />
            <Ionicons name="notifications-outline" size={18} color={colors.text} />
            {notifNoLeidas > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{notifNoLeidas > 9 ? '9+' : notifNoLeidas}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {seleccionado && (
          <View
            style={[
              s.selectedFloatWrap,
              pinPos && mapAreaSize.width > 0
                ? {
                    left: Math.min(
                      Math.max(pinPos.x - SELECTED_FLOAT_WIDTH / 2, 8),
                      mapAreaSize.width - SELECTED_FLOAT_WIDTH - 8
                    ),
                    top: Math.max(pinPos.y - SELECTED_FLOAT_HEIGHT - 26, 8),
                    right: undefined,
                    bottom: undefined,
                    width: SELECTED_FLOAT_WIDTH,
                  }
                : null,
            ]}
            pointerEvents="box-none"
          >
            <Glass strong style={s.selectedFloat}>
              <View style={s.selectedFloatTop}>
                {seleccionado.foto_url ? (
                  <Image source={{ uri: `${API}${seleccionado.foto_url}` }} style={s.selectedFloatAvatar} />
                ) : (
                  <View style={[s.selectedFloatAvatar, s.selectedFloatAvatarPlaceholder]}>
                    <Text style={s.selectedFloatAvatarText}>{seleccionado.nombre?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedFloatNombre} numberOfLines={1}>{seleccionado.nombre}</Text>
                  <Text style={s.selectedFloatMeta} numberOfLines={1}>
                    {seleccionado.valoracion ? `⭐ ${seleccionado.valoracion} · ` : ''}{seleccionado.zona}
                  </Text>
                </View>
                <Pressable haptic onPress={() => setSeleccionado(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={s.selectedFloatRow}>
                <Pressable style={s.selectedFloatIconBtn} haptic onPress={() => navigation.navigate('PerfilFontaneroPublico', { fontanero: seleccionado })}>
                  <Ionicons name="person-outline" size={16} color={colors.text} />
                </Pressable>
                <Pressable style={s.selectedFloatIconBtn} haptic onPress={() => iniciarChat(seleccionado)}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
                </Pressable>
                {seleccionado.telefono && (
                  <Pressable style={s.selectedFloatIconBtn} haptic onPress={() => Linking.openURL(`tel:${seleccionado.telefono}`)}>
                    <Ionicons name="call" size={16} color={colors.text} />
                  </Pressable>
                )}
              </View>

              {seleccionado.disponible && (
                <Pressable haptic onPress={() => navigation.navigate('Solicitud', { fontanero: seleccionado, clienteId })}>
                  <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.selectedFloatContratar}>
                    <Text style={s.selectedFloatContratarText}>Contratar</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.text} />
                  </LinearGradient>
                </Pressable>
              )}
            </Glass>
            <View style={s.selectedFloatArrow} />
          </View>
        )}

        {ubicacionDenegada && !seleccionado && (
          <View style={s.avisoUbicacionWrap}>
            <Glass style={s.avisoUbicacion} intensity={40}>
              <Ionicons name="information-circle-outline" size={14} color={colors.amber} />
              <Text style={s.avisoUbicacionText}>Activa la ubicación para ver distancias reales</Text>
            </Glass>
          </View>
        )}
      </View>

      {/* HOJA — acciones rápidas; los filtros y la lista de profesionales viven en su
          propia pantalla con más espacio (ver ListaProfesionalesScreen) */}
      <Glass strong style={s.sheet}>
        <View style={s.handle} />

        <View style={s.ctaRow}>
          <Pressable style={{ flex: 1 }} haptic onPress={() => navigation.navigate('Solicitud', { urgente: true, clienteId, ciudad })}>
            <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaUrgente}>
              <Ionicons name="flash" size={16} color={colors.text} />
              <View>
                <Text style={s.ctaUrgenteText}>{t('urgenteAhora')}</Text>
                <Text style={s.ctaUrgenteSub}>{t('urgenteSub')}</Text>
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable style={s.ctaCita} haptic onPress={() => navigation.navigate('Solicitud', { urgente: false, clienteId, ciudad })}>
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <View>
              <Text style={s.ctaCitaText}>{t('reservarCita')}</Text>
              <Text style={s.ctaCitaSub}>{t('citaSub')}</Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          style={s.verListaBtn}
          haptic
          onPress={() => navigation.navigate('ListaProfesionales', {
            ciudad, filtroGremio, orden, mostrar24h, valoracionMinima, clienteId, miUbicacion,
          })}
        >
          <View style={s.verListaIconWrap}>
            <Ionicons name="people" size={18} color={colors.accent2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.verListaTitulo}>{t('profesionalesCercanos')}</Text>
            <Text style={s.verListaSub}>
              {cargando ? 'Buscando...' : `${fontanerosFiltrados.length} disponible${fontanerosFiltrados.length === 1 ? '' : 's'} en ${ciudad}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </Glass>

      {renderDrawer()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  mapArea: { height: '72%', position: 'relative' },
  floatRow: {
    position: 'absolute', top: 52, left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  floatCircle: {
    width: 42, height: 42, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
    ...shadow.sm,
  },
  floatSearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  floatSearchInput: { flex: 1, color: colors.text, fontSize: 14 },
  floatOnlineWrap: { flex: 1 },
  floatOnline: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: spacing.md, paddingVertical: 10, alignSelf: 'flex-start',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  floatOnlineText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: colors.red,
    borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.bg,
  },
  notifBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  avisoUbicacionWrap: { position: 'absolute', bottom: 14, left: spacing.lg, right: spacing.lg },
  avisoUbicacion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8 },
  avisoUbicacionText: { color: colors.text, fontSize: 10.5, flex: 1 },

  selectedFloatWrap: { position: 'absolute', bottom: 14, left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  selectedFloat: { width: '100%', padding: spacing.sm, gap: spacing.sm, ...shadow.md },
  selectedFloatTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectedFloatAvatar: { width: 36, height: 36, borderRadius: 18 },
  selectedFloatAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  selectedFloatAvatarText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  selectedFloatNombre: { color: colors.text, fontWeight: '700', fontSize: 13 },
  selectedFloatMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  selectedFloatRow: { flexDirection: 'row', gap: spacing.sm },
  selectedFloatIconBtn: {
    flex: 1, height: 34, borderRadius: radius.sm, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.glassBorder, justifyContent: 'center', alignItems: 'center',
  },
  selectedFloatContratar: {
    flexDirection: 'row', borderRadius: radius.sm, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  selectedFloatContratarText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  selectedFloatArrow: {
    width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(28,31,42,0.9)',
    marginTop: -1,
  },

  sheet: {
    borderRadius: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -22, borderWidth: 0, borderTopWidth: 1, borderColor: colors.glassBorder,
    paddingTop: spacing.sm, paddingBottom: spacing.xl,
  },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: colors.glassBorderStrong, alignSelf: 'center', marginBottom: spacing.md },

  ctaRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  ctaUrgente: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadow.glow(colors.accent2) },
  ctaUrgenteText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  ctaUrgenteSub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  ctaCita: { flex: 1, backgroundColor: colors.glass, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  ctaCitaText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  ctaCitaSub: { color: colors.textMuted, fontSize: 10 },

  verListaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.xl,
    backgroundColor: colors.glass, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  verListaIconWrap: {
    width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.purpleGlass,
    justifyContent: 'center', alignItems: 'center',
  },
  verListaTitulo: { color: colors.text, fontWeight: '700', fontSize: 15 },
  verListaSub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },

  drawerWrap: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 100 },
  drawer: { flex: 1, borderRadius: 0, borderTopRightRadius: radius.xl, borderBottomRightRadius: radius.xl, borderWidth: 0, borderRightWidth: 1, borderColor: colors.glassBorder, paddingTop: 60, paddingBottom: 32, ...shadow.lg },
  drawerUserBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  drawerAvatar: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', ...shadow.glow(colors.accent2) },
  drawerAvatarText: { color: colors.text, fontWeight: '800', fontSize: 22 },
  drawerNombre: { color: colors.text, fontWeight: '700', fontSize: 16 },
  drawerTipo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  drawerSep: { height: 1, backgroundColor: colors.glassBorder, marginHorizontal: spacing.xl, marginVertical: spacing.md },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  drawerItemIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  drawerItemIconWrapDanger: { backgroundColor: colors.redGlass },
  drawerItemLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  drawerBadge: { backgroundColor: colors.red, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  drawerBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  drawerItemDanger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md, marginTop: 4 },
  drawerItemLabelDanger: { flex: 1, color: colors.red, fontSize: 15, fontWeight: '600' },
});
