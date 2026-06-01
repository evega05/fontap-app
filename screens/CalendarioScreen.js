import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CalendarioScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().toDateString());

  const cargar = useCallback(async () => {
    try {
      const [resAgenda, resServicios] = await Promise.allSettled([
        axios.get(`${API}/fontaneros/${userId}/agenda`, { headers }),
        axios.get(`${API}/fontaneros/${userId}/solicitudes`, { headers }),
      ]);
      let items = [];
      if (resAgenda.status === 'fulfilled') items = resAgenda.value.data || [];
      else if (resServicios.status === 'fulfilled') {
        items = (resServicios.value.data || [])
          .filter(s => s.fecha && (s.estado === 'aceptado' || s.estado === 'pendiente'))
          .map(s => ({ id: s.id, fecha: s.fecha, tipo: s.tipo, cliente: s.cliente_nombre || s.cliente, zona: s.zona, estado: s.estado, urgente: s.urgente }));
      }
      setCitas(items);
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [userId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + semanaOffset * 7);

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d;
  });

  const citasDelDia = citas.filter(c => {
    if (!c.fecha) return false;
    return new Date(c.fecha).toDateString() === diaSeleccionado;
  });

  const citasPorDia = (dia) => citas.filter(c => c.fecha && new Date(c.fecha).toDateString() === dia.toDateString()).length;

  const tipoEmoji = (tipo) => {
    const m = { Desatasco: '🚽', 'Fuga de agua': '💧', Caldera: '🔥', 'Grifo / ducha': '🚿', Radiador: '♨️' };
    return m[tipo] || '🔧';
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Calendario</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.semanaNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => setSemanaOffset(semanaOffset - 1)}>
          <Text style={s.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.mesTitulo}>
          {MESES[diasSemana[0].getMonth()]} {diasSemana[0].getFullYear()}
        </Text>
        <TouchableOpacity style={s.navBtn} onPress={() => setSemanaOffset(semanaOffset + 1)}>
          <Text style={s.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.semanaWrap}>
        {diasSemana.map((dia, i) => {
          const esHoy = dia.toDateString() === hoy.toDateString();
          const seleccionado = dia.toDateString() === diaSeleccionado;
          const nCitas = citasPorDia(dia);
          return (
            <TouchableOpacity
              key={i}
              style={[s.diaBtn, seleccionado && s.diaBtnActivo, esHoy && !seleccionado && s.diaBtnHoy]}
              onPress={() => setDiaSeleccionado(dia.toDateString())}
            >
              <Text style={[s.diaNombre, seleccionado && s.diaTextoActivo]}>{DIAS_SEMANA[dia.getDay()]}</Text>
              <Text style={[s.diaNum, seleccionado && s.diaTextoActivo, esHoy && !seleccionado && s.diaNumHoy]}>
                {dia.getDate()}
              </Text>
              {nCitas > 0 && (
                <View style={[s.diaDot, seleccionado && s.diaDotActivo]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.diaLabel}>
        {new Date(diaSeleccionado).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} /></View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {citasDelDia.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>📅</Text>
              <Text style={s.vacioTitulo}>Sin citas este día</Text>
              <Text style={s.vacioSub}>Tus trabajos programados aparecerán aquí</Text>
            </View>
          ) : (
            citasDelDia.map(c => (
              <View key={c.id} style={s.citaCard}>
                <View style={s.citaHoraWrap}>
                  <Text style={s.citaHora}>{c.fecha ? new Date(c.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
                  <View style={s.citaLinea} />
                </View>
                <View style={s.citaBody}>
                  <View style={s.citaTop}>
                    <Text style={s.citaTipo}>{tipoEmoji(c.tipo)} {c.tipo}</Text>
                    {c.urgente && <View style={s.urgenteBadge}><Text style={s.urgenteText}>⚡</Text></View>}
                  </View>
                  <Text style={s.citaCliente}>👤 {c.cliente || '—'}</Text>
                  <Text style={s.citaZona}>📍 {c.zona || 'Bilbao'}</Text>
                  <View style={[s.estadoPill, { borderColor: estadoColor(c.estado) }]}>
                    <Text style={[s.estadoText, { color: estadoColor(c.estado) }]}>{estadoLabel(c.estado)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function estadoColor(e) {
  if (e === 'aceptado') return '#05A357';
  if (e === 'completado' || e === 'pagado') return '#276EF1';
  return '#FFC043';
}
function estadoLabel(e) {
  if (e === 'aceptado') return '✅ Confirmado';
  if (e === 'pagado') return '💳 Pagado';
  if (e === 'completado') return '✓ Completado';
  return '⏳ Pendiente';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  semanaNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  navBtnText: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  mesTitulo: { color: colors.text, fontWeight: '600', fontSize: 16 },
  semanaWrap: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 4 },
  diaBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  diaBtnActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  diaBtnHoy: { borderColor: colors.blue },
  diaNombre: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  diaNum: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  diaTextoActivo: { color: '#fff' },
  diaNumHoy: { color: colors.blue },
  diaDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue, marginTop: 4 },
  diaDotActivo: { backgroundColor: '#fff' },
  diaLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginTop: 12, marginBottom: 4, textTransform: 'capitalize' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 40 },
  vacioEmoji: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  citaCard: { flexDirection: 'row', marginBottom: 16, gap: 14 },
  citaHoraWrap: { alignItems: 'center', width: 44 },
  citaHora: { color: colors.blue, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  citaLinea: { flex: 1, width: 2, backgroundColor: colors.border, borderRadius: 1 },
  citaBody: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  citaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  citaTipo: { color: colors.text, fontWeight: '700', fontSize: 14 },
  urgenteBadge: { backgroundColor: '#2d1515', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.red },
  urgenteText: { fontSize: 12 },
  citaCliente: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  citaZona: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  estadoPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  estadoText: { fontSize: 11, fontWeight: '600' },
});
