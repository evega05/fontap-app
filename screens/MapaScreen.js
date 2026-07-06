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

const SERVICIOS_FILTRO = ['Todos', 'Desatasco', 'Fuga', 'Caldera', 'Grifo', 'Radiador'];

export default function MapaScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const clienteId = route.params?.clienteId || usuario?.id || null;

  // --- State ---
  const [seleccionado, setSeleccionado] = useState(null);
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
      .get(`${API}/fontaneros`)
      .then((res) => setFontaneros(res.data || []))
      .catch(() => {})
      .finally(() => {
        setCargando(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    cargarFontaneros();
  }, [cargarFontaneros]);

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
      if (mostrar24h && !f.disponible24h) return false;
      return true;
    })
    .map((f) => {
      const km = (miUbicacion && f.latitud != null && f.longitud != null)
        ? distanciaKm(miUbicacion.latitud, miUbicacion.longitud, f.latitud, f.longitud)
        : null;
      return { ...f, distanciaKm: km, distancia: formatDistancia(km) || '—' };
    })
    .sort((a, b) => {
      if (a.distanciaKm == null && b.distanciaKm == null) return 0;
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });

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
          `${API}/clientes/${clienteId}/favoritos`,
          { fontanero_id: f.id },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        .catch(() => {});
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

  // --- Fontanero card ---
  const renderTarjetaFontanero = (f, index) => {
    const esVerificado = !!f.verificado;
    const isSelected = seleccionado?.id === f.id;

    return (
      <FadeInUp key={f.id} index={index}>
        <Pressable
          style={[s.card, !f.disponible && s.cardInactivo]}
          haptic
          onPress={() => {
            if (!f.disponible) return;
            setSeleccionado(isSelected ? null : f);
          }}
        >
          <Glass style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
          <View style={s.cardInner}>
            <View style={s.cardHeader}>
              <View style={s.avatarWrap}>
                {f.foto_url ? (
                  <Image source={{ uri: `${API}${f.foto_url}` }} style={[s.avatar, !f.disponible && s.avatarInactivo]} />
                ) : (
                  <View style={[s.avatar, !f.disponible && s.avatarInactivo]}>
                    <Text style={s.avatarText}>{f.nombre?.[0] || '?'}</Text>
                  </View>
                )}
                {f.disponible && <View style={s.avatarDot} />}
              </View>

              <View style={s.cardInfo}>
                <View style={s.cardNombreRow}>
                  <Text style={s.cardNombre}>{f.nombre}</Text>
                  {esVerificado && <Ionicons name="checkmark-circle" size={14} color={colors.accent2} />}
                </View>
                <View style={s.cardZonaRow}>
                  <Ionicons name="location" size={11} color={colors.textMuted} />
                  <Text style={s.cardZona}>{f.zona}</Text>
                  <Text style={s.cardStatDot}>·</Text>
                  <Text style={s.cardZona}>{f.distancia}</Text>
                </View>
                {f.valoracion ? (
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={12} color={colors.amber} />
                    <Text style={s.ratingVal}>{f.valoracion}</Text>
                  </View>
                ) : (
                  <View style={s.nuevoPill}>
                    <Ionicons name="sparkles" size={10} color={colors.accent2} />
                    <Text style={s.nuevoPillText}>Nuevo</Text>
                  </View>
                )}
              </View>

              <View style={s.cardRight}>
                <View style={[s.estadoBadge, f.disponible ? s.estadoVerde : s.estadoGris]}>
                  <Text style={[s.estadoText, f.disponible ? s.estadoTextVerde : s.estadoTextGris]}>
                    {f.disponible ? 'Libre' : `Hasta ${f.ocupadoHasta || '—'}`}
                  </Text>
                </View>
                {clienteId && (
                  <Pressable style={s.favBtn} haptic onPress={() => toggleFavorito(f)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={favoritos.includes(f.id) ? 'heart' : 'heart-outline'} size={19} color={favoritos.includes(f.id) ? colors.red : colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            {isSelected && f.disponible && (
              <View style={s.accionesRow}>
                <Pressable style={s.btnVerPerfil} haptic onPress={() => navigation.navigate('PerfilFontaneroPublico', { fontanero: f })}>
                  <Text style={s.btnVerPerfilText}>Ver perfil</Text>
                </Pressable>
                <Pressable style={{ flex: 1 }} haptic onPress={() => navigation.navigate('Solicitud', { fontanero: f, clienteId })}>
                  <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnContratar}>
                    <Text style={s.btnContratarText}>Contratar a {f.nombre?.split(' ')[0]}</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.text} />
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </FadeInUp>
    );
  };

  const DRAWER_ITEMS = [
    { icon: 'compass-outline', label: 'Explorar', action: () => { cerrarDrawer(); } },
    { icon: 'receipt-outline', label: 'Mis Servicios', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('MisServicios', { clienteId }), 250); } },
    { icon: 'heart-outline', label: 'Favoritos', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('Favoritos'), 250); } },
    { icon: 'notifications-outline', label: 'Notificaciones', badge: notifNoLeidas, action: () => { setNotifNoLeidas(0); cerrarDrawer(); setTimeout(() => navigation.navigate('Notificaciones'), 250); } },
    { icon: 'chatbubbles-outline', label: 'Chats recientes', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('ChatsRecientes'), 250); } },
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
              <Text style={s.drawerTipo}>Cliente</Text>
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
            <Text style={s.drawerItemLabelDanger}>Cerrar sesión</Text>
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
      <View style={s.mapArea}>
        <MapaFontaneros
          fontaneros={fontanerosFiltrados}
          miUbicacion={miUbicacion}
          seleccionado={seleccionado}
          onSelect={setSeleccionado}
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
                placeholder="Buscar fontanero o zona..."
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

        {ubicacionDenegada && (
          <View style={s.avisoUbicacionWrap}>
            <Glass style={s.avisoUbicacion} intensity={40}>
              <Ionicons name="information-circle-outline" size={14} color={colors.amber} />
              <Text style={s.avisoUbicacionText}>Activa la ubicación para ver distancias reales</Text>
            </Glass>
          </View>
        )}
      </View>

      {/* HOJA — filtros + acciones + lista */}
      <Glass strong style={s.sheet}>
        <View style={s.handle} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
          <Pressable style={[s.filtro24h, mostrar24h && s.filtro24hActivo]} haptic onPress={() => setMostrar24h(!mostrar24h)}>
            <Ionicons name="moon" size={12} color={mostrar24h ? colors.text : colors.textMuted} />
            <Text style={[s.filtro24hText, mostrar24h && s.filtro24hTextActivo]}>24h</Text>
          </Pressable>
          {SERVICIOS_FILTRO.map((sv) => (
            <Pressable key={sv} style={[s.filtro, filtroServicio === sv && s.filtroActivo]} haptic onPress={() => setFiltroServicio(sv)}>
              <Text style={[s.filtroText, filtroServicio === sv && s.filtroTextActivo]}>{sv}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.ctaRow}>
          <Pressable style={{ flex: 1 }} haptic onPress={() => navigation.navigate('Solicitud', { urgente: true, clienteId })}>
            <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaUrgente}>
              <Ionicons name="flash" size={16} color={colors.text} />
              <View>
                <Text style={s.ctaUrgenteText}>Urgente ahora</Text>
                <Text style={s.ctaUrgenteSub}>30-60 min</Text>
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable style={s.ctaCita} haptic onPress={() => navigation.navigate('Solicitud', { urgente: false, clienteId })}>
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <View>
              <Text style={s.ctaCitaText}>Reservar cita</Text>
              <Text style={s.ctaCitaSub}>Elige cuándo</Text>
            </View>
          </Pressable>
        </View>

        {cargando ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent2} />
            <Text style={s.loadingText}>Buscando fontaneros...</Text>
          </View>
        ) : (
          <ScrollView
            style={s.lista}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => cargarFontaneros(true)} tintColor={colors.accent2} colors={[colors.accent2]} progressBackgroundColor={colors.bg} />
            }
          >
            <Text style={s.listaLabel}>FONTANEROS CERCANOS</Text>
            {fontanerosFiltrados.length === 0 ? (
              <View style={s.vacio}>
                <View style={s.vacioIconWrap}>
                  <Ionicons name="water-outline" size={34} color={colors.textMuted} />
                </View>
                <Text style={s.vacioTitulo}>Sin fontaneros disponibles</Text>
                <Text style={s.vacioSub}>Prueba cambiando los filtros o desliza para actualizar.</Text>
                <Pressable style={s.vacioBtn} haptic onPress={() => { setFiltroServicio('Todos'); setBusqueda(''); setMostrar24h(false); }}>
                  <Text style={s.vacioBtnText}>Limpiar filtros</Text>
                </Pressable>
              </View>
            ) : (
              fontanerosFiltrados.map((f, i) => renderTarjetaFontanero(f, i))
            )}
          </ScrollView>
        )}
      </Glass>

      {renderDrawer()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  mapArea: { height: '55%', position: 'relative' },
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

  sheet: {
    flex: 1, borderRadius: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -22, borderWidth: 0, borderTopWidth: 1, borderColor: colors.glassBorder,
    paddingTop: spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: colors.glassBorderStrong, alignSelf: 'center', marginBottom: spacing.md },

  filtrosScroll: { maxHeight: 42, marginBottom: spacing.md },
  filtrosContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  filtro: { backgroundColor: colors.glass, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 8, borderWidth: 1, borderColor: colors.glassBorder },
  filtroActivo: { backgroundColor: colors.accent2, borderColor: colors.accent2 },
  filtroText: { color: colors.textMuted, ...type.caption },
  filtroTextActivo: { color: colors.text, fontWeight: '700' },
  filtro24h: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.glass, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 8, borderWidth: 1, borderColor: colors.glassBorder },
  filtro24hActivo: { backgroundColor: colors.purple, borderColor: colors.purple },
  filtro24hText: { color: colors.textMuted, ...type.caption },
  filtro24hTextActivo: { color: colors.text, fontWeight: '700' },

  ctaRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  ctaUrgente: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadow.glow(colors.accent2) },
  ctaUrgenteText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  ctaUrgenteSub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  ctaCita: { flex: 1, backgroundColor: colors.glass, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  ctaCitaText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  ctaCitaSub: { color: colors.textMuted, fontSize: 10 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.textMuted, fontSize: 14 },

  lista: { flex: 1, paddingHorizontal: spacing.lg },
  listaLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.md },

  vacio: { alignItems: 'center', paddingTop: 30, paddingHorizontal: spacing.xl },
  vacioIconWrap: { width: 76, height: 76, borderRadius: radius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  vacioTitulo: { color: colors.text, ...type.h2, marginBottom: spacing.sm, textAlign: 'center' },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  vacioBtn: { backgroundColor: colors.glass, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.glassBorder },
  vacioBtnText: { color: colors.accent2, fontWeight: '700', fontSize: 14 },

  card: { borderRadius: radius.lg, marginBottom: spacing.md, position: 'relative' },
  cardInner: { padding: spacing.lg },
  cardInactivo: { opacity: 0.45 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrap: { position: 'relative', marginRight: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  avatarInactivo: { backgroundColor: colors.glassStrong },
  avatarText: { color: colors.text, fontWeight: 'bold', fontSize: 19 },
  avatarDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.bg },
  cardInfo: { flex: 1 },
  cardNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardNombre: { color: colors.text, ...type.h3 },
  cardZonaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardZona: { color: colors.textMuted, fontSize: 12 },
  cardStatDot: { color: colors.textFaint, fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingVal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  nuevoPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.purpleGlass, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  nuevoPillText: { color: colors.accent2, fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: spacing.sm, marginLeft: spacing.sm },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  estadoVerde: { backgroundColor: colors.greenGlass },
  estadoGris: { backgroundColor: colors.glass },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextVerde: { color: colors.green },
  estadoTextGris: { color: colors.textMuted },
  favBtn: { padding: 2 },
  accionesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  btnVerPerfil: { backgroundColor: colors.glass, borderRadius: radius.md, padding: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  btnVerPerfilText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnContratar: { flexDirection: 'row', borderRadius: radius.md, padding: 13, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnContratarText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },

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
