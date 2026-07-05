import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function ChatsRecientesScreen({ navigation }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [chats, setChats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario?.id) { setCargando(false); return; }
    try {
      const res = await axios.get(`${API}/usuarios/${usuario.id}/chats`, { headers });
      setChats(res.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [usuario?.id, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirChat = (c) => {
    navigation.navigate('Chat', { servicioId: c.servicio_id, otroNombre: c.otro_participante });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Chats</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {chats.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>💬</Text>
              <Text style={s.vacioTitulo}>Sin chats aún</Text>
              <Text style={s.vacioSub}>Tus conversaciones sobre servicios aparecerán aquí</Text>
            </View>
          ) : (
            chats.map(c => (
              <TouchableOpacity
                key={c.servicio_id}
                style={[s.card, c.no_leidos > 0 && s.cardNoLeida]}
                onPress={() => abrirChat(c)}
              >
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(c.otro_participante || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Text style={s.cardNombre} numberOfLines={1}>{c.otro_participante}</Text>
                    <Text style={s.cardFecha}>{formatFecha(c.ultimo_mensaje_fecha)}</Text>
                  </View>
                  <Text style={s.cardTipo}>🔧 {c.tipo_servicio}</Text>
                  <Text style={[s.cardMensaje, c.no_leidos > 0 && s.cardMensajeNoLeido]} numberOfLines={1}>
                    {c.ultimo_mensaje}
                  </Text>
                </View>
                {c.no_leidos > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{c.no_leidos > 9 ? '9+' : c.no_leidos}</Text>
                  </View>
                )}
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
    const d = new Date(iso.replace(' ', 'T'));
    const ahora = new Date();
    const diff = Math.floor((ahora - d) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardNoLeida: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardNombre: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 8 },
  cardFecha: { color: colors.textFaint, fontSize: 11 },
  cardTipo: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  cardMensaje: { color: colors.textMuted, fontSize: 13 },
  cardMensajeNoLeido: { color: colors.text, fontWeight: '600' },
  badge: { backgroundColor: colors.blue, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
