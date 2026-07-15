import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { avisar } from '../confirmar';

const API = 'https://fontap-backend-production.up.railway.app';

const ETIQUETAS = ['Puntual', 'Profesional', 'Limpio', 'Precio justo', 'Rápido', 'Amable', 'Transparente'];
const CATEGORIAS = [
  { key: 'puntualidad', label: 'Puntualidad', emoji: '🕐' },
  { key: 'calidad', label: 'Calidad', emoji: '⭐' },
  { key: 'precio_justo', label: 'Precio', emoji: '💰' },
  { key: 'limpieza', label: 'Limpieza', emoji: '✨' },
];

export default function ReseñaScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const { fontanero, servicio, servicioId } = route.params || {};
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [valoracion, setValoracion] = useState(0);
  const [categorias, setCategorias] = useState({ puntualidad: 0, calidad: 0, precio_justo: 0, limpieza: 0 });
  const [etiquetasSelec, setEtiquetasSelec] = useState([]);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const toggleEtiqueta = (e) => {
    setEtiquetasSelec(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const enviar = async () => {
    if (valoracion === 0) return;
    setEnviando(true);
    try {
      const sid = servicioId || route.params?.servicioId;
      if (!sid) {
        avisar('Error', 'No se pudo identificar el servicio a valorar');
        setEnviando(false);
        return;
      }
      await axios.post(`${API}/servicios/${sid}/resena`, {
        puntualidad: categorias.puntualidad,
        calidad: categorias.calidad,
        precio_justo: categorias.precio_justo,
        trato: categorias.limpieza,
        comentario,
      }, { headers });
      setEnviado(true);
      setTimeout(() => navigation.navigate('Mapa'), 2000);
    } catch (e) {
      console.log('[Resena] Error al enviar:', e.response?.status, e.response?.data);
      avisar('Error', e.response?.data?.detail || 'No se pudo enviar la reseña');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <View style={s.container}>
        <View style={s.enviado}>
          <Text style={s.enviadoEmoji}>🎉</Text>
          <Text style={s.enviadoTitulo}>¡Gracias por tu reseña!</Text>
          <Text style={s.enviadoSub}>Tu opinión ayuda a otros clientes</Text>
        </View>
      </View>
    );
  }

  const promedioCateg = Object.values(categorias).filter(v => v > 0);
  const mediaCateg = promedioCateg.length ? (promedioCateg.reduce((a, b) => a + b, 0) / promedioCateg.length).toFixed(1) : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.titulo}>Deja tu reseña</Text>
      <Text style={s.sub}>Tu opinión es importante para la comunidad</Text>

      {fontanero && (
        <View style={s.fontaneroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(fontanero.nombre || 'F')[0]}</Text>
          </View>
          <View>
            <Text style={s.fontaneroNombre}>{fontanero.nombre}</Text>
            <Text style={s.fontaneroServicio}>{servicio?.nombre || 'Servicio de fontanería'}</Text>
          </View>
        </View>
      )}

      <Text style={s.seccionTitulo}>Valoración general</Text>
      <View style={s.estrellas}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} onPress={() => {
            setValoracion(i);
            setCategorias({ puntualidad: i, calidad: i, precio_justo: i, limpieza: i });
          }}>
            <Text style={[s.estrella, i <= valoracion && s.estrellaActiva]}>
              {i <= valoracion ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
        {valoracion > 0 && <Text style={s.valoracionNum}>{valoracion}.0</Text>}
      </View>

      <Text style={s.seccionTitulo}>Valoración por categorías</Text>
      {CATEGORIAS.map(cat => (
        <View key={cat.key} style={s.categoriaRow}>
          <Text style={s.categoriaLabel}>{cat.emoji} {cat.label}</Text>
          <View style={s.miniEstrellas}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setCategorias(prev => ({ ...prev, [cat.key]: i }))}>
                <Text style={[s.miniEstrella, i <= categorias[cat.key] && s.miniEstrellaActiva]}>
                  {i <= categorias[cat.key] ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {mediaCateg && <Text style={s.mediaCateg}>Media categorías: {mediaCateg} ⭐</Text>}

      <Text style={s.seccionTitulo}>¿Qué destacarías?</Text>
      <View style={s.etiquetasWrap}>
        {ETIQUETAS.map(e => (
          <TouchableOpacity
            key={e}
            style={[s.etiqueta, etiquetasSelec.includes(e) && s.etiquetaActiva]}
            onPress={() => toggleEtiqueta(e)}
          >
            <Text style={[s.etiquetaText, etiquetasSelec.includes(e) && s.etiquetaTextActiva]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.seccionTitulo}>Comentario (opcional)</Text>
      <TextInput
        style={s.textArea}
        placeholder="Cuéntanos tu experiencia con detalle..."
        placeholderTextColor={colors.textFaint}
        value={comentario}
        onChangeText={setComentario}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[s.btnEnviar, (valoracion === 0 || enviando) && s.btnDesactivado]}
        onPress={enviar}
        disabled={valoracion === 0 || enviando}
      >
        <Text style={s.btnEnviarText}>{enviando ? 'Enviando...' : 'Enviar reseña ✓'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 52, paddingBottom: 40 },
  backBtn: { marginBottom: 24 },
  backText: { color: colors.blue, fontSize: 15 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
  fontaneroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  fontaneroNombre: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 3 },
  fontaneroServicio: { color: colors.textMuted, fontSize: 13 },
  seccionTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 12, marginTop: 4 },
  estrellas: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  estrella: { fontSize: 36, color: colors.textFaint },
  estrellaActiva: { color: '#f59e0b' },
  valoracionNum: { color: colors.amber, fontWeight: 'bold', fontSize: 22, marginLeft: 8 },
  categoriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  categoriaLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  miniEstrellas: { flexDirection: 'row', gap: 4 },
  miniEstrella: { fontSize: 20, color: colors.textFaint },
  miniEstrellaActiva: { color: '#f59e0b' },
  mediaCateg: { color: colors.textMuted, fontSize: 12, textAlign: 'right', marginBottom: 12, marginTop: -4 },
  etiquetasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  etiqueta: { backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  etiquetaActiva: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  etiquetaText: { color: colors.textMuted, fontSize: 13 },
  etiquetaTextActiva: { color: colors.blue, fontWeight: '600' },
  textArea: { backgroundColor: colors.bgCard, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border2, marginBottom: 24 },
  btnEnviar: { backgroundColor: colors.blue, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDesactivado: { opacity: 0.4 },
  btnEnviarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  enviado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  enviadoEmoji: { fontSize: 64, marginBottom: 16 },
  enviadoTitulo: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  enviadoSub: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
