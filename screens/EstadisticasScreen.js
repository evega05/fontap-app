import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import axios from 'axios';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';
const ANCHO = Dimensions.get('window').width;

const CHART_CONFIG = {
  backgroundColor: colors.bgCard,
  backgroundGradientFrom: colors.bgCard,
  backgroundGradientTo: colors.bgCard,
  decimalPlaces: 0,
  color: (o = 1) => `rgba(39,110,241,${o})`,
  labelColor: (o = 1) => `rgba(128,128,160,${o})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.blue },
  propsForBackgroundLines: { stroke: colors.border },
};

export default function EstadisticasScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [periodoIngresos, setPeriodoIngresos] = useState('semana');

  const cargar = useCallback(async () => {
    try {
      const [resStats, resSolicitudes] = await Promise.allSettled([
        axios.get(`${API}/fontaneros/${userId}/estadisticas`, { headers }),
        axios.get(`${API}/fontaneros/${userId}/solicitudes`, { headers }),
      ]);

      if (resStats.status === 'fulfilled' && resStats.value.data) {
        setStats(resStats.value.data);
      } else if (resSolicitudes.status === 'fulfilled') {
        const todas = resSolicitudes.value.data || [];
        const completados = todas.filter(s => s.estado === 'pagado' || s.estado === 'completado');
        const ingresos = completados.reduce((sum, s) => sum + (s.precio || 0), 0);
        const valoraciones = completados.filter(s => s.valoracion).map(s => s.valoracion);
        const mediaVal = valoraciones.length ? (valoraciones.reduce((a, b) => a + b, 0) / valoraciones.length).toFixed(1) : null;
        const aceptadas = todas.filter(s => s.estado !== 'rechazado').length;
        const tasaAcep = todas.length ? Math.round((aceptadas / todas.length) * 100) : 0;
        setStats({
          trabajos_completados: completados.length,
          ingresos_total: ingresos,
          valoracion_media: mediaVal,
          tasa_aceptacion: tasaAcep,
          ingresos_semana: [0, 0, 0, 0, 0, 0, ingresos > 0 ? ingresos : 0],
          ingresos_mes: Array.from({ length: 4 }, (_, i) => i === 3 ? ingresos : 0),
          servicios_por_tipo: {},
          solicitudes_total: todas.length,
        });
      }
    } catch (e) {}
    finally { setCargando(false); setRefrescando(false); }
  }, [userId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const datosLinea = {
    labels: periodoIngresos === 'semana'
      ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      : ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [{
      data: periodoIngresos === 'semana'
        ? (stats?.ingresos_semana || [0, 0, 0, 0, 0, 0, 0])
        : (stats?.ingresos_mes || [0, 0, 0, 0]),
      color: (o = 1) => `rgba(39,110,241,${o})`,
      strokeWidth: 2,
    }],
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Estadísticas</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {/* KPIs principales */}
          <View style={s.kpiGrid}>
            <View style={[s.kpiCard, s.kpiBlue]}>
              <Text style={s.kpiEmoji}>✅</Text>
              <Text style={s.kpiNum}>{stats?.trabajos_completados ?? 0}</Text>
              <Text style={s.kpiLabel}>Trabajos completados</Text>
            </View>
            <View style={[s.kpiCard, s.kpiGreen]}>
              <Text style={s.kpiEmoji}>💰</Text>
              <Text style={s.kpiNum}>{stats?.ingresos_total ?? 0}€</Text>
              <Text style={s.kpiLabel}>Ingresos totales</Text>
            </View>
          </View>
          <View style={s.kpiGrid}>
            <View style={[s.kpiCard, s.kpiAmber]}>
              <Text style={s.kpiEmoji}>⭐</Text>
              <Text style={s.kpiNum}>{stats?.valoracion_media ?? '—'}</Text>
              <Text style={s.kpiLabel}>Valoración media</Text>
            </View>
            <View style={[s.kpiCard, s.kpiPurple]}>
              <Text style={s.kpiEmoji}>📈</Text>
              <Text style={s.kpiNum}>{stats?.tasa_aceptacion ?? 0}%</Text>
              <Text style={s.kpiLabel}>Tasa de aceptación</Text>
            </View>
          </View>

          {/* Gráfico de ingresos */}
          <View style={s.graficoCard}>
            <View style={s.graficoHeader}>
              <Text style={s.graficoTitulo}>💰 Ingresos</Text>
              <View style={s.periodoTabs}>
                <TouchableOpacity
                  style={[s.periodoTab, periodoIngresos === 'semana' && s.periodoTabActivo]}
                  onPress={() => setPeriodoIngresos('semana')}
                >
                  <Text style={[s.periodoTabText, periodoIngresos === 'semana' && s.periodoTabTextActivo]}>Semana</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.periodoTab, periodoIngresos === 'mes' && s.periodoTabActivo]}
                  onPress={() => setPeriodoIngresos('mes')}
                >
                  <Text style={[s.periodoTabText, periodoIngresos === 'mes' && s.periodoTabTextActivo]}>Mes</Text>
                </TouchableOpacity>
              </View>
            </View>
            <LineChart
              data={datosLinea}
              width={ANCHO - 72}
              height={160}
              chartConfig={CHART_CONFIG}
              bezier
              style={{ borderRadius: 12, marginTop: 8 }}
              withInnerLines
              withOuterLines={false}
            />
          </View>

          {/* Resumen adicional */}
          <View style={s.resumenCard}>
            <Text style={s.resumenTitulo}>Resumen de actividad</Text>
            <View style={s.resumenFila}>
              <Text style={s.resumenLabel}>Total solicitudes recibidas</Text>
              <Text style={s.resumenValor}>{stats?.solicitudes_total ?? 0}</Text>
            </View>
            <View style={s.resumenFila}>
              <Text style={s.resumenLabel}>Trabajos completados</Text>
              <Text style={[s.resumenValor, { color: colors.green }]}>{stats?.trabajos_completados ?? 0}</Text>
            </View>
            <View style={s.resumenFila}>
              <Text style={s.resumenLabel}>Ingresos medios por trabajo</Text>
              <Text style={s.resumenValor}>
                {stats?.trabajos_completados
                  ? `${Math.round((stats.ingresos_total || 0) / stats.trabajos_completados)}€`
                  : '—'}
              </Text>
            </View>
            <View style={[s.resumenFila, { borderBottomWidth: 0 }]}>
              <Text style={s.resumenLabel}>Valoración media</Text>
              <Text style={[s.resumenValor, { color: colors.amber }]}>
                {stats?.valoracion_media ? `${stats.valoracion_media} ⭐` : '—'}
              </Text>
            </View>
          </View>

          {/* Estrellas visuales */}
          {stats?.valoracion_media && (
            <View style={s.estrellasCard}>
              <Text style={s.estrellasTitulo}>Tu valoración</Text>
              <View style={s.estrellasRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Text key={i} style={[s.estrella, i <= Math.round(stats.valoracion_media) && s.estrellaActiva]}>
                    {i <= Math.round(stats.valoracion_media) ? '★' : '☆'}
                  </Text>
                ))}
                <Text style={s.estrellasNum}>{stats.valoracion_media}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1 },
  kpiBlue: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  kpiGreen: { backgroundColor: colors.greenLight, borderColor: colors.green },
  kpiAmber: { backgroundColor: '#1a1400', borderColor: colors.amber },
  kpiPurple: { backgroundColor: '#160f2a', borderColor: colors.purple },
  kpiEmoji: { fontSize: 24, marginBottom: 8 },
  kpiNum: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  kpiLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  graficoCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  graficoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  graficoTitulo: { color: colors.text, fontWeight: '600', fontSize: 15 },
  periodoTabs: { flexDirection: 'row', backgroundColor: colors.bgCard2, borderRadius: 10, padding: 2, gap: 2 },
  periodoTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  periodoTabActivo: { backgroundColor: colors.blue },
  periodoTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  periodoTabTextActivo: { color: '#fff' },
  resumenCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  resumenTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 14 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  resumenLabel: { color: colors.textMuted, fontSize: 13 },
  resumenValor: { color: colors.text, fontSize: 13, fontWeight: '700' },
  estrellasCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  estrellasTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 12 },
  estrellasRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estrella: { fontSize: 32, color: colors.textFaint },
  estrellaActiva: { color: colors.amber },
  estrellasNum: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginLeft: 8 },
});
