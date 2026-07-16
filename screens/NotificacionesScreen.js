import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function NotificacionesScreen({ navigation }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [notifs, setNotifs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  // IDs marcados localmente para no depender del backend
  const [leidasLocal, setLeidasLocal] = useState(new Set());

  const cargar = useCallback(async () => {
    if (!usuario?.id) { setCargando(false); return; }
    try {
      const res = await axios.get(`${API}/usuarios/${usuario.id}/notificaciones`, { headers });
      setNotifs(res.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [usuario?.id, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarLeida = async (id) => {
    setLeidasLocal(prev => new Set([...prev, id]));
    try { await axios.put(`${API}/notificaciones/${id}/leer`, null, { headers }); } catch (e) {}
  };

  const esLeida = (n) => n.leida || leidasLocal.has(n.id);

  const abrirNotif = async (n) => {
    await marcarLeida(n.id);
    const sid = n.servicio_id || n.data?.servicio_id;
    if (n.tipo === 'precio' && sid) {
      navigation.navigate('Pago', { servicioId: sid, precio: n.precio || n.data?.precio });
    } else if (n.tipo === 'precio' && !sid) {
      // intenta igual navegar a MisServicios para que paguen desde ahí
      navigation.navigate('MisServicios');
    } else if (n.tipo === 'aceptado' && sid) {
      navigation.navigate('Confirmacion', { servicioId: sid });
    } else if ((n.tipo === 'pago' || n.tipo === 'resena') && sid) {
      navigation.navigate('MisServicios');
    }
  };

  const marcarTodasLeidas = async () => {
    setLeidasLocal(new Set(notifs.map(n => n.id)));
    try {
      await axios.put(`${API}/usuarios/${usuario.id}/notificaciones/leer-todas`, null, { headers });
    } catch (e) {}
  };

  const noLeidas = notifs.filter(n => !esLeida(n)).length;

  const tipoIcono = (tipo) => {
    const iconos = { nuevo_servicio: '🔔', aceptado: '✅', precio: '💰', pago: '💳', resena: '⭐', sistema: 'ℹ️' };
    return iconos[tipo] || '🔔';
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Notificaciones</Text>
        {noLeidas > 0 ? (
          <TouchableOpacity onPress={marcarTodasLeidas}>
            <Text style={s.marcarTodas}>Leídas</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {notifs.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>🔔</Text>
              <Text style={s.vacioTitulo}>Sin notificaciones</Text>
              <Text style={s.vacioSub}>Aquí aparecerán tus alertas</Text>
            </View>
          ) : (
            notifs.map(n => (
              <TouchableOpacity
                key={n.id}
                style={[s.card, !esLeida(n) && s.cardNoLeida]}
                onPress={() => abrirNotif(n)}
              >
                <View style={s.cardIcono}>
                  <Text style={s.icono}>{tipoIcono(n.tipo)}</Text>
                  {!esLeida(n) && <View style={s.puntito} />}
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.cardTitulo, !esLeida(n) && s.cardTituloDestacado]}>{n.titulo}</Text>
                  <Text style={s.cardMensaje}>{n.mensaje}</Text>
                  <Text style={s.cardFecha}>{formatFecha(n.creado_en)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function formatFecha(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const ahora = new Date();
    const diff = Math.floor((ahora - d) / 60000);
    if (diff < 1) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  marcarTodas: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14 },
  card: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12, alignItems: 'flex-start' },
  cardNoLeida: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  cardIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  icono: { fontSize: 20 },
  puntito: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.bg },
  cardBody: { flex: 1 },
  cardTitulo: { color: colors.textMuted, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  cardTituloDestacado: { color: colors.text },
  cardMensaje: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  cardFecha: { color: colors.textFaint, fontSize: 11 },
});
