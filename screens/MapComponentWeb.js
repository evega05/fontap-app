import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

export default function MapComponentWeb({ fontaneros, seleccionado, onSelect, onContratar }) {
  return (
    <View style={s.container}>
      <iframe
        title="mapa"
        width="100%"
        height="60%"
        style={{ border: 0 }}
        src="https://www.openstreetmap.org/export/embed.html?bbox=-3.0200,43.2300,-2.8700,43.3000&layer=mapnik"
        allowFullScreen
      />
      <View style={s.lista}>
        {fontaneros.filter(f => f.disponible).map(f => (
          <View key={f.id} style={[s.card, seleccionado?.id === f.id && s.cardActiva]}
            onClick={() => onSelect(f)}>
            <Text style={s.emoji}>🔧</Text>
            <View style={s.info}>
              <Text style={s.nombre}>{f.nombre}</Text>
              <Text style={s.zona}>📍 {f.zona} · ⭐ {f.valoracion}</Text>
            </View>
            <Text style={s.dot}>●</Text>
          </View>
        ))}
        {seleccionado && (
          <View style={s.btnWrap} onClick={() => onContratar(seleccionado)}>
            <Text style={s.btn}>Contratar a {seleccionado.nombre.split(' ')[0]} →</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  lista: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border, cursor: 'pointer' },
  cardActiva: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  nombre: { color: colors.text, fontWeight: '600', fontSize: 13 },
  zona: { color: colors.textMuted, fontSize: 11 },
  dot: { color: colors.green, fontSize: 16 },
  btnWrap: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center', cursor: 'pointer' },
  btn: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});