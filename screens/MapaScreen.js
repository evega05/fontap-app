import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';

const API = 'https://fontap-backend-production.up.railway.app';


const SERVICIOS_FILTRO = ['Todos', 'Desatasco', 'Fuga', 'Caldera', 'Grifo', 'Radiador'];

const BADGES = {
  top: { emoji: '⭐', label: 'Mejor valorado', color: '#F5A623' },
  rapido: { emoji: '⚡', label: 'Más rápido', color: colors.blue },
  popular: { emoji: '🔥', label: 'Popular', color: '#E74C3C' },
};

export default function MapaScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const clienteId = route.params?.clienteId || usuario?.id || null;
  const [seleccionado, setSeleccionado] = useState(null);
  const [modo, setModo] = useState('mapa');
  const [fontaneros, setFontaneros] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrar24h, setMostrar24h] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [notifNoLeidas, setNotifNoLeidas] = useState(0);
  const token = useAuth().token;

  useEffect(() => {
    axios.get(`${API}/fontaneros`)
      .then(res => { setFontaneros(res.data || []); })
      .catch(() => {});
  }, []);

  const cargarNotifs = useCallback(() => {
    const hds = token ? { Authorization: `Bearer ${token}` } : {};
    if (!clienteId) return;
    axios.get(`${API}/clientes/${clienteId}/favoritos`, { headers: hds })
      .then(res => setFavoritos((res.data || []).map(f => f.id)))
      .catch(() => {});
    axios.get(`${API}/usuarios/${clienteId}/notificaciones`, { headers: hds })
      .then(res => setNotifNoLeidas((res.data || []).filter(n => !n.leida).length))
      .catch(() => {});
  }, [clienteId, token]);

  useEffect(() => { cargarNotifs(); }, [cargarNotifs]);

  useFocusEffect(useCallback(() => { cargarNotifs(); }, [cargarNotifs]));

  const fontanerosFiltrados = fontaneros.filter(f => {
    if (busqueda && !f.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !f.zona?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroServicio !== 'Todos' && f.servicios && !f.servicios.includes(filtroServicio)) return false;
    if (mostrar24h && !f.disponible24h) return false;
    return true;
  });

  const toggleFavorito = async (f) => {
    const esFav = favoritos.includes(f.id);
    if (esFav) {
      setFavoritos(prev => prev.filter(id => id !== f.id));
      axios.delete(`${API}/clientes/${clienteId}/favoritos/${f.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => {});
    } else {
      setFavoritos(prev => [...prev, f.id]);
      axios.post(`${API}/clientes/${clienteId}/favoritos`, { fontanero_id: f.id }, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => {});
    }
  };

  const renderTarjetaFontanero = (f) => (
    <TouchableOpacity key={f.id}
      style={[s.card, !f.disponible && s.cardInactivo, seleccionado?.id === f.id && s.cardActiva]}
      onPress={() => {
        if (!f.disponible) return;
        setSeleccionado(seleccionado?.id === f.id ? null : f);
      }}>
      <View style={s.cardHeader}>
        <View style={[s.avatar, !f.disponible && s.avatarInactivo]}>
          <Text style={s.avatarText}>{f.nombre[0]}</Text>
        </View>
        <View style={s.cardInfo}>
          <View style={s.cardNombreRow}>
            <Text style={s.cardNombre}>{f.nombre}</Text>
            {f.badge && BADGES[f.badge] && (
              <View style={[s.badgePill, { backgroundColor: BADGES[f.badge].color + '22', borderColor: BADGES[f.badge].color }]}>
                <Text style={[s.badgePillText, { color: BADGES[f.badge].color }]}>
                  {BADGES[f.badge].emoji} {BADGES[f.badge].label}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.cardZona}>📍 {f.zona} · 🚶 {f.distancia}</Text>
          <View style={s.cardStats}>
            <Text style={s.cardStat}>⭐ {f.valoracion}</Text>
            <Text style={s.cardStatDot}>·</Text>
            <Text style={s.cardStat}>💰 {f.precio}</Text>
            {f.llegada && <><Text style={s.cardStatDot}>·</Text><Text style={s.cardStat}>🕐 {f.llegada}</Text></>}
          </View>
        </View>
        <View style={s.cardRight}>
          <View style={[s.estadoBadge, f.disponible ? s.estadoVerde : s.estadoGris]}>
            <Text style={[s.estadoText, f.disponible ? s.estadoTextVerde : s.estadoTextGris]}>
              {f.disponible ? '● Libre' : `Hasta ${f.ocupadoHasta || '—'}`}
            </Text>
          </View>
          {clienteId && (
            <TouchableOpacity style={s.favBtn} onPress={() => toggleFavorito(f)}>
              <Text style={s.favBtnText}>{favoritos.includes(f.id) ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {f.servicios && (
        <View style={s.serviciosRow}>
          {f.servicios.map(sv => (
            <View key={sv} style={[s.servicioTag, filtroServicio === sv && s.servicioTagActivo]}>
              <Text style={[s.servicioTagText, filtroServicio === sv && s.servicioTagTextActivo]}>{sv}</Text>
            </View>
          ))}
          {f.disponible24h && (
            <View style={s.tag24h}>
              <Text style={s.tag24hText}>🌙 24h</Text>
            </View>
          )}
        </View>
      )}

      {seleccionado?.id === f.id && f.disponible && (
        <TouchableOpacity style={s.btnContratar}
          onPress={() => navigation.navigate('Solicitud', { fontanero: f, clienteId })}>
          <Text style={s.btnContratarText}>Contratar a {f.nombre.split(' ')[0]} →</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.logo}>FonTap</Text>
          <Text style={s.sub}>📍 Bilbao · {fontanerosFiltrados.filter(f => f.disponible).length} disponibles</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => { setNotifNoLeidas(0); navigation.navigate('Notificaciones'); }}>
            <Text style={s.iconBtnText}>🔔</Text>
            {notifNoLeidas > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{notifNoLeidas > 9 ? '9+' : notifNoLeidas}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Favoritos')}>
            <Text style={s.iconBtnText}>❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('MisServicios', { clienteId })}>
            <Text style={s.iconBtnText}>📋</Text>
          </TouchableOpacity>
        </View>
        <View style={s.modoRow}>
          <TouchableOpacity style={[s.modoBtn, modo === 'mapa' && s.modoBtnActivo]} onPress={() => setModo('mapa')}>
            <Text style={[s.modoBtnText, modo === 'mapa' && s.modoBtnTextActivo]}>Mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modoBtn, modo === 'lista' && s.modoBtnActivo]} onPress={() => setModo('lista')}>
            <Text style={[s.modoBtnText, modo === 'lista' && s.modoBtnTextActivo]}>Lista</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Buscar fontanero o zona..."
          placeholderTextColor={colors.textFaint} value={busqueda} onChangeText={setBusqueda} />
        {busqueda ? <TouchableOpacity onPress={() => setBusqueda('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        <TouchableOpacity style={[s.filtro24h, mostrar24h && s.filtro24hActivo]} onPress={() => setMostrar24h(!mostrar24h)}>
          <Text style={[s.filtro24hText, mostrar24h && s.filtro24hTextActivo]}>🌙 24h</Text>
        </TouchableOpacity>
        {SERVICIOS_FILTRO.map(sv => (
          <TouchableOpacity key={sv} style={[s.filtro, filtroServicio === sv && s.filtroActivo]} onPress={() => setFiltroServicio(sv)}>
            <Text style={[s.filtroText, filtroServicio === sv && s.filtroTextActivo]}>{sv}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.botonesUrgencia}>
        <TouchableOpacity style={s.btnUrgente} onPress={() => navigation.navigate('Solicitud', { urgente: true, clienteId })}>
          <View style={s.btnUrgenteLeft}>
            <Text style={s.btnUrgenteIcon}>⚡</Text>
            <View>
              <Text style={s.btnUrgenteText}>Urgente ahora</Text>
              <Text style={s.btnUrgenteSub}>30-60 min</Text>
            </View>
          </View>
          <Text style={s.btnArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnCita} onPress={() => navigation.navigate('Solicitud', { urgente: false, clienteId })}>
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

      <ScrollView style={s.lista} contentContainerStyle={{ paddingBottom: 30 }}>
<Text style={s.listaLabel}>FONTANEROS CERCANOS</Text>
        {fontanerosFiltrados.length === 0 ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>🔍</Text>
            <Text style={s.vacioTitulo}>Sin resultados</Text>
            <Text style={s.vacioSub}>Prueba con otros filtros</Text>
          </View>
        ) : (
          fontanerosFiltrados.map(f => renderTarjetaFontanero(f))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  iconBtnText: { fontSize: 16 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.red, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.bg },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  favBtn: { padding: 4 },
  favBtnText: { fontSize: 18 },
  logo: { fontSize: 24, fontWeight: 'bold', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modoRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: colors.border },
  modoBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modoBtnActivo: { backgroundColor: colors.blue },
  modoBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  modoBtnTextActivo: { color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, paddingHorizontal: 14, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 14 },
  searchClear: { color: colors.textMuted, fontSize: 16, padding: 4 },
  filtrosScroll: { maxHeight: 44, marginBottom: 12 },
  filtrosContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filtro: { backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  filtroActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  filtroText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  filtroTextActivo: { color: '#fff', fontWeight: '700' },
  filtro24h: { backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  filtro24hActivo: { backgroundColor: '#1a1a35', borderColor: '#7356BF' },
  filtro24hText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  filtro24hTextActivo: { color: '#7356BF', fontWeight: '700' },
  botonesUrgencia: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  btnUrgente: { flex: 1, backgroundColor: colors.blue, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnUrgenteLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnUrgenteIcon: { fontSize: 20 },
  btnUrgenteText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  btnUrgenteSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  btnArrow: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnArrowGray: { color: colors.textMuted, fontSize: 16 },
  btnCita: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border2 },
  btnCitaText: { color: colors.text, fontWeight: 'bold', fontSize: 13 },
  btnCitaSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  lista: { flex: 1, paddingHorizontal: 16 },
  listaLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
card: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  mapaCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardActiva: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  cardInactivo: { opacity: 0.4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInactivo: { backgroundColor: colors.bgCard3 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  cardInfo: { flex: 1 },
  cardNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 },
  cardNombre: { color: colors.text, fontWeight: '700', fontSize: 15 },
  badgePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgePillText: { fontSize: 10, fontWeight: '700' },
  cardZona: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardStat: { color: colors.textMuted, fontSize: 12 },
  cardStatDot: { color: colors.textFaint, fontSize: 12 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginLeft: 8 },
  estadoVerde: { backgroundColor: colors.greenLight, borderWidth: 1, borderColor: colors.green },
  estadoGris: { backgroundColor: colors.bgCard3 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextVerde: { color: colors.green },
  estadoTextGris: { color: colors.textMuted },
  serviciosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  servicioTag: { backgroundColor: colors.bgCard3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  servicioTagActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  servicioTagText: { color: colors.textMuted, fontSize: 11 },
  servicioTagTextActivo: { color: colors.blue, fontWeight: '600' },
  tag24h: { backgroundColor: '#1a1a35', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#7356BF' },
  tag24hText: { color: '#7356BF', fontSize: 11, fontWeight: '600' },
  btnContratar: { backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 12 },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  vacio: { alignItems: 'center', paddingTop: 40 },
  vacioEmoji: { fontSize: 40, marginBottom: 12 },
  vacioTitulo: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  vacioSub: { color: colors.textMuted, fontSize: 14 },
});