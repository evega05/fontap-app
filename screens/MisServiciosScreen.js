import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

const ESTADOS = {
  pendiente: { label: 'Buscando fontanero', color: '#FFC043', emoji: '🔍' },
  aceptado: { label: 'Fontanero en camino', color: '#05A357', emoji: '🚗' },
  precio_enviado: { label: 'Precio recibido — toca para pagar', color: '#276EF1', emoji: '💰' },
  pago_pendiente: { label: 'Pendiente confirmar efectivo', color: '#7356BF', emoji: '💵' },
  pagado: { label: 'Completado', color: '#05A357', emoji: '✅' },
  rechazado: { label: 'Rechazado', color: '#E11900', emoji: '❌' },
};

export default function MisServiciosScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const clienteId = route.params?.clienteId || usuario?.id;
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!clienteId) { setCargando(false); return; }
    try {
      const res = await axios.get(`${API}/clientes/${clienteId}/servicios`);
      setServicios(res.data || []);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [clienteId]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 10000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mis servicios</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.blue} />}>

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
            return (
              <TouchableOpacity key={sv.id} style={s.card}
                onPress={() => {
                  if (sv.estado === 'precio_enviado') {
                    navigation.navigate('Pago', { servicio: { nombre: sv.tipo }, precio: sv.precio, servicioId: sv.id });
                  } else {
                    navigation.navigate('Confirmacion', { tipo: { nombre: sv.tipo }, urgente: sv.urgente, servicioId: sv.id });
                  }
                }}>
                <View style={s.cardHeader}>
                  <View style={s.tipoWrap}>
                    <Text style={s.tipoEmoji}>🔧</Text>
                    <View>
                      <Text style={s.tipoNombre}>{sv.tipo}</Text>
                      <Text style={s.tipoFecha}>{sv.fecha ? new Date(sv.fecha).toLocaleDateString('es-ES') : 'Hoy'}</Text>
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
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  btnNuevo: { backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnNuevoText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { marginBottom: 12 },
  tipoWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipoEmoji: { fontSize: 28, backgroundColor: colors.bgCard2, borderRadius: 12, padding: 8 },
  tipoNombre: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 2 },
  tipoFecha: { color: colors.textMuted, fontSize: 12 },
  estadoPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignSelf: 'flex-start' },
  estadoPillText: { fontSize: 12, fontWeight: '600' },
  precioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border },
  precioLabel: { color: colors.textMuted, fontSize: 14 },
  precioValor: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  btnPagarWrap: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  btnPagarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
}); 
