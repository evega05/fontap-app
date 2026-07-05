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
  Image,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { colors, spacing, radius, type, shadow } from '../theme';
import { useAuth } from '../AuthContext';
import MapaFontaneros from './MapComponent';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';

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

const BADGES = {
  top: { icon: 'star', label: 'Mejor valorado', color: '#F5A623' },
  rapido: { icon: 'flash', label: 'Más rápido', color: colors.blue },
  popular: { icon: 'flame', label: 'Popular', color: '#E74C3C' },
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
function StarRating({ value = 0, total = 5, size = 12 }) {
  const stars = [];
  for (let i = 1; i <= total; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= Math.round(value) ? 'star' : 'star-outline'}
        size={size}
        color={i <= Math.round(value) ? colors.amber : colors.textFaint}
      />
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
  const [vista, setVista] = useState('lista');
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [ubicacionDenegada, setUbicacionDenegada] = useState(false);

  // --- Client's real GPS location (for map centering + real distances) ---
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
          style={[
            s.card,
            !f.disponible && s.cardInactivo,
            isSelected && s.cardActiva,
          ]}
          haptic
          onPress={() => {
            if (!f.disponible) return;
            setSeleccionado(isSelected ? null : f);
          }}
        >
          {/* Card header */}
          <View style={s.cardHeader}>
            {/* Avatar */}
            <View style={s.avatarWrap}>
              {f.foto_url ? (
                <Image source={{ uri: `${API}${f.foto_url}` }} style={[s.avatar, !f.disponible && s.avatarInactivo]} />
              ) : (
                <View style={[s.avatar, !f.disponible && s.avatarInactivo]}>
                  <Text style={s.avatarText}>{f.nombre?.[0] || '?'}</Text>
                </View>
              )}
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
                    <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                  </View>
                )}
              </View>

              {f.badge && BADGES[f.badge] && (
                <View
                  style={[
                    s.badgePill,
                    { backgroundColor: BADGES[f.badge].color + '1F' },
                  ]}
                >
                  <Ionicons name={BADGES[f.badge].icon} size={10} color={BADGES[f.badge].color} />
                  <Text style={[s.badgePillText, { color: BADGES[f.badge].color }]}>
                    {BADGES[f.badge].label}
                  </Text>
                </View>
              )}

              <View style={s.cardZonaRow}>
                <Ionicons name="location" size={12} color={colors.textMuted} />
                <Text style={s.cardZona}>{f.zona}</Text>
                <Text style={s.cardStatDot}>·</Text>
                <Ionicons name="walk" size={12} color={colors.textMuted} />
                <Text style={s.cardZona}>{f.distancia}</Text>
              </View>

              {/* Stars + valoracion */}
              <View style={s.ratingRow}>
                {f.valoracion ? (
                  <>
                    <StarRating value={f.valoracion} />
                    <Text style={s.ratingVal}>{f.valoracion}</Text>
                  </>
                ) : (
                  <View style={s.nuevoPill}>
                    <Ionicons name="sparkles" size={10} color={colors.blue} />
                    <Text style={s.nuevoPillText}>Nuevo</Text>
                  </View>
                )}
              </View>
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
                <Pressable
                  style={s.favBtn}
                  haptic
                  onPress={() => toggleFavorito(f)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={favoritos.includes(f.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favoritos.includes(f.id) ? colors.red : colors.textMuted}
                  />
                </Pressable>
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
                  <Ionicons name="moon" size={10} color="#7356BF" />
                  <Text style={s.tag24hText}>24h</Text>
                </View>
              )}
            </View>
          )}

          {/* Expand: contratar + ver perfil */}
          {isSelected && f.disponible && (
            <View style={s.accionesRow}>
              <Pressable
                style={s.btnVerPerfil}
                haptic
                onPress={() =>
                  navigation.navigate('PerfilFontaneroPublico', { fontanero: f })
                }
              >
                <Text style={s.btnVerPerfilText}>Ver perfil</Text>
              </Pressable>
              <Pressable
                style={s.btnContratar}
                haptic
                onPress={() =>
                  navigation.navigate('Solicitud', { fontanero: f, clienteId })
                }
              >
                <Text style={s.btnContratarText}>
                  Contratar a {f.nombre?.split(' ')[0]}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </View>
          )}
        </Pressable>
      </FadeInUp>
    );
  };

  // --- Drawer ---
  const DRAWER_ITEMS = [
    { icon: 'compass-outline', label: 'Explorar', action: () => { cerrarDrawer(); } },
    { icon: 'receipt-outline', label: 'Mis Servicios', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('MisServicios', { clienteId }), 250); } },
    { icon: 'heart-outline', label: 'Favoritos', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('Favoritos'), 250); } },
    { icon: 'notifications-outline', label: 'Notificaciones', badge: notifNoLeidas, action: () => { setNotifNoLeidas(0); cerrarDrawer(); setTimeout(() => navigation.navigate('Notificaciones'), 250); } },
    { icon: 'chatbubbles-outline', label: 'Chats recientes', action: () => { cerrarDrawer(); setTimeout(() => navigation.navigate('ChatsRecientes'), 250); } },
  ];

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
              { backgroundColor: '#000', opacity: overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) },
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
        {DRAWER_ITEMS.map((item, idx) => (
          <Pressable
            key={idx}
            style={s.drawerItem}
            haptic
            onPress={item.action}
          >
            <View style={s.drawerItemIconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.text} />
            </View>
            <Text style={s.drawerItemLabel}>{item.label}</Text>
            {item.badge > 0 && (
              <View style={s.drawerBadge}>
                <Text style={s.drawerBadgeText}>
                  {item.badge > 9 ? '9+' : item.badge}
                </Text>
              </View>
            )}
          </Pressable>
        ))}

        <View style={s.drawerSep} />

        {/* Danger zone */}
        <Pressable style={s.drawerItemDanger} haptic onPress={handleLogout}>
          <View style={[s.drawerItemIconWrap, s.drawerItemIconWrapDanger]}>
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
          </View>
          <Text style={s.drawerItemLabelDanger}>Cerrar sesión</Text>
        </Pressable>
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
        <Pressable style={s.menuBtn} haptic onPress={abrirDrawer}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </Pressable>

        {/* Title + online count */}
        <View style={s.headerCenter}>
          <Text style={s.logo}>FonTap</Text>
          <View style={s.onlineRow}>
            <PulsingDot color={colors.green} size={7} />
            <Text style={s.onlineText}>
              {disponiblesCount} en línea ahora
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <Pressable
          style={s.iconBtn}
          haptic
          onPress={() => {
            setNotifNoLeidas(0);
            navigation.navigate('Notificaciones');
          }}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {notifNoLeidas > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>
                {notifNoLeidas > 9 ? '9+' : notifNoLeidas}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* SEARCH */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar fontanero o zona..."
          placeholderTextColor={colors.textFaint}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda ? (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
        <Pressable
          style={[s.filtro24h, mostrar24h && s.filtro24hActivo]}
          haptic
          onPress={() => setMostrar24h(!mostrar24h)}
        >
          <Ionicons name="moon" size={13} color={mostrar24h ? '#fff' : colors.textMuted} />
          <Text style={[s.filtro24hText, mostrar24h && s.filtro24hTextActivo]}>
            24h
          </Text>
        </Pressable>
        {SERVICIOS_FILTRO.map((sv) => (
          <Pressable
            key={sv}
            style={[s.filtro, filtroServicio === sv && s.filtroActivo]}
            haptic
            onPress={() => setFiltroServicio(sv)}
          >
            <Text
              style={[s.filtroText, filtroServicio === sv && s.filtroTextActivo]}
            >
              {sv}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* URGENCY BUTTONS */}
      <View style={s.botonesUrgencia}>
        <Pressable
          style={s.btnUrgente}
          haptic
          onPress={() =>
            navigation.navigate('Solicitud', { urgente: true, clienteId })
          }
        >
          <View style={s.btnUrgenteLeft}>
            <View style={s.btnUrgenteIconWrap}>
              <Ionicons name="flash" size={18} color="#fff" />
            </View>
            <View>
              <Text style={s.btnUrgenteText}>Urgente ahora</Text>
              <Text style={s.btnUrgenteSub}>30-60 min</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
        <Pressable
          style={s.btnCita}
          haptic
          onPress={() =>
            navigation.navigate('Solicitud', { urgente: false, clienteId })
          }
        >
          <View style={s.btnUrgenteLeft}>
            <View style={s.btnCitaIconWrap}>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </View>
            <View>
              <Text style={s.btnCitaText}>Reservar cita</Text>
              <Text style={s.btnCitaSub}>Elige cuándo</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* LISTA / MAPA TOGGLE */}
      <View style={s.vistaToggleRow}>
        <Pressable
          style={[s.vistaToggleBtn, vista === 'lista' && s.vistaToggleBtnActivo]}
          haptic
          onPress={() => setVista('lista')}
        >
          <Ionicons name="list" size={15} color={vista === 'lista' ? '#fff' : colors.textMuted} />
          <Text style={[s.vistaToggleText, vista === 'lista' && s.vistaToggleTextActivo]}>Lista</Text>
        </Pressable>
        <Pressable
          style={[s.vistaToggleBtn, vista === 'mapa' && s.vistaToggleBtnActivo]}
          haptic
          onPress={() => setVista('mapa')}
        >
          <Ionicons name="map" size={15} color={vista === 'mapa' ? '#fff' : colors.textMuted} />
          <Text style={[s.vistaToggleText, vista === 'mapa' && s.vistaToggleTextActivo]}>Mapa</Text>
        </Pressable>
      </View>
      {ubicacionDenegada && (
        <Text style={s.avisoUbicacion}>
          Activa el permiso de ubicación para ver la distancia real y tu posición en el mapa.
        </Text>
      )}

      {/* LIST / MAP */}
      {cargando ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Buscando fontaneros...</Text>
        </View>
      ) : vista === 'mapa' ? (
        <View style={{ flex: 1 }}>
          <MapaFontaneros
            fontaneros={fontanerosFiltrados}
            miUbicacion={miUbicacion}
            seleccionado={seleccionado}
            onSelect={setSeleccionado}
            onContratar={(f) => navigation.navigate('Solicitud', { fontanero: f, clienteId })}
            onVerPerfil={(f) => navigation.navigate('PerfilFontaneroPublico', { fontanero: f })}
          />
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
              <View style={s.vacioIconWrap}>
                <Ionicons name="water-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={s.vacioTitulo}>Sin fontaneros disponibles</Text>
              <Text style={s.vacioSub}>
                Prueba cambiando los filtros o desliza para actualizar. ¡Pronto habrá más cerca de ti!
              </Text>
              <Pressable
                style={s.vacioBtn}
                haptic
                onPress={() => {
                  setFiltroServicio('Todos');
                  setBusqueda('');
                  setMostrar24h(false);
                }}
              >
                <Text style={s.vacioBtnText}>Limpiar filtros</Text>
              </Pressable>
            </View>
          ) : (
            fontanerosFiltrados.map((f, i) => renderTarjetaFontanero(f, i))
          )}
        </ScrollView>
      )}

      {/* FAB - Urgente */}
      <Pressable
        style={s.fab}
        haptic
        onPress={() =>
          navigation.navigate('Solicitud', { urgente: true, clienteId })
        }
      >
        <Ionicons name="flash" size={16} color="#fff" />
        <Text style={s.fabLabel}>Urgente</Text>
      </Pressable>

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
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  menuBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  logo: {
    ...type.h1,
    color: colors.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  onlineText: { color: colors.green, ...type.tiny },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadow.sm,
  },
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 13,
    fontSize: 15,
  },

  // Filters
  filtrosScroll: { maxHeight: 44, marginBottom: spacing.md },
  filtrosContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filtro: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  filtroActivo: { backgroundColor: colors.blue, ...shadow.glow(colors.blue) },
  filtroText: { color: colors.textMuted, ...type.caption },
  filtroTextActivo: { color: '#fff', fontWeight: '700' },
  filtro24h: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  filtro24hActivo: { backgroundColor: '#7356BF' },
  filtro24hText: { color: colors.textMuted, ...type.caption },
  filtro24hTextActivo: { color: '#fff', fontWeight: '700' },

  // Lista/Mapa toggle
  vistaToggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  vistaToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm },
  vistaToggleBtnActivo: { backgroundColor: colors.blue, ...shadow.glow(colors.blue) },
  vistaToggleText: { color: colors.textMuted, ...type.caption, fontWeight: '700' },
  vistaToggleTextActivo: { color: '#fff' },
  avisoUbicacion: { color: colors.amber, fontSize: 11, textAlign: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm },

  // Urgency buttons
  botonesUrgencia: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  btnUrgente: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.glow(colors.blue),
  },
  btnUrgenteLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btnUrgenteIconWrap: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  btnUrgenteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnUrgenteSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  btnCita: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.sm,
  },
  btnCitaIconWrap: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  btnCitaText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  btnCitaSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.textMuted, fontSize: 14 },

  // List
  lista: { flex: 1, paddingHorizontal: spacing.lg },
  listaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: 4,
  },

  // Empty state
  vacio: { alignItems: 'center', paddingTop: 40, paddingHorizontal: spacing.xl },
  vacioIconWrap: {
    width: 84, height: 84, borderRadius: radius.full, backgroundColor: colors.bgCard,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, ...shadow.sm,
  },
  vacioTitulo: {
    color: colors.text,
    ...type.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  vacioSub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  vacioBtn: {
    backgroundColor: colors.bgCard2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  vacioBtnText: { color: colors.blue, fontWeight: '700', fontSize: 14 },

  // Cards
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.md,
  },
  cardActiva: { backgroundColor: colors.blueLight },
  cardInactivo: { opacity: 0.45 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  avatarWrap: { position: 'relative', marginRight: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    marginBottom: 4,
  },
  cardNombre: { color: colors.text, ...type.h3 },
  verifiedBadge: {
    backgroundColor: colors.green + '22',
    borderRadius: radius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  badgePillText: { fontSize: 10, fontWeight: '700' },
  cardZonaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardZona: { color: colors.textMuted, fontSize: 12 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingVal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cardStatDot: { color: colors.textFaint, fontSize: 12 },
  nuevoPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.blueLight, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  nuevoPillText: { color: colors.blue, fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: spacing.sm, marginLeft: spacing.sm },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  estadoVerde: { backgroundColor: colors.greenLight },
  estadoGris: { backgroundColor: colors.bgCard3 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextVerde: { color: colors.green },
  estadoTextGris: { color: colors.textMuted },
  favBtn: { padding: 2 },
  serviciosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  servicioTag: {
    backgroundColor: colors.bgCard3,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  servicioTagActivo: {
    backgroundColor: colors.blueLight,
  },
  servicioTagText: { color: colors.textMuted, fontSize: 11 },
  servicioTagTextActivo: { color: colors.blue, fontWeight: '600' },
  tag24h: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a1a35',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tag24hText: { color: '#7356BF', fontSize: 11, fontWeight: '600' },
  accionesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  btnVerPerfil: {
    backgroundColor: colors.bgCard2,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnVerPerfilText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnContratar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadow.glow(colors.blue),
  },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: spacing.xl,
    backgroundColor: colors.blue,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.glow(colors.blue),
  },
  fabLabel: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Drawer
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.bgCard,
    paddingTop: 60,
    paddingBottom: 32,
    zIndex: 100,
    ...shadow.lg,
  },
  drawerUserBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  drawerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.glow(colors.blue),
  },
  drawerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  drawerNombre: { color: colors.text, fontWeight: '700', fontSize: 16 },
  drawerTipo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  drawerSep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  drawerItemIconWrap: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  drawerItemIconWrapDanger: { backgroundColor: colors.redLight },
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    marginTop: 4,
  },
  drawerItemLabelDanger: {
    flex: 1,
    color: colors.red,
    fontSize: 15,
    fontWeight: '600',
  },
});
