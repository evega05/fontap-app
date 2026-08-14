import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { avisar } from '../confirmar';

const API = 'https://fontap-backend-production.up.railway.app';
const ANCHO = Dimensions.get('window').width;
const GRAFICO_ANCHO = ANCHO - 72;
const GRAFICO_ALTO = 130;
const GRAFICO_VB_ANCHO = 320;
const GRAFICO_VB_ALTO = 110;
const GRAFICO_PAD = 14;

// Arma el path SVG del gráfico de ingresos a partir de los valores del período.
// Reemplaza a react-native-chart-kit, cuyo LineChart renderizaba un fondo blanco
// sólido en vez del translúcido de colors.bgCard configurado — un gráfico "roto"
// en producción que nunca se veía bien sobre el fondo oscuro de la app.
function construirGraficoIngresos(valores) {
  const max = Math.max(...valores, 1);
  const paso = GRAFICO_VB_ANCHO / (valores.length - 1 || 1);
  const puntos = valores.map((v, i) => ({
    x: i * paso,
    y: GRAFICO_VB_ALTO - GRAFICO_PAD - (v / max) * (GRAFICO_VB_ALTO - GRAFICO_PAD * 2),
  }));
  const linea = 'M ' + puntos.map(p => `${p.x} ${p.y}`).join(' L ');
  const area = `${linea} L ${GRAFICO_VB_ANCHO} ${GRAFICO_VB_ALTO} L 0 ${GRAFICO_VB_ALTO} Z`;
  return { linea, area, ultimo: puntos[puntos.length - 1] };
}

export default function EstadisticasScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [periodoIngresos, setPeriodoIngresos] = useState('semana');
  const [descargandoFiscal, setDescargandoFiscal] = useState(false);
  const [comparativa, setComparativa] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [resStats, resSolicitudes, resComparativa] = await Promise.allSettled([
        axios.get(`${API}/fontaneros/${userId}/estadisticas`, { headers }),
        axios.get(`${API}/fontaneros/${userId}/solicitudes`, { headers }),
        axios.get(`${API}/fontaneros/${userId}/comparativa-precio`, { headers }),
      ]);
      if (resComparativa.status === 'fulfilled') setComparativa(resComparativa.value.data);

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
          ingresos_totales: ingresos,
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

  const descargarResumenFiscal = async () => {
    if (descargandoFiscal) return;
    setDescargandoFiscal(true);
    const anio = new Date().getFullYear();
    try {
      const destino = `${FileSystem.cacheDirectory}resumen_fiscal_${anio}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${API}/fontaneros/${userId}/resumen-fiscal?anio=${anio}`,
        destino,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.status !== 200) {
        await FileSystem.deleteAsync(res.uri, { idempotent: true });
        avisar('Error', 'No se pudo descargar el resumen fiscal');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: `Resumen fiscal ${anio}` });
      } else {
        avisar('Resumen descargado', `Se guardó en: ${res.uri}`);
      }
    } catch (e) {
      avisar('Error', 'No se pudo descargar el resumen fiscal');
    } finally {
      setDescargandoFiscal(false);
    }
  };

  const valoresGrafico = periodoIngresos === 'semana'
    ? (stats?.ingresos_semana || [0, 0, 0, 0, 0, 0, 0])
    : (stats?.ingresos_mes || [0, 0, 0, 0]);
  const etiquetasGrafico = periodoIngresos === 'semana'
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  const grafico = construirGraficoIngresos(valoresGrafico);

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
          {/* Métrica principal */}
          <View style={s.hero}>
            <View style={s.heroLabelRow}>
              <Ionicons name="trending-up" size={14} color={colors.green} />
              <Text style={s.heroLabel}>Ingresos totales</Text>
            </View>
            <Text style={s.heroAmount}>{stats?.ingresos_totales ?? 0}€</Text>
            <Text style={s.heroSub}>
              {stats?.trabajos_completados
                ? `${Math.round((stats.ingresos_totales || 0) / stats.trabajos_completados)}€ de media por trabajo`
                : 'Todavía sin trabajos completados'}
            </Text>
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats?.trabajos_completados ?? 0}</Text>
              <Text style={s.statLabel}>Trabajos</Text>
            </View>
            <View style={[s.statItem, s.statItemDivider]}>
              <View style={s.statValueRow}>
                <Text style={s.statValue}>{stats?.valoracion_media ?? '—'}</Text>
                <Ionicons name="star" size={13} color={colors.amber} />
              </View>
              <Text style={s.statLabel}>Valoración</Text>
            </View>
            <View style={[s.statItem, s.statItemDivider]}>
              <Text style={s.statValue}>{stats?.tasa_aceptacion ?? 0}%</Text>
              <Text style={s.statLabel}>Aceptación</Text>
            </View>
          </View>

          {/* Gráfico de ingresos */}
          <View style={s.graficoCard}>
            <View style={s.graficoHeader}>
              <Text style={s.graficoTitulo}>Ingresos</Text>
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
            <View style={s.chartWrap}>
              <Svg width={GRAFICO_ANCHO} height={GRAFICO_ALTO} viewBox={`0 0 ${GRAFICO_VB_ANCHO} ${GRAFICO_VB_ALTO}`} preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="areaIngresos" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                    <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                  </SvgLinearGradient>
                </Defs>
                <Line x1="0" y1="20" x2={GRAFICO_VB_ANCHO} y2="20" stroke={colors.glassBorder} strokeWidth={1} />
                <Line x1="0" y1="55" x2={GRAFICO_VB_ANCHO} y2="55" stroke={colors.glassBorder} strokeWidth={1} />
                <Line x1="0" y1="90" x2={GRAFICO_VB_ANCHO} y2="90" stroke={colors.glassBorder} strokeWidth={1} />
                <Path d={grafico.area} fill="url(#areaIngresos)" />
                <Path d={grafico.linea} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx={grafico.ultimo.x} cy={grafico.ultimo.y} r={4.5} fill={colors.accent} stroke={colors.bg} strokeWidth={2.5} />
              </Svg>
            </View>
            <View style={s.chartLabels}>
              {etiquetasGrafico.map((l, i) => <Text key={i} style={s.chartLabel}>{l}</Text>)}
            </View>
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
                  ? `${Math.round((stats.ingresos_totales || 0) / stats.trabajos_completados)}€`
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

          {comparativa?.precio_propio_medio != null && comparativa?.precio_gremio_zona_medio != null && (
            <View style={s.resumenCard}>
              <Text style={s.resumenTitulo}>Tu precio frente al gremio en tu zona</Text>
              <View style={s.resumenFila}>
                <Text style={s.resumenLabel}>Tu precio medio</Text>
                <Text style={s.resumenValor}>{comparativa.precio_propio_medio}€</Text>
              </View>
              <View style={[s.resumenFila, { borderBottomWidth: 0 }]}>
                <Text style={s.resumenLabel}>Media del gremio en tu zona</Text>
                <Text style={s.resumenValor}>{comparativa.precio_gremio_zona_medio}€</Text>
              </View>
              {comparativa.diferencia_pct != null && (
                <Text style={[s.comparativaNota, { color: comparativa.diferencia_pct > 0 ? colors.amber : colors.green }]}>
                  {comparativa.diferencia_pct > 0
                    ? `Cobras un ${comparativa.diferencia_pct}% más que la media`
                    : comparativa.diferencia_pct < 0
                    ? `Cobras un ${Math.abs(comparativa.diferencia_pct)}% menos que la media`
                    : 'Estás justo en la media'}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={s.btnFiscal} onPress={descargarResumenFiscal} disabled={descargandoFiscal}>
            <Text style={s.btnFiscalText}>
              {descargandoFiscal ? 'Generando...' : `📄 Descargar resumen fiscal ${new Date().getFullYear()}`}
            </Text>
          </TouchableOpacity>
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
  hero: { backgroundColor: colors.blueLight, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(76,124,255,0.32)', padding: 18, marginBottom: 12 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  heroAmount: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginVertical: 4 },
  heroSub: { color: colors.textMuted, fontSize: 12.5 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statItemDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textFaint, fontSize: 10.5, fontWeight: '600', marginTop: 3 },
  graficoCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  graficoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  graficoTitulo: { color: colors.text, fontWeight: '600', fontSize: 15 },
  periodoTabs: { flexDirection: 'row', backgroundColor: colors.bgCard2, borderRadius: 10, padding: 2, gap: 2 },
  periodoTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  periodoTabActivo: { backgroundColor: colors.blue },
  periodoTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  periodoTabTextActivo: { color: '#fff' },
  chartWrap: { marginTop: 10, alignItems: 'center' },
  chartLabels: { flexDirection: 'row', marginTop: 6 },
  chartLabel: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 10.5, fontWeight: '600' },
  resumenCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  resumenTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 14 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  resumenLabel: { color: colors.textMuted, fontSize: 13 },
  resumenValor: { color: colors.text, fontSize: 13, fontWeight: '700' },
  comparativaNota: { fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  btnFiscal: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: colors.border },
  btnFiscalText: { color: colors.blue, fontWeight: '600', fontSize: 14 },
});
