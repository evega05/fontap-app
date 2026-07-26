import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';
import { useIdioma } from '../i18n';
import MapaFontaneros from './MapComponent';

const API = 'https://fontap-backend-production.up.railway.app';

export default function SeguimientoScreen({ navigation, route }) {
  const { servicioId } = route.params || {};
  const { token } = useAuth();
  const { t } = useIdioma();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const intervalo = useRef(null);

  const cargar = () => {
    axios.get(`${API}/servicios/${servicioId}/seguimiento`, { headers })
      .then((res) => setDatos(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // Refresca la posición cada 15 segundos mientras la pantalla está abierta
    intervalo.current = setInterval(cargar, 15000);
    return () => clearInterval(intervalo.current);
  }, [servicioId]);

  const tieneUbicacion = datos && datos.latitud != null && datos.longitud != null;
  const profesionalMarcador = tieneUbicacion ? [{
    id: 1, nombre: datos.fontanero_nombre || 'Profesional',
    latitud: datos.latitud, longitud: datos.longitud, disponible: true,
  }] : [];
  const destino = (datos && datos.latitud_cliente != null && datos.longitud_cliente != null)
    ? { latitud: datos.latitud_cliente, longitud: datos.longitud_cliente }
    : null;

  const minutosDesde = (iso) => {
    if (!iso) return null;
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    return Math.max(0, Math.round(diff));
  };
  const hace = datos ? minutosDesde(datos.ubicacion_actualizada) : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.mapaWrap}>
        {tieneUbicacion ? (
          <MapaFontaneros
            fontaneros={profesionalMarcador}
            seleccionado={profesionalMarcador[0]}
            onSelect={() => {}}
            miUbicacion={null}
            destino={destino}
          />
        ) : (
          <View style={s.sinMapa}>
            {cargando ? <ActivityIndicator color={colors.blue} size="large" />
              : <Text style={s.sinMapaText}>{t('sinUbicacion')}</Text>}
          </View>
        )}
      </View>

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.btnVolver}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={s.panel}>
        <View style={s.handle} />
        <Text style={s.titulo}>🚗 {t('enCamino')}</Text>
        {datos?.fontanero_nombre ? <Text style={s.nombre}>{datos.fontanero_nombre}</Text> : null}

        <View style={s.filaInfo}>
          {datos?.eta_minutos != null ? (
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>{t('llegadaAprox')}</Text>
              <Text style={s.infoValor}>{datos.eta_minutos} min</Text>
            </View>
          ) : null}
          {hace != null ? (
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>{t('ubicacionHace')}</Text>
              <Text style={s.infoValor}>{hace === 0 ? '<1 min' : `${hace} min`}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={s.btnRefrescar} onPress={cargar}>
          <Ionicons name="refresh" size={16} color={colors.blue} />
          <Text style={s.btnRefrescarText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  mapaWrap: { flex: 1 },
  sinMapa: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: colors.bgCard2 },
  sinMapaText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btnVolver: { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  panel: { backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border2, marginBottom: 18 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  nombre: { fontSize: 15, color: colors.textMuted, marginBottom: 18 },
  filaInfo: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  infoCard: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border2 },
  infoLabel: { color: colors.textFaint, fontSize: 12, marginBottom: 4 },
  infoValor: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  btnRefrescar: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 12 },
  btnRefrescarText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
});
