import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

const ESTADOS = {
  pendiente:      { label: 'Buscando profesional',            color: '#FFC043', emoji: '🔍' },
  aceptado:       { label: 'Profesional asignado',            color: '#05A357', emoji: '👷' },
  en_camino:      { label: 'Profesional en camino',           color: '#276EF1', emoji: '🚗' },
  precio_enviado: { label: 'Precio recibido — toca para pagar', color: '#276EF1', emoji: '💰' },
  pago_pendiente: { label: 'Pendiente confirmar efectivo',    color: '#7356BF', emoji: '💵' },
  pagado:         { label: 'Completado',                      color: '#05A357', emoji: '✅' },
  rechazado:      { label: 'Rechazado',                       color: '#E11900', emoji: '❌' },
};

const ACTIVOS = new Set(['pendiente', 'aceptado', 'en_camino', 'precio_enviado', 'pago_pendiente']);
const COMPLETADOS_RESEÑA = new Set(['pagado']);

export default function MisServiciosScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const clienteId = route.params?.clienteId || usuario?.id;
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!clienteId) { setCargando(false); return; }
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/clientes/${clienteId}/servicios`, { headers });
      setServicios(res.data || []);
    } catch (e) {
      console.log('[MisServicios] ERROR:', e?.response?.status, JSON.stringify(e?.response?.data));
    }
    finally { setCargando(false); setRefrescando(false); }
  }, [clienteId, token]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 10000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  const irAServicio = (sv) => {
    if (sv.estado === 'precio_enviado') {
      navigation.navigate('Pago', { servicio: { nombre: sv.tipo }, precio: sv.precio, servicioId: sv.id });
    } else {
      navigation.navigate('Confirmacion', { tipo: { nombre: sv.tipo }, urgente: sv.urgente, servicioId: sv.id, fontanero: sv.fontanero_id ? { nombre: sv.fontanero_nombre, id: sv.fontanero_id } : null });
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mis servicios</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Solicitud', { clienteId })}>
          <Text style={s.btnNuevoHeader}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.recurrentesLink} onPress={() => navigation.navigate('ServiciosRecurrentes')}>
        <Text style={s.recurrentesLinkText}>🔁 Servicios recurrentes (limpieza, mantenimiento...)</Text>
        <Text style={s.recurrentesLinkArrow}>→</Text>
      </TouchableOpacity>

      <ScrollView
        style={s.lista}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {cargando ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>⏳</Text>
            <Text style={s.vacioTitulo}>Cargando...</Text>
          </View>
        ) : servicios.length === 0 ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>🔧</Text>
            <Text style={s.vacioTitulo}>Sin servicios aún</Text>
            <Text style={s.vacioSub}>Tus solicitudes aparecerán aquí</Text>
            <TouchableOpacity style={s.btnNuevo} onPress={() => navigation.navigate('Solicitud', { clienteId })}>
              <Text style={s.btnNuevoText}>Solicitar fontanero →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          servicios.map(sv => {
            const estadoInfo = ESTADOS[sv.estado] || ESTADOS.pendiente;
            const esActivo = ACTIVOS.has(sv.estado);
            const esCompletado = COMPLETADOS_RESEÑA.has(sv.estado);
            const tieneOfertas = sv.num_ofertas > 0;

            return (
              <View key={sv.id} style={s.card}>
                {/* Cabecera — toca para ir al detalle */}
                <TouchableOpacity onPress={() => irAServicio(sv)} activeOpacity={0.85}>
                  <View style={s.cardHeader}>
                    <View style={s.tipoWrap}>
                      <Text style={s.tipoEmoji}>🔧</Text>
                      <View>
                        <Text style={s.tipoNombre}>{sv.tipo}</Text>
                        <Text style={s.tipoFecha}>
                          {sv.fecha ? new Date(sv.fecha).toLocaleDateString('es-ES') : 'Hoy'}
                          {sv.fontanero_nombre ? ` · ${sv.fontanero_nombre}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.estadoPill, { borderColor: estadoInfo.color, backgroundColor: estadoInfo.color + '22' }]}>
                      <Text style={[s.estadoPillText, { color: estadoInfo.color }]}>
                        {estadoInfo.emoji} {estadoInfo.label}
                      </Text>
                    </View>
                  </View>

                  {sv.precio && (
                    <View style={s.precioRow}>
                      <Text style={s.precioLabel}>Precio</Text>
                      <Text style={s.precioValor}>{sv.precio}€</Text>
                    </View>
                  )}

                  {sv.estado === 'precio_enviado' && (
                    <View style={s.btnPagarWrap}>
                      <Text style={s.btnPagarText}>💳 Tocar para pagar {sv.precio}€ →</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Acciones contextuales */}
                {(esActivo || esCompletado || tieneOfertas) && (
                  <View style={s.accionesRow}>
                    {/* Ofertas recibidas */}
                    {tieneOfertas && sv.estado === 'pendiente' && (
                      <TouchableOpacity
                        style={s.btnAccion}
                        onPress={() => navigation.navigate('OfertasCliente', { servicioId: sv.id, tipoServicio: sv.tipo })}
                      >
                        <Text style={s.btnAccionText}>💼 Ver {sv.num_ofertas} oferta{sv.num_ofertas > 1 ? 's' : ''}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Seguir en el mapa — solo cuando el profesional va en camino */}
                    {sv.estado === 'en_camino' && (
                      <TouchableOpacity
                        style={[s.btnAccion, s.btnAccionSeguir]}
                        onPress={() => navigation.navigate('Seguimiento', { servicioId: sv.id })}
                      >
                        <Text style={s.btnAccionTextSeguir}>🗺️ Seguir en el mapa</Text>
                      </TouchableOpacity>
                    )}

                    {/* Chat — solo cuando hay fontanero asignado */}
                    {esActivo && sv.fontanero_id && sv.estado !== 'pendiente' && (
                      <TouchableOpacity
                        style={s.btnAccion}
                        onPress={() => navigation.navigate('Chat', { servicioId: sv.id, otroNombre: sv.fontanero_nombre || 'Profesional' })}
                      >
                        <Text style={s.btnAccionText}>💬 Chat</Text>
                      </TouchableOpacity>
                    )}

                    {/* Reseña — solo completados */}
                    {esCompletado && (
                      <TouchableOpacity
                        style={[s.btnAccion, s.btnAccionDestacado]}
                        onPress={() => navigation.navigate('Resena', {
                          servicioId: sv.id,
                          fontanero: sv.fontanero_id ? { nombre: sv.fontanero_nombre, id: sv.fontanero_id } : null,
                          servicio: { nombre: sv.tipo },
                        })}
                      >
                        <Text style={[s.btnAccionText, s.btnAccionTextDestacado]}>⭐ Dejar reseña</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  btnNuevoHeader: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  recurrentesLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  recurrentesLinkText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  recurrentesLinkArrow: { color: colors.blue, fontSize: 16, fontWeight: 'bold' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  btnNuevo: { backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnNuevoText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { marginBottom: 10 },
  tipoWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipoEmoji: { fontSize: 28, backgroundColor: colors.bgCard2, borderRadius: 12, padding: 8 },
  tipoNombre: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 2 },
  tipoFecha: { color: colors.textMuted, fontSize: 12 },
  estadoPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignSelf: 'flex-start' },
  estadoPillText: { fontSize: 12, fontWeight: '600' },
  precioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border, marginBottom: 4 },
  precioLabel: { color: colors.textMuted, fontSize: 14 },
  precioValor: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  btnPagarWrap: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  btnPagarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  accionesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border },
  btnAccion: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border2 },
  btnAccionText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  btnAccionDestacado: { backgroundColor: '#1a1400', borderColor: colors.amber },
  btnAccionTextDestacado: { color: colors.amber },
  btnAccionSeguir: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  btnAccionTextSeguir: { color: colors.blue, fontWeight: '700', fontSize: 13 },
});
