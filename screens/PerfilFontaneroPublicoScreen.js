import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function PerfilFontaneroPublicoScreen({ navigation, route }) {
  const { token, usuario } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const fontaneroBase = route.params?.fontanero || {};
  const usuarioId = fontaneroBase.usuario_id;

  const [perfil, setPerfil] = useState(fontaneroBase);
  const [stats, setStats] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!usuarioId) { setCargando(false); return; }
    try {
      const [rPerfil, rStats, rServicios, rGaleria, rResenas] = await Promise.allSettled([
        axios.get(`${API}/fontaneros/${usuarioId}/perfil`),
        axios.get(`${API}/fontaneros/${usuarioId}/estadisticas`, { headers }),
        axios.get(`${API}/fontaneros/${usuarioId}/servicios`),
        axios.get(`${API}/fontaneros/${usuarioId}/galeria`),
        axios.get(`${API}/fontaneros/${usuarioId}/resenas`),
      ]);
      if (rPerfil.status === 'fulfilled') setPerfil(prev => ({ ...prev, ...rPerfil.value.data }));
      if (rStats.status === 'fulfilled') setStats(rStats.value.data);
      if (rServicios.status === 'fulfilled') setServicios(rServicios.value.data || []);
      if (rGaleria.status === 'fulfilled') setGaleria(rGaleria.value.data || []);
      if (rResenas.status === 'fulfilled') setResenas(rResenas.value.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [usuarioId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const contratar = () => {
    navigation.navigate('Solicitud', { fontanero: perfil, clienteId: usuario?.id });
  };

  if (cargando) {
    return (
      <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={s.avatarWrap}>
          {perfil.foto_url ? (
            <Image source={{ uri: `${API}${perfil.foto_url}` }} style={s.avatarImagen} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{(perfil.nombre || '?')[0]}</Text>
            </View>
          )}
        </View>

        <Text style={s.nombre}>{perfil.nombre}</Text>
        <Text style={s.zona}>📍 {perfil.zona || 'Bilbao'}{perfil.disponible24h ? ' · 🌙 24h' : ''}</Text>
        <Text style={perfil.verificado ? s.verificado : s.noVerificado}>
          {perfil.verificado ? '✅ Identidad verificada' : '⏳ Verificación pendiente'}
        </Text>
        {perfil.certificado_pro && (
          <Text style={s.certificadoPro}>🏅 Certificado Provenza Pro</Text>
        )}

        {perfil.descripcion ? <Text style={s.descripcion}>{perfil.descripcion}</Text> : null}

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.valoracion_media ?? perfil.valoracion ?? '—'}</Text>
            <Text style={s.statLabel}>⭐ Valoración</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.trabajos_completados ?? 0}</Text>
            <Text style={s.statLabel}>✅ Trabajos</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.tasa_aceptacion ?? 0}%</Text>
            <Text style={s.statLabel}>📈 Aceptación</Text>
          </View>
        </View>

        <Text style={s.seccionTitulo}>Servicios y tarifas aproximadas</Text>
        {servicios.length === 0 ? (
          <Text style={s.seccionVacia}>Este profesional aún no publicó precios de servicios.</Text>
        ) : (
          servicios.map(sv => (
            <View key={sv.id} style={s.servicioRow}>
              <Text style={s.servicioNombre}>🔧 {sv.nombre}</Text>
              <Text style={s.servicioPrecio}>desde {sv.precio}€</Text>
            </View>
          ))
        )}

        <Text style={s.seccionTitulo}>Trabajos realizados</Text>
        {galeria.length === 0 ? (
          <Text style={s.seccionVacia}>Aún no subió fotos de trabajos realizados.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {galeria.map(g => (
              <Image key={g.id} source={{ uri: `${API}${g.url}` }} style={s.fotoTrabajo} />
            ))}
          </ScrollView>
        )}

        <Text style={s.seccionTitulo}>Reseñas ({resenas.length})</Text>
        {resenas.length === 0 ? (
          <Text style={s.seccionVacia}>Aún no tiene reseñas.</Text>
        ) : (
          resenas.map(r => {
            const media = (r.puntualidad + r.calidad + r.precio_justo + r.trato) / 4;
            return (
              <View key={r.id} style={s.resenaCard}>
                <View style={s.estrellasRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Text key={i} style={s.estrella}>{i <= Math.round(media) ? '⭐' : '☆'}</Text>
                  ))}
                </View>
                {r.comentario ? <Text style={s.resenaComentario}>"{r.comentario}"</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.btnContratar} onPress={contratar}>
          <Text style={s.btnContratarText}>Contratar a {perfil.nombre?.split(' ')[0]} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centro: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatarImagen: { width: 92, height: 92, borderRadius: 46 },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 38 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 12 },
  zona: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  verificado: { color: colors.green, fontSize: 13, textAlign: 'center', marginTop: 8 },
  certificadoPro: { color: colors.amber, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  noVerificado: { color: colors.amber, fontSize: 13, textAlign: 'center', marginTop: 8 },
  descripcion: { color: colors.text, fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 22, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  seccionTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginTop: 24, marginBottom: 10 },
  seccionVacia: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  servicioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  servicioNombre: { color: colors.text, fontSize: 14, fontWeight: '500' },
  servicioPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 14 },
  fotoTrabajo: { width: 140, height: 100, borderRadius: 12 },
  resenaCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  estrellasRow: { flexDirection: 'row', marginBottom: 6 },
  estrella: { fontSize: 15 },
  resenaComentario: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  btnContratar: { backgroundColor: colors.blue, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
