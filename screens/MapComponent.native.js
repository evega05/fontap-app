import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme';

const BILBAO = { latitude: 43.2630, longitude: -2.9350 };

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#16233d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ea0c2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1830' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#233252' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1a2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1c2b47' }] },
];

// Mapa "puro": solo pines. La selección y las acciones viven en la hoja de MapaScreen.
export default function MapComponentNative({ fontaneros, miUbicacion, seleccionado, onSelect }) {
  const centro = miUbicacion
    ? { latitude: miUbicacion.latitud, longitude: miUbicacion.longitud }
    : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={s.mapa}
      initialRegion={{ ...centro, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
      customMapStyle={mapStyle}
      showsUserLocation={!!miUbicacion}
    >
      {conUbicacion.map(f => (
        <Marker
          key={f.id}
          coordinate={{ latitude: f.latitud, longitude: f.longitud }}
          onPress={() => onSelect(seleccionado?.id === f.id ? null : f)}
        >
          <View style={[s.marcador, seleccionado?.id === f.id && s.marcadorActivo]}>
            <View style={s.marcadorPunto} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const s = StyleSheet.create({
  mapa: { flex: 1 },
  marcador: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(76,224,210,0.28)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  marcadorActivo: { backgroundColor: colors.accent, borderColor: '#fff' },
  marcadorPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
});
