import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function FavoritosScreen({ navigation }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario?.id) { setCargando(false); return; }
    try {
      const res = await axios.get(`${API}/clientes/${usuario.id}/favoritos`, { headers });
      setFavoritos(res.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [usuario?.id, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (fontaneroId) => {
    setFavoritos(prev => prev.filter(f => f.id !== fontaneroId));
    try {
      await axios.delete(`${API}/clientes/${usuario.id}/favoritos/${fontaneroId}`, { headers });
    } catch (e) {
      cargar();
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mis favoritos</Text>
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
          {favoritos.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>❤️</Text>
              <Text style={s.vacioTitulo}>Sin favoritos aún</Text>
              <Text style={s.vacioSub}>Guarda profesionales desde el buscador</Text>
              <TouchableOpacity style={s.btnBuscar} onPress={() => navigation.navigate('Mapa')}>
                <Text style={s.btnBuscarText}>Buscar profesionales →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            favoritos.map(f => (
              <View key={f.id} style={s.card}>
                <View style={s.cardLeft}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(f.nombre || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.cardNombre}>{f.nombre}</Text>
                    <Text style={s.cardZona}>📍 {f.zona || '—'}</Text>
                    <View style={s.cardStats}>
                      <Text style={s.stat}>⭐ {f.valoracion ?? '—'}</Text>
                      <Text style={s.statDot}>·</Text>
                      <Text style={s.stat}>✅ {f.trabajos ?? 0} trabajos</Text>
                    </View>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.btnContratar}
                    onPress={() => navigation.navigate('Solicitud', { fontanero: f, clienteId: usuario?.id })}
                  >
                    <Text style={s.btnContratarText}>Contratar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnEliminar} onPress={() => eliminar(f.id)}>
                    <Text style={s.btnEliminarText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
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
  vacioSub: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  btnBuscar: { backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnBuscarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  cardInfo: { flex: 1 },
  cardNombre: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  cardZona: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { color: colors.textMuted, fontSize: 12 },
  statDot: { color: colors.textFaint },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnContratar: { backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  btnEliminar: { backgroundColor: colors.redLight, borderRadius: 10, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  btnEliminarText: { fontSize: 16 },
});
