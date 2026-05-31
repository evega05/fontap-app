import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from './theme';

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c54' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];

export default function MapComponentNative({ fontaneros, seleccionado, onSelect, onContratar }) {
  return (
    <View style={s.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={s.mapa}
        initialRegion={{
          latitude: 43.2630,
          longitude: -2.9350,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
      >
        {fontaneros.map(f => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.latitud, longitude: f.longitud }}
            onPress={() => onSelect(f)}
          >
            <View style={[s.marcador, f.disponible ? s.marcadorVerde : s.marcadorGris]}>
              <Text style={s.marcadorText}>🔧</Text>
            </View>
          </Marker>
        ))}
      </MapView>
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
  container: { flex: 1, position: 'relative' },
  mapa: { flex: 1 },
  marcador: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  marcadorVerde: { backgroundColor: colors.green },
  marcadorGris: { backgroundColor: '#6b7280' },
  marcadorText: { fontSize: 18 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,8,18,0.93)', padding: 14, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  cardActiva: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  nombre: { color: colors.text, fontWeight: '600', fontSize: 13 },
  zona: { color: colors.textMuted, fontSize: 11 },
  dot: { color: colors.green, fontSize: 16 },
  btnWrap: { backgroundColor: colors.blue, borderRadius: 14, padding: 14, alignItems: 'center' },
  btn: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});