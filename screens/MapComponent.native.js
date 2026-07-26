import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme';
import { GREMIOS } from '../gremios';

const BILBAO = { latitude: 43.2630, longitude: -2.9350 };

function emojiDeGremio(gremio) {
  return GREMIOS.find((g) => g.valor === gremio)?.emoji || '🔧';
}

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
export default function MapComponentNative({ fontaneros, miUbicacion, centroForzado, seleccionado, onSelect, onPinPosition, destino }) {
  const mapRef = useRef(null);
  const centro = centroForzado
    ? { latitude: centroForzado.latitud, longitude: centroForzado.longitud }
    : miUbicacion ? { latitude: miUbicacion.latitud, longitude: miUbicacion.longitud } : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);
  const tieneDestino = destino && destino.latitud != null && destino.longitud != null;
  const origenRuta = conUbicacion[0];

  useEffect(() => {
    if (tieneDestino && origenRuta && mapRef.current) {
      mapRef.current.fitToCoordinates([
        { latitude: origenRuta.latitud, longitude: origenRuta.longitud },
        { latitude: destino.latitud, longitude: destino.longitud },
      ], { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true });
    }
  }, [tieneDestino, origenRuta?.latitud, origenRuta?.longitud, destino?.latitud, destino?.longitud]);

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

  useEffect(() => {
    if (centroForzado && mapRef.current) {
      mapRef.current.animateToRegion({ ...centro, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500);
    }
  }, [centroForzado?.latitud, centroForzado?.longitud]);

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
      {tieneDestino && origenRuta && (
        <Polyline
          coordinates={[
            { latitude: origenRuta.latitud, longitude: origenRuta.longitud },
            { latitude: destino.latitud, longitude: destino.longitud },
          ]}
          strokeColor={colors.accent}
          strokeWidth={4}
          lineDashPattern={[8, 8]}
        />
      )}
      {tieneDestino && (
        <Marker coordinate={{ latitude: destino.latitud, longitude: destino.longitud }}>
          <View style={s.marcadorDestino}>
            <Text style={s.marcadorEmoji}>🏠</Text>
          </View>
        </Marker>
      )}
      {conUbicacion.map(f => (
        <Marker
          key={f.id}
          coordinate={{ latitude: f.latitud, longitude: f.longitud }}
          onPress={() => onSelect(seleccionado?.id === f.id ? null : f)}
        >
          <View style={[s.marcador, seleccionado?.id === f.id && s.marcadorActivo]}>
            <Text style={s.marcadorEmoji}>{emojiDeGremio(f.gremio)}</Text>
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
  marcadorEmoji: { fontSize: 14, lineHeight: 16 },
  marcadorDestino: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
});
