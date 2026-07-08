import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { colors } from '../theme';
import { LEAFLET_CSS } from './leafletCss';

const BILBAO = [43.2630, -2.9350];

function asegurarCssLeaflet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;
  const style = document.createElement('style');
  style.id = 'leaflet-css';
  style.textContent = LEAFLET_CSS;
  document.head.appendChild(style);
}

function crearIcono(activo) {
  const color = activo ? colors.accent : 'rgba(76,224,210,0.85)';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:13px;background:${color};display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.4);"><div style="width:9px;height:9px;border-radius:5px;background:#fff;"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function crearIconoYo() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:8px;background:#fff;border:3px solid ${colors.accent};box-shadow:0 0 0 4px rgba(124,156,255,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function EventosMapa({ onMove }) {
  useMapEvents({ move: onMove, zoom: onMove });
  return null;
}

// Mapa "puro": solo pines. La selección y las acciones viven en la hoja de MapaScreen.
export default function MapComponentWeb({ fontaneros, miUbicacion, seleccionado, onSelect, onPinPosition }) {
  const mapRef = useRef(null);
  useEffect(() => { asegurarCssLeaflet(); }, []);

  const centro = miUbicacion ? [miUbicacion.latitud, miUbicacion.longitud] : BILBAO;
  const conUbicacion = fontaneros.filter(f => f.disponible && f.latitud != null && f.longitud != null);

  const actualizarPosicionPin = () => {
    if (!onPinPosition) return;
    const map = mapRef.current;
    if (!seleccionado || !map || seleccionado.latitud == null || seleccionado.longitud == null) {
      onPinPosition(null);
      return;
    }
    try {
      const point = map.latLngToContainerPoint([seleccionado.latitud, seleccionado.longitud]);
      onPinPosition({ x: point.x, y: point.y });
    } catch (e) {}
  };

  useEffect(() => { actualizarPosicionPin(); }, [seleccionado?.id]);

  return (
    <MapContainer
      center={centro}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      ref={mapRef}
      whenReady={actualizarPosicionPin}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <EventosMapa onMove={actualizarPosicionPin} />
      {miUbicacion && <Marker position={centro} icon={crearIconoYo()} />}
      {conUbicacion.map(f => (
        <Marker
          key={f.id}
          position={[f.latitud, f.longitud]}
          icon={crearIcono(seleccionado?.id === f.id)}
          eventHandlers={{ click: () => onSelect(seleccionado?.id === f.id ? null : f) }}
        />
      ))}
    </MapContainer>
  );
}
