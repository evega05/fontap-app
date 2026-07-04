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
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';

const API = 'https://fontap-backend-production.up.railway.app';
const DRAWER_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SERVICIOS_FILTRO = ['Todos', 'Desatasco', 'Fuga', 'Caldera', 'Grifo', 'Radiador'];

const BADGES = {
  top: { emoji: '⭐', label: 'Mejor valorado', color: '#F5A623' },
  rapido: { emoji: '⚡', label: 'Más rápido', color: colors.blue },
  popular: { emoji: '🔥', label: 'Popular', color: '#E74C3C' },
};

// --- Animated pulsing dot component ---
function PulsingDot({ color = colors.green, size = 10 }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          backgroundColor: color + '44',
          transform: [{ scale: pulse }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// --- Star rating row ---
function StarRating({ value = 0, total = 5 }) {
  const stars = [];
  for (let i = 1; i <= total; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: 11, color: i <= Math.round(value) ? '#F5A623' : colors.textFaint }}>
        {i <= Math.round(value) ? '★' : '☆'}
      </Text>
    );
  }
  return <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>{stars}</View>;
}

export default function MapaScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const clienteId = route.params?.clienteId || usuario?.id || null;

  // --- State ---
  const [seleccionado, setSeleccionado] = useState(null);
  const [fontaneros, setFontaneros] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrar24h, setMostrar24h] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [notifNoLeidas, setNotifNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

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

  // --- Filter ---
  const fontanerosFiltrados = fontaneros.filter((f) => {
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
  const renderTarjetaFontanero = (f) => {
    const esVerificado = (f.trabajos_completados || 0) >= 50;
    const isSelected = seleccionado?.id === f.id;

    return (
      <TouchableOpacity
        key={f.id}
        style={[
          s.card,
          !f.disponible && s.cardInactivo,
          isSelected && s.cardActiva,
        ]}
        activeOpacity={0.85}
        onPress={() => {
          if (!f.disponible) return;
          setSeleccionado(isSelected ? null : f);
        }}
      >
        {/* Card header */}
        <View style={s.cardHeader}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={[s.avatar, !f.disponible && s.avatarInactivo]}>
              <Text style={s.avatarText}>{f.nombre?.[0] || '?'}</Text>
            </View>
            {f.disponible && (
              <View style={s.avatarDotWrap}>
                <PulsingDot color={colors.green} size={8} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={s.cardInfo}>
            <View style={s.cardNombreRow}>
              <Text style={s.cardNombre}>{f.nombre}</Text>
              {esVerificado && (
                <View style={s.verifiedBadge}>
                  <Text style={s.verifiedBadgeText}>VERIFICADO ✓</Text>
                </View>
              )}
            </View>

            {f.badge && BADGES[f.badge] && (
              <View
                style={[
                  s.badgePill,
                  {
                    backgroundColor: BADGES[f.badge].color + '22',
                    borderColor: BADGES[f.badge].color,
                    alignSelf: 'flex-start',
                    marginBottom: 4,
                  },
                ]}
              >
                <Text style={[s.badgePillText, { color: BADGES[f.badge].color }]}>
                  {BADGES[f.badge].emoji} {BADGES[f.badge].label}
                </Text>
              </View>
            )}

            <Text style={s.cardZona}>
              📍 {f.zona} · 🚶 {f.distancia}
            </Text>

            {/* Stars + valoracion */}
            <View style={s.ratingRow}>
              <StarRating value={f.valoracion} />
              <Text style={s.ratingVal}>{f.valoracion}</Text>
              <Text style={s.cardStatDot}>·</Text>
              <Text style={s.cardStat}>💰 {f.precio}</Text>
            </View>

            {/* Tiempo de respuesta */}
            {f.llegada && (
              <View style={s.llegadaRow}>
                <Text style={s.llegadaIcon}>🕐</Text>
                <Text style={s.llegadaText}>{f.llegada}</Text>
                <Text style={s.llegadaLabel}> estimado</Text>
              </View>
            )}
          </View>

          {/* Right col */}
          <View style={s.cardRight}>
            <View
              style={[s.estadoBadge, f.disponible ? s.estadoVerde : s.estadoGris]}
            >
              <Text
                style={[
                  s.estadoText,
                  f.disponible ? s.estadoTextVerde : s.estadoTextGris,
                ]}
              >
                {f.disponible ? 'Libre' : `Hasta ${f.ocupadoHasta || '—'}`}
              </Text>
            </View>
            {clienteId && (
              <TouchableOpacity
                style={s.favBtn}
                onPress={() => toggleFavorito(f)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.favBtnText}>
                  {favoritos.includes(f.id) ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Service tags */}
        {f.servicios && (
          <View style={s.serviciosRow}>
            {f.servicios.map((sv) => (
              <View
                key={sv}
                style={[
                  s.servicioTag,
                  filtroServicio === sv && s.servicioTagActivo,
                ]}
              >
                <Text
                  style={[
                    s.servicioTagText,
                    filtroServicio === sv && s.servicioTagTextActivo,
                  ]}
                >
                  {sv}
                </Text>
              </View>
            ))}
            {f.disponible24h && (
              <View style={s.tag24h}>
                <Text style={s.tag24hText}>🌙 24h</Text>
              </View>
            )}
          </View>
        )}

        {/* Expand: contratar + chat */}
        {isSelected && f.disponible && (
          <View style={s.accionesRow}>
            <TouchableOpacity
              style={s.btnContratar}
              onPress={() =>
                navigation.navigate('Solicitud', { fontanero: f, clienteId })
              }
            >
              <Text style={s.btnContratarText}>
                Contratar a {f.nombre?.split(' ')[0]} →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnChat}
              onPress={() =>
                navigation.navigate('Chat', { fontanero: f, clienteId })
              }
            >
              <Text style={s.btnChatText}>💬</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // --- Drawer ---
  const renderDrawer = () => (
    <>
      {/* Overlay */}
      {drawerAbierto && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={cerrarDrawer}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#000', opacity: overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) },
            ]}
          />
        </TouchableOpacity>
      )}

      {/* Drawer panel */}
      <Animated.View
        style={[s.drawer, { transform: [{ translateX: drawerX }] }]}
      >
        {/* User block */}
        <View style={s.drawerUserBlock}>
          <View style={s.drawerAvatar}>
            <Text style={s.drawerAvatarText}>
              {usuario?.nombre?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.drawerNombre} numberOfLines={1}>
              {usuario?.nombre || 'Usuario'}
            </Text>
            <Text style={s.drawerTipo}>Cliente</Text>
          </View>
        </View>

        <View style={s.drawerSep} />

        {/* Nav options */}
        {[
          {
            icon: '🗺️',
            label: 'Explorar',
            action: () => { cerrarDrawer(); },
          },
          {
            icon: '📋',
            label: 'Mis Servicios',
            action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('MisServicios', { clienteId }), 250); },
          },
          {
            icon: '❤️',
            label: 'Favoritos',
            action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('Favoritos'), 250); },
          },
          {
            icon: '🔔',
            label: 'Notificaciones',
            badge: notifNoLeidas,
            action: () => { setNotifNoLeidas(0); cerrarDrawer(); setTimeout(() => navigation.navigate('Notificaciones'), 250); },
          },
          {
            icon: '💬',
            label: 'Chats recientes',
            action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('MisServicios', { clienteId }), 250); },
          },
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={s.drawerItem}
            activeOpacity={0.7}
            onPress={item.action}
          >
            <Text style={s.drawerItemIcon}>{item.icon}</Text>
            <Text style={s.drawerItemLabel}>{item.label}</Text>
            {item.badge > 0 && (
              <View style={s.drawerBadge}>
                <Text style={s.drawerBadgeText}>
                  {item.badge > 9 ? '9+' : item.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={s.drawerSep} />

        {/* Danger zone */}
        <TouchableOpacity style={s.drawerItemDanger} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={s.drawerItemIcon}>🚪</Text>
          <Text style={s.drawerItemLabelDanger}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );

  // --- Main render ---
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* HEADER */}
      <View style={s.header}>
        {/* Menu button */}
        <TouchableOpacity style={s.menuBtn} onPress={abrirDrawer} activeOpacity={0.7}>
          <View style={s.menuLine} />
          <View style={[s.menuLine, { width: 16 }]} />
          <View style={s.menuLine} />
        </TouchableOpacity>

        {/* Title + online count */}
        <View style={s.headerCenter}>
          <Text style={s.logo}>🔥 FonTap TEST</Text>
          <View style={s.onlineRow}>
            <PulsingDot color={colors.green} size={7} />
            <Text style={s.onlineText}>
              {disponiblesCount} en línea ahora
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => {
            setNotifNoLeidas(0);
            navigation.navigate('Notificaciones');
          }}
        >
          <Text style={s.iconBtnText}>🔔</Text>
          {notifNoLeidas > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>
                {notifNoLeidas > 9 ? '9+' : notifNoLeidas}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar fontanero o zona..."
          placeholderTextColor={colors.textFaint}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda ? (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* FILTERS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtrosScroll}
        contentContainerStyle={s.filtrosContent}
      >
        <TouchableOpacity
          style={[s.filtro24h, mostrar24h && s.filtro24hActivo]}
          onPress={() => setMostrar24h(!mostrar24h)}
        >
          <Text style={[s.filtro24hText, mostrar24h && s.filtro24hTextActivo]}>
            🌙 24h
          </Text>
        </TouchableOpacity>
        {SERVICIOS_FILTRO.map((sv) => (
          <TouchableOpacity
            key={sv}
            style={[s.filtro, filtroServicio === sv && s.filtroActivo]}
            onPress={() => setFiltroServicio(sv)}
          >
            <Text
              style={[s.filtroText, filtroServicio === sv && s.filtroTextActivo]}
            >
              {sv}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* URGENCY BUTTONS */}
      <View style={s.botonesUrgencia}>
        <TouchableOpacity
          style={s.btnUrgente}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Solicitud', { urgente: true, clienteId })
          }
        >
          <View style={s.btnUrgenteLeft}>
            <Text style={s.btnUrgenteIcon}>⚡</Text>
            <View>
              <Text style={s.btnUrgenteText}>Urgente ahora</Text>
              <Text style={s.btnUrgenteSub}>30-60 min</Text>
            </View>
          </View>
          <Text style={s.btnArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnCita}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Solicitud', { urgente: false, clienteId })
          }
        >
          <View style={s.btnUrgenteLeft}>
            <Text style={s.btnUrgenteIcon}>📅</Text>
            <View>
              <Text style={s.btnCitaText}>Reservar cita</Text>
              <Text style={s.btnCitaSub}>Elige cuándo</Text>
            </View>
          </View>
          <Text style={s.btnArrowGray}>→</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {cargando ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Buscando fontaneros...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => cargarFontaneros(true)}
              tintColor={colors.blue}
              colors={[colors.blue]}
              progressBackgroundColor={colors.bgCard}
            />
          }
        >
          <Text style={s.listaLabel}>FONTANEROS CERCANOS</Text>

          {fontanerosFiltrados.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioIlustracion}>🔧</Text>
              <Text style={s.vacioTitulo}>Sin fontaneros disponibles</Text>
              <Text style={s.vacioSub}>
                Prueba cambiando los filtros o desliza para actualizar. ¡Pronto habrá más cerca de ti!
              </Text>
              <TouchableOpacity
                style={s.vacioBtn}
                onPress={() => {
                  setFiltroServicio('Todos');
                  setBusqueda('');
                  setMostrar24h(false);
                }}
              >
                <Text style={s.vacioBtnText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            fontanerosFiltrados.map((f) => renderTarjetaFontanero(f))
          )}
        </ScrollView>
      )}

      {/* FAB - Urgente */}
      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('Solicitud', { urgente: true, clienteId })
        }
      >
        <Text style={s.fabText}>⚡</Text>
        <Text style={s.fabLabel}>Urgente</Text>
      </TouchableOpacity>

      {/* DRAWER */}
      {renderDrawer()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  menuBtn: { gap: 4, padding: 4 },
  menuLine: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  headerCenter: { flex: 1 },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  onlineText: { color: colors.green, fontSize: 11, fontWeight: '600' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  iconBtnText: { fontSize: 16 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.red,
    borderRadius: 8,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 12,
    fontSize: 14,
  },
  searchClear: { color: colors.textMuted, fontSize: 16, padding: 4 },

  // Filters
  filtrosScroll: { maxHeight: 44, marginBottom: 12 },
  filtrosContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  filtro: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtroActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  filtroText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  filtroTextActivo: { color: '#fff', fontWeight: '700' },
  filtro24h: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtro24hActivo: { backgroundColor: '#1a1a35', borderColor: '#7356BF' },
  filtro24hText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  filtro24hTextActivo: { color: '#7356BF', fontWeight: '700' },

  // Urgency buttons
  botonesUrgencia: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  btnUrgente: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnUrgenteLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnUrgenteIcon: { fontSize: 20 },
  btnUrgenteText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  btnUrgenteSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  btnArrow: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnArrowGray: { color: colors.textMuted, fontSize: 16 },
  btnCita: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border2,
  },
  btnCitaText: { color: colors.text, fontWeight: 'bold', fontSize: 13 },
  btnCitaSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.textMuted, fontSize: 14 },

  // List
  lista: { flex: 1, paddingHorizontal: 16 },
  listaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },

  // Empty state
  vacio: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 20 },
  vacioIlustracion: { fontSize: 64, marginBottom: 16 },
  vacioTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  vacioSub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  vacioBtn: {
    backgroundColor: colors.bgCard2,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  vacioBtnText: { color: colors.blue, fontWeight: '700', fontSize: 14 },

  // Cards
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  cardActiva: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  cardInactivo: { opacity: 0.45 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInactivo: { backgroundColor: colors.bgCard3 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  avatarDotWrap: { position: 'absolute', bottom: -2, right: -2 },
  cardInfo: { flex: 1 },
  cardNombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  cardNombre: { color: colors.text, fontWeight: '700', fontSize: 15 },
  verifiedBadge: {
    backgroundColor: colors.green + '22',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.green,
  },
  verifiedBadgeText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgePillText: { fontSize: 10, fontWeight: '700' },
  cardZona: { color: colors.textMuted, fontSize: 12, marginBottom: 5 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  ratingVal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cardStat: { color: colors.textMuted, fontSize: 12 },
  cardStatDot: { color: colors.textFaint, fontSize: 12 },
  llegadaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  llegadaIcon: { fontSize: 11 },
  llegadaText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  llegadaLabel: { color: colors.textMuted, fontSize: 11 },
  cardRight: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  estadoVerde: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
  },
  estadoGris: { backgroundColor: colors.bgCard3 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextVerde: { color: colors.green },
  estadoTextGris: { color: colors.textMuted },
  favBtn: { padding: 2 },
  favBtnText: { fontSize: 18 },
  serviciosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  servicioTag: {
    backgroundColor: colors.bgCard3,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  servicioTagActivo: {
    backgroundColor: colors.blueLight,
    borderColor: colors.blue,
  },
  servicioTagText: { color: colors.textMuted, fontSize: 11 },
  servicioTagTextActivo: { color: colors.blue, fontWeight: '600' },
  tag24h: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#7356BF',
  },
  tag24hText: { color: '#7356BF', fontSize: 11, fontWeight: '600' },
  accionesRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnContratar: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnChat: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.bgCard2,
    borderWidth: 1,
    borderColor: colors.border2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnChatText: { fontSize: 20 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.blue,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { fontSize: 18 },
  fabLabel: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Drawer
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: colors.border2,
    paddingTop: 60,
    paddingBottom: 32,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerUserBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  drawerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.blueBright,
  },
  drawerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  drawerNombre: { color: colors.text, fontWeight: '700', fontSize: 16 },
  drawerTipo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  drawerSep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  drawerItemIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  drawerItemLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  drawerBadge: {
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  drawerBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  drawerItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    marginTop: 4,
  },
  drawerItemLabelDanger: {
    flex: 1,
    color: colors.red,
    fontSize: 15,
    fontWeight: '600',
  },
});
