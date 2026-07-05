import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';
const BILBAO = { latitude: 43.2630, longitude: -2.9350 };

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c54' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
];

export default function MapComponentNative({ fontaneros, miUbicacion, seleccionado, onSelect, onContratar, onVerPerfil }) {
  const centro = miUbicacion
    ? { latitude: miUbicacion.latitud, longitude: miUbicacion.longitud }
    : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);

  return (
    <View style={s.container}>
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
              <Text style={s.marcadorText}>🔧</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {conUbicacion.length === 0 && (
        <View style={s.avisoWrap}>
          <Text style={s.avisoText}>Ningún fontanero disponible ha compartido su ubicación todavía</Text>
        </View>
      )}

      {seleccionado && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            {seleccionado.foto_url ? (
              <Image source={{ uri: `${API}${seleccionado.foto_url}` }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarText}>{seleccionado.nombre?.[0] || '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{seleccionado.nombre}</Text>
              <Text style={s.sub}>
                {seleccionado.valoracion ? `⭐ ${seleccionado.valoracion}` : '🆕 Nuevo'} · {seleccionado.distancia || '—'}
              </Text>
            </View>
          </View>
          <View style={s.cardBotones}>
            <TouchableOpacity style={s.btnVerPerfil} onPress={() => onVerPerfil(seleccionado)}>
              <Text style={s.btnVerPerfilText}>Ver perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnContratar} onPress={() => onContratar(seleccionado)}>
              <Text style={s.btnContratarText}>Contratar a {seleccionado.nombre?.split(' ')[0]} →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  mapa: { flex: 1 },
  marcador: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', backgroundColor: colors.green },
  marcadorActivo: { backgroundColor: colors.blue },
  marcadorText: { fontSize: 18 },
  avisoWrap: { position: 'absolute', top: 14, left: 14, right: 14, backgroundColor: 'rgba(8,8,18,0.93)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  avisoText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  card: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,8,18,0.96)', padding: 16, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  nombre: { color: colors.text, fontWeight: '600', fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardBotones: { flexDirection: 'row', gap: 10 },
  btnVerPerfil: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border2 },
  btnVerPerfilText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnContratar: { flex: 1, backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnContratarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
