import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from './theme';

export default function MapViewComponent({ fontaneros, seleccionado, onSelect, onContratar }) {
  return (
    <View style={s.container}>
      <View style={s.mapaFondo}>
        <Text style={s.mapaEmoji}>🗺️</Text>
        <Text style={s.mapaTexto}>Bilbao, España</Text>
        <Text style={s.mapaSubtexto}>{fontaneros.filter(f => f.disponible).length} fontaneros disponibles cerca</Text>
      </View>
      <View style={s.overlay}>
        {fontaneros.filter(f => f.disponible).map(f => (
          <TouchableOpacity key={f.id}
            style={[s.card, seleccionado?.id === f.id && s.cardActiva]}
            onPress={() => onSelect(f)}>
            <Text style={s.emoji}>🔧</Text>
            <View style={s.info}>
              <Text style={s.nombre}>{f.nombre}</Text>
              <Text style={s.zona}>📍 {f.zona} · ⭐ {f.valoracion} · {f.distancia}</Text>
            </View>
            <Text style={s.dot}>●</Text>
          </TouchableOpacity>
        ))}
        {seleccionado && (
          <TouchableOpacity style={s.btnWrap} onPress={() => onContratar(seleccionado)}>
            <Text style={s.btn}>Contratar a {seleccionado.nombre.split(' ')[0]} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  mapaFondo: { flex: 1, backgroundColor: '#0a0a18', justifyContent: 'center', alignItems: 'center' },
  mapaEmoji: { fontSize: 60, marginBottom: 12 },
  mapaTexto: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  mapaSubtexto: { color: colors.textMuted, fontSize: 13 },
  overlay: { backgroundColor: 'rgba(8,8,18,0.95)', padding: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  cardActiva: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  nombre: { color: colors.text, fontWeight: '600', fontSize: 13 },
  zona: { color: colors.textMuted, fontSize: 11 },
  dot: { color: colors.green, fontSize: 16 },
  btnWrap: { backgroundColor: colors.blue, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  btn: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});