import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function OfertasScreen({ navigation }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [serviciosAbiertos, setServiciosAbiertos] = useState([]);
  const [misOfertas, setMisOfertas] = useState([]);
  const [tab, setTab] = useState('disponibles');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ofertando, setOfertando] = useState(null);
  const [precioOferta, setPrecioOferta] = useState('');
  const [mensajeOferta, setMensajeOferta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resAbiertos, resMis] = await Promise.allSettled([
        axios.get(`${API}/servicios/abiertos`, { headers }),
        axios.get(`${API}/fontaneros/${usuario?.id}/ofertas`, { headers }),
      ]);
      if (resAbiertos.status === 'fulfilled') setServiciosAbiertos(resAbiertos.value.data || []);
      if (resMis.status === 'fulfilled') setMisOfertas(resMis.value.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [usuario?.id, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const enviarOferta = async () => {
    if (!precioOferta || !ofertando) return;
    setEnviando(true);
    try {
      await axios.post(`${API}/servicios/${ofertando.id}/ofertas`, {
        precio: parseInt(precioOferta),
        mensaje: mensajeOferta,
      }, { headers });
      Alert.alert('✅ Oferta enviada', 'El cliente recibirá tu propuesta');
      setOfertando(null);
      setPrecioOferta('');
      setMensajeOferta('');
      cargar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la oferta');
    } finally {
      setEnviando(false);
    }
  };

  const tipoEmoji = (tipo) => {
    const m = { Desatasco: '🚽', 'Fuga de agua': '💧', Caldera: '🔥', 'Grifo / ducha': '🚿', Radiador: '♨️' };
    return m[tipo] || '🔧';
  };

  return (
    <View style={s.container}>
      {ofertando && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>💼 Enviar oferta</Text>
            <Text style={s.modalSub}>{tipoEmoji(ofertando.tipo)} {ofertando.tipo} · {ofertando.zona || 'Bilbao'}</Text>
            <Text style={s.modalLabel}>Tu precio (€)</Text>
            <View style={s.modalInputWrap}>
              <TextInput
                style={s.modalInput}
                placeholder="0"
                placeholderTextColor="#555"
                value={precioOferta}
                onChangeText={setPrecioOferta}
                keyboardType="numeric"
              />
              <Text style={s.euro}>€</Text>
            </View>
            <Text style={s.modalLabel}>Mensaje al cliente (opcional)</Text>
            <TextInput
              style={s.modalTextarea}
              placeholder="Explica brevemente tu oferta..."
              placeholderTextColor="#555"
              value={mensajeOferta}
              onChangeText={setMensajeOferta}
              multiline
            />
            <TouchableOpacity
              style={[s.modalBtn, (!precioOferta || enviando) && s.modalBtnOff]}
              onPress={enviarOferta}
              disabled={!precioOferta || enviando}
            >
              <Text style={s.modalBtnText}>{enviando ? 'Enviando...' : 'Enviar oferta →'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelar} onPress={() => { setOfertando(null); setPrecioOferta(''); setMensajeOferta(''); }}>
              <Text style={s.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mercado de trabajos</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'disponibles' && s.tabActivo]} onPress={() => setTab('disponibles')}>
          <Text style={[s.tabText, tab === 'disponibles' && s.tabTextActivo]}>Disponibles</Text>
          {serviciosAbiertos.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{serviciosAbiertos.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'mis' && s.tabActivo]} onPress={() => setTab('mis')}>
          <Text style={[s.tabText, tab === 'mis' && s.tabTextActivo]}>Mis ofertas</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {tab === 'disponibles' ? (
            serviciosAbiertos.length === 0 ? (
              <View style={s.vacio}>
                <Text style={s.vacioEmoji}>🔍</Text>
                <Text style={s.vacioTitulo}>Sin trabajos ahora</Text>
                <Text style={s.vacioSub}>Los nuevos avisos aparecerán aquí</Text>
              </View>
            ) : (
              serviciosAbiertos.map(sv => (
                <View key={sv.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.tipoWrap}>
                      <Text style={s.tipoEmoji}>{tipoEmoji(sv.tipo)}</Text>
                      <View>
                        <Text style={s.tipoNombre}>{sv.tipo}</Text>
                        <Text style={s.tipoZona}>📍 {sv.zona || 'Bilbao'}</Text>
                      </View>
                    </View>
                    {sv.urgente && (
                      <View style={s.urgenteBadge}><Text style={s.urgenteText}>⚡ URGENTE</Text></View>
                    )}
                  </View>
                  {sv.descripcion ? <Text style={s.cardDesc}>{sv.descripcion}</Text> : null}
                  <View style={s.cardFooter}>
                    <Text style={s.cardFecha}>{sv.fecha ? new Date(sv.fecha).toLocaleDateString('es-ES') : 'Hoy'}</Text>
                    <TouchableOpacity style={s.btnOfertar} onPress={() => setOfertando(sv)}>
                      <Text style={s.btnOfertarText}>Hacer oferta →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            misOfertas.length === 0 ? (
              <View style={s.vacio}>
                <Text style={s.vacioEmoji}>💼</Text>
                <Text style={s.vacioTitulo}>Sin ofertas enviadas</Text>
                <Text style={s.vacioSub}>Tus propuestas aparecerán aquí</Text>
              </View>
            ) : (
              misOfertas.map(o => (
                <View key={o.id} style={s.ofertaCard}>
                  <View style={s.ofertaTop}>
                    <Text style={s.ofertaTipo}>{tipoEmoji(o.tipo)} {o.tipo}</Text>
                    <View style={[s.ofertaEstado, { borderColor: estadoColor(o.estado) }]}>
                      <Text style={[s.ofertaEstadoText, { color: estadoColor(o.estado) }]}>
                        {estadoLabel(o.estado)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.ofertaPrecio}>{o.precio}€</Text>
                  {o.mensaje ? <Text style={s.ofertaMensaje}>"{o.mensaje}"</Text> : null}
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

function estadoColor(estado) {
  if (estado === 'aceptada') return '#05A357';
  if (estado === 'rechazada') return '#E11900';
  return '#FFC043';
}
function estadoLabel(estado) {
  if (estado === 'aceptada') return '✅ Aceptada';
  if (estado === 'rechazada') return '❌ Rechazada';
  return '⏳ Pendiente';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, margin: 20, width: '90%', borderWidth: 1, borderColor: colors.border },
  modalTitulo: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  modalSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  modalInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border2 },
  modalInput: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 22, fontWeight: 'bold' },
  euro: { color: colors.green, fontSize: 22, fontWeight: 'bold' },
  modalTextarea: { backgroundColor: colors.bg, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border2, marginBottom: 16 },
  modalBtn: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center' },
  modalBtnOff: { opacity: 0.4 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalCancelar: { marginTop: 12, alignItems: 'center' },
  modalCancelarText: { color: colors.textMuted, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgCard, gap: 6, borderWidth: 1, borderColor: colors.border },
  tabActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  tabTextActivo: { color: colors.blue },
  badge: { backgroundColor: colors.red, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14 },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tipoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipoEmoji: { fontSize: 28 },
  tipoNombre: { color: colors.text, fontWeight: '700', fontSize: 15 },
  tipoZona: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  urgenteBadge: { backgroundColor: '#2d1515', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.red },
  urgenteText: { color: colors.red, fontSize: 11, fontWeight: 'bold' },
  cardDesc: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 10, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 },
  cardFecha: { color: colors.textMuted, fontSize: 12 },
  btnOfertar: { backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnOfertarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  ofertaCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  ofertaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ofertaTipo: { color: colors.text, fontWeight: '600', fontSize: 14 },
  ofertaEstado: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  ofertaEstadoText: { fontSize: 12, fontWeight: '600' },
  ofertaPrecio: { color: colors.green, fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  ofertaMensaje: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});
