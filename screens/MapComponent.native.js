import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme';

const BILBAO = { latitude: 43.2630, longitude: -2.9350 };

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#EDEFF3' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#69707F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#EDEFF3' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#DBDFE6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E4E7ED' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BEDCEB' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D6E8D2' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#E4E7ED' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E4E7ED' }] },
];

// Mapa "puro": solo pines. La selección y las acciones viven en la hoja de MapaScreen.
export default function MapComponentNative({ fontaneros, miUbicacion, seleccionado, onSelect, onPinPosition }) {
  const mapRef = useRef(null);
  const centro = miUbicacion
    ? { latitude: miUbicacion.latitud, longitude: miUbicacion.longitud }
    : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);

  const actualizarPosicionPin = () => {
    if (!onPinPosition) return;
    if (!seleccionado || !mapRef.current || seleccionado.latitud == null || seleccionado.longitud == null) {
      onPinPosition(null);
      return;
    }
    mapRef.current
      .pointForCoordinate({ latitude: seleccionado.latitud, longitude: seleccionado.longitud })
      .then(onPinPosition)
      .catch(() => {});
  };

  useEffect(() => { actualizarPosicionPin(); }, [seleccionado?.id]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={s.mapa}
      initialRegion={{ ...centro, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
      customMapStyle={mapStyle}
      showsUserLocation={!!miUbicacion}
      onRegionChangeComplete={actualizarPosicionPin}
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
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  marcadorActivo: { backgroundColor: colors.accent2, borderColor: '#fff' },
  marcadorPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
});
