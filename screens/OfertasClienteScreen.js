import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function OfertasClienteScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const { servicioId, tipoServicio } = route.params || {};
  const clienteId = usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/servicios/${servicioId}/ofertas`, { headers });
      setOfertas(res.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [servicioId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const aceptarOferta = async (ofertaId, fontaneroNombre) => {
    Alert.alert(
      '¿Aceptar oferta?',
      `Vas a contratar a ${fontaneroNombre}. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar', onPress: async () => {
            setProcesando(ofertaId);
            try {
              await axios.put(`${API}/servicios/${servicioId}/ofertas/${ofertaId}/aceptar`, null, { headers });
              Alert.alert('✅ ¡Oferta aceptada!', `${fontaneroNombre} ha sido notificado y está en camino.`);
              navigation.navigate('Confirmacion', { servicioId, tipo: { nombre: tipoServicio } });
            } catch (e) {
              Alert.alert('Error', 'No se pudo aceptar la oferta');
            } finally {
              setProcesando(null);
            }
          }
        }
      ]
    );
  };

  const rechazarOferta = async (ofertaId, fontaneroNombre) => {
    setProcesando(ofertaId);
    try {
      await axios.put(`${API}/servicios/${servicioId}/ofertas/${ofertaId}/rechazar`, null, { headers });
      setOfertas(prev => prev.filter(o => o.id !== ofertaId));
    } catch (e) {
      Alert.alert('Error', 'No se pudo rechazar la oferta');
    } finally {
      setProcesando(null);
    }
  };

  const ofertasPendientes = ofertas.filter(o => !o.estado || o.estado === 'pendiente');
  const ofertasGestionadas = ofertas.filter(o => o.estado && o.estado !== 'pendiente');

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.titulo}>Ofertas recibidas</Text>
          {tipoServicio && <Text style={s.subtitulo}>{tipoServicio}</Text>}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {ofertas.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>⏳</Text>
              <Text style={s.vacioTitulo}>Sin ofertas aún</Text>
              <Text style={s.vacioSub}>Los profesionales disponibles enviarán sus propuestas en breve</Text>
            </View>
          ) : (
            <>
              {ofertasPendientes.length > 0 && (
                <>
                  <Text style={s.seccionTitulo}>
                    💼 Propuestas recibidas ({ofertasPendientes.length})
                  </Text>
                  {ofertasPendientes.map(o => (
                    <View key={o.id} style={s.ofertaCard}>
                      <View style={s.ofertaTop}>
                        <View style={s.avatarWrap}>
                          <View style={s.avatar}>
                            <Text style={s.avatarText}>{(o.fontanero_nombre || 'F')[0].toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={s.ofertaInfo}>
                          <Text style={s.fontaneroNombre}>{o.fontanero_nombre || 'Fontanero'}</Text>
                          {o.fontanero_valoracion && (
                            <Text style={s.fontaneroVal}>⭐ {o.fontanero_valoracion} · {o.fontanero_trabajos ?? 0} trabajos</Text>
                          )}
                          {o.fontanero_zona && <Text style={s.fontaneroZona}>📍 {o.fontanero_zona}</Text>}
                        </View>
                        <View style={s.precioWrap}>
                          <Text style={s.precio}>{o.precio}€</Text>
                          <Text style={s.precioLabel}>oferta</Text>
                        </View>
                      </View>

                      {o.mensaje ? (
                        <View style={s.mensajeWrap}>
                          <Text style={s.mensajeTexto}>"{o.mensaje}"</Text>
                        </View>
                      ) : null}

                      {o.tiempo_estimado && (
                        <Text style={s.tiempoEstimado}>🕐 Puede llegar en {o.tiempo_estimado}</Text>
                      )}

                      <View style={s.botonesRow}>
                        <TouchableOpacity
                          style={s.btnRechazar}
                          onPress={() => rechazarOferta(o.id, o.fontanero_nombre)}
                          disabled={procesando === o.id}
                        >
                          <Text style={s.btnRechazarText}>✕ Rechazar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.btnAceptar, procesando === o.id && s.btnDisabled]}
                          onPress={() => aceptarOferta(o.id, o.fontanero_nombre)}
                          disabled={procesando === o.id}
                        >
                          <Text style={s.btnAceptarText}>
                            {procesando === o.id ? 'Procesando...' : '✓ Aceptar oferta'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {ofertasGestionadas.length > 0 && (
                <>
                  <Text style={[s.seccionTitulo, { marginTop: 16 }]}>Historial</Text>
                  {ofertasGestionadas.map(o => (
                    <View key={o.id} style={[s.ofertaCard, s.ofertaCardHistorial]}>
                      <View style={s.ofertaTop}>
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{(o.fontanero_nombre || 'F')[0].toUpperCase()}</Text>
                        </View>
                        <View style={s.ofertaInfo}>
                          <Text style={s.fontaneroNombre}>{o.fontanero_nombre}</Text>
                        </View>
                        <View style={s.precioWrap}>
                          <Text style={[s.precio, { fontSize: 16 }]}>{o.precio}€</Text>
                          <View style={[s.estadoPill, { borderColor: estadoColor(o.estado) }]}>
                            <Text style={[s.estadoText, { color: estadoColor(o.estado) }]}>{estadoLabel(o.estado)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function estadoColor(e) { return e === 'aceptada' ? colors.green : colors.red; }
function estadoLabel(e) { return e === 'aceptada' ? '✅ Aceptada' : '❌ Rechazada'; }

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  subtitulo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 12, letterSpacing: 0.3 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  ofertaCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  ofertaCardHistorial: { opacity: 0.7 },
  ofertaTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  avatarWrap: {},
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  ofertaInfo: { flex: 1 },
  fontaneroNombre: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  fontaneroVal: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  fontaneroZona: { color: colors.textMuted, fontSize: 12 },
  precioWrap: { alignItems: 'flex-end' },
  precio: { color: colors.green, fontSize: 22, fontWeight: 'bold' },
  precioLabel: { color: colors.textMuted, fontSize: 11 },
  mensajeWrap: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  mensajeTexto: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  tiempoEstimado: { color: colors.textMuted, fontSize: 12, marginBottom: 12 },
  botonesRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnRechazar: { flex: 1, backgroundColor: colors.redLight, borderRadius: 14, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  btnRechazarText: { color: colors.red, fontWeight: 'bold', fontSize: 14 },
  btnAceptar: { flex: 1, backgroundColor: colors.green, borderRadius: 14, padding: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnAceptarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  estadoPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginTop: 4 },
  estadoText: { fontSize: 11, fontWeight: '600' },
});
