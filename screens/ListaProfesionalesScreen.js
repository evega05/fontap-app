import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { colors, spacing, radius, type, shadow } from '../theme';
import { useAuth } from '../AuthContext';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';
import { useIdioma } from '../i18n';
import { GREMIOS, serviciosDe } from '../gremios';
import { CIUDADES } from './MapaScreen';

const API = 'https://fontap-backend-production.up.railway.app';

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

// Pantalla dedicada a elegir profesional: separada del mapa porque meter filtros +
// lista + mapa en una sola hoja dejaba todo demasiado apretado en pantallas Android
// normales. Aquí cada tarjeta y cada filtro tienen su propio espacio para respirar.
export default function ListaProfesionalesScreen({ navigation, route }) {
  const { token, usuario } = useAuth();
  const { t } = useIdioma();
  const clienteId = route.params?.clienteId || usuario?.id || null;
  const miUbicacion = route.params?.miUbicacion || null;

  const [ciudad, setCiudad] = useState(route.params?.ciudad || 'Bilbao');
  const [ciudadAbierta, setCiudadAbierta] = useState(false);
  const [filtroGremio, setFiltroGremio] = useState(route.params?.filtroGremio || '');
  const [gremioFiltroAbierto, setGremioFiltroAbierto] = useState(false);
  const [filtroServicio, setFiltroServicio] = useState('Todos');
  const [orden, setOrden] = useState(route.params?.orden || 'cercania');
  const [ordenAbierto, setOrdenAbierto] = useState(false);
  const [mostrar24h, setMostrar24h] = useState(route.params?.mostrar24h || false);
  const [valoracionMinima, setValoracionMinima] = useState(route.params?.valoracionMinima || 0);

  const [fontaneros, setFontaneros] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [gremiosEnEspera, setGremiosEnEspera] = useState([]);
  const [procesandoEspera, setProcesandoEspera] = useState(false);
  const [iniciandoChat, setIniciandoChat] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const volver = () => {
    navigation.navigate('Mapa', {
      filtrosActualizados: { ciudad, filtroGremio, orden, mostrar24h, valoracionMinima },
    });
  };

  const cargarFontaneros = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCargando(true);
    axios
      .get(`${API}/fontaneros`, { params: { ...(filtroGremio ? { gremio: filtroGremio } : {}), ciudad, ...(clienteId ? { cliente_id: clienteId } : {}) }, headers })
      .then((res) => { setFontaneros(res.data || []); setErrorCarga(false); })
      .catch(() => { setFontaneros([]); setErrorCarga(true); })
      .finally(() => { setCargando(false); setRefreshing(false); });
  }, [filtroGremio, ciudad, clienteId, token]);

  useEffect(() => { cargarFontaneros(); }, [cargarFontaneros]);
  useEffect(() => { setFiltroServicio('Todos'); }, [filtroGremio]);

  useEffect(() => {
    if (!clienteId) return;
    axios.get(`${API}/clientes/${clienteId}/favoritos`, { headers })
      .then((res) => setFavoritos((res.data || []).map((f) => f.id)))
      .catch(() => {});
  }, [clienteId, token]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/lista-espera`, { headers })
      .then((res) => setGremiosEnEspera((res.data || []).map((e) => e.gremio)))
      .catch(() => {});
  }, [token]);

  const enListaEspera = filtroGremio && gremiosEnEspera.includes(filtroGremio);
  const toggleListaEspera = async () => {
    if (!filtroGremio || procesandoEspera) return;
    setProcesandoEspera(true);
    try {
      if (enListaEspera) {
        await axios.delete(`${API}/lista-espera/${filtroGremio}`, { headers });
        setGremiosEnEspera((prev) => prev.filter((g) => g !== filtroGremio));
      } else {
        await axios.post(`${API}/lista-espera`, { gremio: filtroGremio }, { headers });
        setGremiosEnEspera((prev) => [...prev, filtroGremio]);
      }
    } catch (e) {}
    finally { setProcesandoEspera(false); }
  };

  const serviciosFiltroDisponibles = filtroGremio ? serviciosDe(filtroGremio).map((sv) => sv.nombre) : [];

  const fontanerosFiltrados = fontaneros
    .filter((f) => {
      if (filtroServicio !== 'Todos' && f.servicios && !f.servicios.includes(filtroServicio)) return false;
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

  const toggleFavorito = (f) => {
    const esFav = favoritos.includes(f.id);
    if (esFav) {
      setFavoritos((prev) => prev.filter((id) => id !== f.id));
      axios.delete(`${API}/clientes/${clienteId}/favoritos/${f.id}`, { headers }).catch(() => {});
    } else {
      setFavoritos((prev) => [...prev, f.id]);
      axios.post(`${API}/clientes/${clienteId}/favoritos/${f.id}`, null, { headers }).catch(() => {});
    }
  };

  const iniciarChat = async (f) => {
    if (iniciandoChat) return;
    setIniciandoChat(true);
    try {
      const res = await axios.post(
        `${API}/servicios`,
        { tipo: 'Consulta', urgente: false, fontanero_id: f.id, es_consulta: true },
        { params: { cliente_id: clienteId }, headers }
      );
      navigation.navigate('Chat', { servicioId: res.data.id, otroNombre: f.nombre });
    } catch (e) {}
    finally { setIniciandoChat(false); }
  };

  const renderTarjeta = (f, index) => {
    const esVerificado = !!f.verificado;
    const isSelected = seleccionado?.id === f.id;

    return (
      <FadeInUp key={f.id} index={index}>
        <Pressable
          style={[s.card, !f.disponible && s.cardInactivo]}
          haptic
          onPress={() => { if (!f.disponible) return; setSeleccionado(isSelected ? null : f); }}
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
                  {esVerificado && <Ionicons name="checkmark-circle" size={15} color={colors.accent2} />}
                  {f.certificado_pro && <Text style={s.badgePro}>🏅 Pro</Text>}
                </View>
                <View style={s.cardZonaRow}>
                  <Ionicons name="location" size={12} color={colors.textMuted} />
                  <Text style={s.cardZona}>{f.zona}</Text>
                  <Text style={s.cardStatDot}>·</Text>
                  <Text style={s.cardZona}>{f.distancia}</Text>
                </View>
                {f.valoracion ? (
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={13} color={colors.amber} />
                    <Text style={s.ratingVal}>{f.valoracion}</Text>
                  </View>
                ) : (
                  <View style={s.nuevoPill}>
                    <Ionicons name="sparkles" size={11} color={colors.accent2} />
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
                    <Ionicons name={favoritos.includes(f.id) ? 'heart' : 'heart-outline'} size={21} color={favoritos.includes(f.id) ? colors.red : colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            {isSelected && f.disponible && (
              <View style={s.accionesRow}>
                <Pressable style={s.btnVerPerfil} haptic onPress={() => navigation.navigate('PerfilFontaneroPublico', { fontanero: f })}>
                  <Text style={s.btnVerPerfilText}>Ver perfil</Text>
                </Pressable>
                <Pressable style={s.btnMensaje} haptic onPress={() => iniciarChat(f)}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                </Pressable>
                <Pressable style={{ flex: 1 }} haptic onPress={() => navigation.navigate('Solicitud', { fontanero: f, clienteId })}>
                  <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnContratar}>
                    <Text style={s.btnContratarText}>Contratar a {f.nombre?.split(' ')[0]}</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.text} />
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </FadeInUp>
    );
  };

  return (
    <View style={s.container}>
      <GradientBg />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.header}>
        <Pressable style={s.backBtn} haptic onPress={volver}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitulo}>{t('profesionalesCercanos')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.filtrosScrollV} contentContainerStyle={s.filtrosScrollVContent}>
        <View style={s.filtrosRow}>
          <View style={s.filtroDropdownWrap}>
            <Pressable style={s.gremioFiltroBtn} haptic onPress={() => { setCiudadAbierta(!ciudadAbierta); setGremioFiltroAbierto(false); }}>
              <Text style={s.gremioFiltroBtnText} numberOfLines={1}>📍 {ciudad}</Text>
              <Ionicons name={ciudadAbierta ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={s.filtroDropdownWrap}>
            <Pressable style={s.gremioFiltroBtn} haptic onPress={() => { setGremioFiltroAbierto(!gremioFiltroAbierto); setCiudadAbierta(false); }}>
              <Text style={s.gremioFiltroBtnText} numberOfLines={1}>
                {filtroGremio
                  ? `${GREMIOS.find((g) => g.valor === filtroGremio)?.emoji} ${t(GREMIOS.find((g) => g.valor === filtroGremio)?.clave)}`
                  : `🛠️ ${t('todos')}`}
              </Text>
              <Ionicons name={gremioFiltroAbierto ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {ciudadAbierta && (
          <View style={s.dropdownInline}>
            {CIUDADES.map((c) => (
              <Pressable key={c.valor} style={[s.gremioFiltroOpcion, ciudad === c.valor && s.gremioFiltroOpcionActiva]} haptic
                onPress={() => { setCiudad(c.valor); setCiudadAbierta(false); }}>
                <Text style={[s.gremioFiltroOpcionText, ciudad === c.valor && s.gremioFiltroOpcionTextActiva]}>📍 {c.valor}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {gremioFiltroAbierto && (
          <View style={s.dropdownInline}>
            <Pressable style={[s.gremioFiltroOpcion, !filtroGremio && s.gremioFiltroOpcionActiva]} haptic
              onPress={() => { setFiltroGremio(''); setGremioFiltroAbierto(false); }}>
              <Text style={[s.gremioFiltroOpcionText, !filtroGremio && s.gremioFiltroOpcionTextActiva]}>🛠️ {t('todos')}</Text>
            </Pressable>
            {GREMIOS.map((g) => (
              <Pressable key={g.valor} style={[s.gremioFiltroOpcion, filtroGremio === g.valor && s.gremioFiltroOpcionActiva]} haptic
                onPress={() => { setFiltroGremio(g.valor); setGremioFiltroAbierto(false); }}>
                <Text style={[s.gremioFiltroOpcionText, filtroGremio === g.valor && s.gremioFiltroOpcionTextActiva]}>{g.emoji} {t(g.clave)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {serviciosFiltroDisponibles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
            <Pressable style={[s.filtro, filtroServicio === 'Todos' && s.filtroActivo]} haptic onPress={() => setFiltroServicio('Todos')}>
              <Text style={[s.filtroText, filtroServicio === 'Todos' && s.filtroTextActivo]}>{t('todos')}</Text>
            </Pressable>
            {serviciosFiltroDisponibles.map((sv) => (
              <Pressable key={sv} style={[s.filtro, filtroServicio === sv && s.filtroActivo]} haptic onPress={() => setFiltroServicio(sv)}>
                <Text style={[s.filtroText, filtroServicio === sv && s.filtroTextActivo]}>{sv}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
          <Pressable style={s.ordenBtn} haptic onPress={() => setOrdenAbierto(!ordenAbierto)}>
            <Ionicons name="swap-vertical" size={13} color={colors.textMuted} />
            <Text style={s.ordenBtnText}>
              {orden === 'valoracion' ? t('mejorValorados') : orden === 'precio' ? t('precioBajo') : t('cercania')}
            </Text>
            <Ionicons name={ordenAbierto ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
          </Pressable>
          <Pressable style={[s.filtro24h, mostrar24h && s.filtro24hActivo]} haptic onPress={() => setMostrar24h(!mostrar24h)}>
            <Ionicons name="moon" size={12} color={mostrar24h ? colors.text : colors.textMuted} />
            <Text style={[s.filtro24hText, mostrar24h && s.filtro24hTextActivo]}>24h</Text>
          </Pressable>
          {[0, 3, 4, 4.5].map((v) => (
            <Pressable key={v} style={[s.filtro, valoracionMinima === v && s.filtroActivo]} haptic onPress={() => setValoracionMinima(v)}>
              <Text style={[s.filtroText, valoracionMinima === v && s.filtroTextActivo]}>
                {v === 0 ? t('todos') : `★ ${v}+`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {ordenAbierto && (
          <View style={s.gremioFiltroLista}>
            {[
              { valor: 'cercania', clave: 'cercania', icon: 'navigate-outline' },
              { valor: 'valoracion', clave: 'mejorValorados', icon: 'star-outline' },
              { valor: 'precio', clave: 'precioBajo', icon: 'cash-outline' },
            ].map((o) => (
              <Pressable key={o.valor} style={[s.gremioFiltroOpcion, orden === o.valor && s.gremioFiltroOpcionActiva]} haptic
                onPress={() => { setOrden(o.valor); setOrdenAbierto(false); }}>
                <Ionicons name={o.icon} size={15} color={orden === o.valor ? colors.blue : colors.textMuted} />
                <Text style={[s.gremioFiltroOpcionText, orden === o.valor && s.gremioFiltroOpcionTextActiva, { marginLeft: 8 }]}>{t(o.clave)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {cargando ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent2} />
          <Text style={s.loadingText}>Buscando profesionales...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => cargarFontaneros(true)} tintColor={colors.accent2} colors={[colors.accent2]} progressBackgroundColor={colors.bg} />
          }
        >
          {fontanerosFiltrados.length === 0 ? (
            <View style={s.vacio}>
              <View style={s.vacioIconWrap}>
                <Ionicons name={errorCarga ? 'cloud-offline-outline' : 'water-outline'} size={34} color={colors.textMuted} />
              </View>
              <Text style={s.vacioTitulo}>{errorCarga ? 'No se pudo conectar' : 'Sin profesionales disponibles'}</Text>
              <Text style={s.vacioSub}>
                {errorCarga
                  ? 'No se pudo cargar la lista de profesionales. Revisa tu conexión y desliza para reintentar.'
                  : 'Prueba cambiando los filtros o desliza para actualizar.'}
              </Text>
              <Pressable style={s.vacioBtn} haptic onPress={() => { setFiltroServicio('Todos'); setMostrar24h(false); setValoracionMinima(0); }}>
                <Text style={s.vacioBtnText}>Limpiar filtros</Text>
              </Pressable>
              {!!filtroGremio && (
                <Pressable
                  style={[s.vacioBtn, s.vacioBtnEspera, enListaEspera && s.vacioBtnEsperaActivo]}
                  haptic
                  onPress={toggleListaEspera}
                  disabled={procesandoEspera}
                >
                  <Text style={[s.vacioBtnText, enListaEspera && s.vacioBtnEsperaActivoText]}>
                    {enListaEspera ? '✓ Te avisaremos cuando haya alguien libre' : '🔔 Avísame cuando haya alguien libre'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            fontanerosFiltrados.map((f, i) => renderTarjeta(f, i))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { color: colors.text, fontWeight: '700', fontSize: 16 },

  filtrosScrollV: { flexGrow: 0 },
  filtrosScrollVContent: { paddingBottom: spacing.sm },

  filtrosRow: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  filtroDropdownWrap: { flex: 1 },
  dropdownInline: { marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.glassStrong, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  gremioFiltroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: colors.glass, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, borderWidth: 1, borderColor: colors.glassBorder },
  ordenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.glass, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 9, borderWidth: 1, borderColor: colors.glassBorder },
  ordenBtnText: { color: colors.textMuted, ...type.caption },
  gremioFiltroBtnText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  gremioFiltroLista: { marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.glassStrong, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder },
  gremioFiltroOpcion: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  gremioFiltroOpcionActiva: { backgroundColor: colors.blueLight },
  gremioFiltroOpcionText: { color: colors.textMuted, fontSize: 14.5, fontWeight: '500' },
  gremioFiltroOpcionTextActiva: { color: colors.blue, fontWeight: '700' },
  filtrosScroll: { maxHeight: 46, marginBottom: spacing.md },
  filtrosContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  filtro: { backgroundColor: colors.glass, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 9, borderWidth: 1, borderColor: colors.glassBorder },
  filtroActivo: { backgroundColor: colors.accent2, borderColor: colors.accent2 },
  filtroText: { color: colors.textMuted, ...type.caption },
  filtroTextActivo: { color: colors.text, fontWeight: '700' },
  filtro24h: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.glass, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 9, borderWidth: 1, borderColor: colors.glassBorder },
  filtro24hActivo: { backgroundColor: colors.purple, borderColor: colors.purple },
  filtro24hText: { color: colors.textMuted, ...type.caption },
  filtro24hTextActivo: { color: colors.text, fontWeight: '700' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.textMuted, fontSize: 14 },

  lista: { flex: 1, paddingHorizontal: spacing.lg },

  vacio: { alignItems: 'center', paddingTop: 40, paddingHorizontal: spacing.xl },
  vacioIconWrap: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  vacioTitulo: { color: colors.text, ...type.h2, marginBottom: spacing.sm, textAlign: 'center' },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  vacioBtn: { backgroundColor: colors.glass, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.glassBorder },
  vacioBtnEspera: { marginTop: spacing.sm },
  vacioBtnEsperaActivo: { backgroundColor: colors.greenGlass, borderColor: colors.green },
  vacioBtnEsperaActivoText: { color: colors.green },
  vacioBtnText: { color: colors.accent2, fontWeight: '700', fontSize: 14 },

  card: { borderRadius: radius.lg, marginBottom: spacing.lg, position: 'relative' },
  cardInner: { padding: spacing.xl },
  cardInactivo: { opacity: 0.45 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrap: { position: 'relative', marginRight: spacing.lg },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  avatarInactivo: { backgroundColor: colors.glassStrong },
  avatarText: { color: colors.text, fontWeight: 'bold', fontSize: 22 },
  avatarDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.bg },
  cardInfo: { flex: 1 },
  cardNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardNombre: { color: colors.text, fontSize: 17, fontWeight: '700' },
  badgePro: { color: colors.amber, fontSize: 10, fontWeight: '700', backgroundColor: '#1a1400', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  cardZonaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardZona: { color: colors.textMuted, fontSize: 13 },
  cardStatDot: { color: colors.textFaint, fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingVal: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  nuevoPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.purpleGlass, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  nuevoPillText: { color: colors.accent2, fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: spacing.md, marginLeft: spacing.sm },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  estadoVerde: { backgroundColor: colors.greenGlass },
  estadoGris: { backgroundColor: colors.glass },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextVerde: { color: colors.green },
  estadoTextGris: { color: colors.textMuted },
  favBtn: { padding: 2 },
  accionesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  btnVerPerfil: { backgroundColor: colors.glass, borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  btnVerPerfilText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnMensaje: { backgroundColor: colors.glass, borderRadius: radius.md, width: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  btnContratar: { flexDirection: 'row', borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnContratarText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
});
