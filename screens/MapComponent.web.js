import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { colors } from '../theme';
import { LEAFLET_CSS } from './leafletCss';

const API = 'https://fontap-backend-production.up.railway.app';
const BILBAO = [43.2630, -2.9350];

function asegurarCssLeaflet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;
  const style = document.createElement('style');
  style.id = 'leaflet-css';
  style.textContent = LEAFLET_CSS;
  document.head.appendChild(style);
}

function crearIcono(emoji, activo) {
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;border-radius:18px;background:${activo ? colors.blue : colors.green};display:flex;align-items:center;justify-content:center;border:2px solid #fff;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function MapComponentWeb({ fontaneros, miUbicacion, seleccionado, onSelect, onContratar, onVerPerfil }) {
  useEffect(() => { asegurarCssLeaflet(); }, []);

  const centro = miUbicacion ? [miUbicacion.latitud, miUbicacion.longitud] : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);

  return (
    <View style={s.container}>
      <MapContainer center={centro} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {miUbicacion && (
          <Marker position={centro} icon={crearIcono('📍', false)} />
        )}
        {conUbicacion.map(f => (
          <Marker
            key={f.id}
            position={[f.latitud, f.longitud]}
            icon={crearIcono('🔧', seleccionado?.id === f.id)}
            eventHandlers={{ click: () => onSelect(seleccionado?.id === f.id ? null : f) }}
          />
        ))}
      </MapContainer>

      {conUbicacion.length === 0 && (
        <View style={s.avisoWrap} pointerEvents="none">
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
  avisoWrap: { position: 'absolute', top: 14, left: 14, right: 14, backgroundColor: 'rgba(8,8,18,0.93)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, zIndex: 1000 },
  avisoText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  card: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,8,18,0.96)', padding: 16, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 12, zIndex: 1000 },
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
