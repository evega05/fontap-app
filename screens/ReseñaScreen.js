import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';

export default function ReseñaScreen({ navigation, route }) {
  const { fontanero, servicio } = route.params || {};
  const [valoracion, setValoracion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);

  const enviar = () => {
    if (valoracion === 0) return;
    setEnviado(true);
    setTimeout(() => navigation.navigate('Mapa'), 2000);
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

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.titulo}>Deja tu reseña</Text>
      <Text style={s.sub}>¿Cómo fue el servicio?</Text>

      {fontanero && (
        <View style={s.fontaneroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{fontanero.nombre ? fontanero.nombre[0] : 'F'}</Text>
          </View>
          <View>
            <Text style={s.fontaneroNombre}>{fontanero.nombre}</Text>
            <Text style={s.fontaneroServicio}>{servicio?.nombre || 'Servicio de fontanería'}</Text>
          </View>
        </View>
      )}

      <Text style={s.valoracionTitulo}>Valoración</Text>
      <View style={s.estrellas}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} onPress={() => setValoracion(i)}>
            <Text style={[s.estrella, i <= valoracion && s.estrellaActiva]}>
              {i <= valoracion ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.etiquetasWrap}>
        {['Puntual', 'Profesional', 'Limpio', 'Precio justo', 'Rápido', 'Amable'].map(e => (
          <TouchableOpacity key={e} style={s.etiqueta}>
            <Text style={s.etiquetaText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.comentarioTitulo}>Comentario (opcional)</Text>
      <TextInput
        style={s.textArea}
        placeholder="Cuéntanos tu experiencia..."
        placeholderTextColor="#555"
        value={comentario}
        onChangeText={setComentario}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[s.btnEnviar, valoracion === 0 && s.btnDesactivado]}
        onPress={enviar}
        disabled={valoracion === 0}
      >
        <Text style={s.btnEnviarText}>Enviar reseña</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 24, paddingTop: 52, paddingBottom: 40 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#4f8ef7', fontSize: 15 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 14, color: '#aaa', marginBottom: 24 },
  fontaneroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 14, padding: 14, gap: 12, marginBottom: 28, borderWidth: 1, borderColor: '#2a2a3e' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  fontaneroNombre: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 3 },
  fontaneroServicio: { color: '#aaa', fontSize: 13 },
  valoracionTitulo: { color: '#fff', fontWeight: '600', fontSize: 16, marginBottom: 14 },
  estrellas: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  estrella: { fontSize: 40, color: '#aaa' },
  estrellaActiva: { color: '#f59e0b' },
  etiquetasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  etiqueta: { backgroundColor: '#1e1e2e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a3e' },
  etiquetaText: { color: '#aaa', fontSize: 13 },
  comentarioTitulo: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 10 },
  textArea: { backgroundColor: '#1e1e2e', color: '#fff', borderRadius: 12, padding: 14, fontSize: 14, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 24 },
  btnEnviar: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDesactivado: { opacity: 0.4 },
  btnEnviarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  enviado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  enviadoEmoji: { fontSize: 64, marginBottom: 16 },
  enviadoTitulo: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  enviadoSub: { color: '#aaa', fontSize: 15, textAlign: 'center' },
});