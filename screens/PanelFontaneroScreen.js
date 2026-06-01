import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Alert, Dimensions } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { LineChart } from 'react-native-chart-kit';

const ANCHO = Dimensions.get('window').width;

const API = 'https://fontap-backend-production.up.railway.app';

function getSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function PanelFontaneroScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const nombre = usuario?.nombre || route.params?.nombre || 'Fontanero';
  const userId = route.params?.userId || usuario?.id || 1;

  const [disponible, setDisponible] = useState(true);
  const [disponible24h, setDisponible24h] = useState(false);
  const [tab, setTab] = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [completados, setCompletados] = useState([]);
  const [trabajoActivo, setTrabajoActivo] = useState(null);
  const [precioFinal, setPrecioFinal] = useState('');
  const [mostrarPrecio, setMostrarPrecio] = useState(false);
  const [cargando, setCargando] = useState(true);

  const pollingRef = useRef(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const cargarSolicitudes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/solicitudes`, { headers });
      const todas = res.data || [];
      setPendientes(todas.filter(s => s.estado === 'pendiente'));
      setCompletados(todas.filter(s => s.estado === 'completado' || s.estado === 'pagado'));
    } catch (e) {}
    finally {
      setCargando(false);
    }
  }, [userId, token]);

  useEffect(() => {
    cargarSolicitudes();
    pollingRef.current = setInterval(cargarSolicitudes, 5000);
    return () => clearInterval(pollingRef.current);
  }, [cargarSolicitudes]);

  const toggleDisponible = async (valor) => {
    setDisponible(valor);
    try {
      await axios.put(`${API}/fontaneros/${userId}/disponibilidad`, { disponible: valor }, { headers });
    } catch (e) {}
  };

  const toggle24h = async (valor) => {
    setDisponible24h(valor);
    try {
      await axios.put(`${API}/fontaneros/${userId}/disponibilidad`, { disponible, disponible_24h: valor }, { headers });
    } catch (e) {}
  };

  const aceptar = async (trabajo) => {
    try {
      await axios.put(`${API}/servicios/${trabajo.id}/aceptar`, null, { params: { fontanero_id: userId }, headers });
      setPendientes(prev => prev.filter(t => t.id !== trabajo.id));
      setTrabajoActivo(trabajo);
      setMostrarPrecio(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const rechazar = async (id) => {
    try {
      await axios.put(`${API}/servicios/${id}/rechazar`, null, { headers });
      setPendientes(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const enviarPrecio = async () => {
    if (!precioFinal || !trabajoActivo) return;
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/precio`, { precio: parseInt(precioFinal) }, { headers });
      setCompletados(prev => [{
        id: trabajoActivo.id,
        cliente: trabajoActivo.cliente_nombre || trabajoActivo.cliente,
        servicio: trabajoActivo.tipo || trabajoActivo.servicio,
        zona: trabajoActivo.zona || '—',
        precio: parseInt(precioFinal),
        valoracion: 0,
        fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        pendientePago: true,
      }, ...prev]);
      setMostrarPrecio(false);
      setTrabajoActivo(null);
      setPrecioFinal('');
      Alert.alert('✅ Precio enviado', 'El cliente puede ver el precio y proceder al pago');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el precio');
    }
  };

  const gananciasTotal = completados.reduce((sum, t) => sum + (t.precio || 0), 0);

  const datosGrafico = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [{
      data: [45, 80, 60, 120, 90, 150, gananciasTotal > 0 ? gananciasTotal : 75],
      color: (opacity = 1) => `rgba(39, 110, 241, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  return (
    <View style={s.container}>
      {mostrarPrecio && trabajoActivo && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>🔧 Trabajo en curso</Text>
            <Text style={s.modalSub}>Cuando termines, indica el precio final al cliente</Text>
            <Text style={s.modalCliente}>
              {trabajoActivo.cliente_nombre || trabajoActivo.cliente} · {trabajoActivo.tipo || trabajoActivo.servicio}
            </Text>
            <Text style={s.modalSeccion}>💰 Precio del servicio</Text>
            <View style={s.modalInput}>
              <TextInput
                style={s.modalInputText}
                placeholder="0"
                placeholderTextColor="#555"
                value={precioFinal}
                onChangeText={setPrecioFinal}
                keyboardType="numeric"
              />
              <Text style={s.modalEuro}>€</Text>
            </View>
            <TouchableOpacity style={[s.modalBtn, !precioFinal && s.modalBtnDesactivado]} disabled={!precioFinal} onPress={enviarPrecio}>
              <Text style={s.modalBtnText}>Enviar precio al cliente →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelar} onPress={() => setMostrarPrecio(false)}>
              <Text style={s.modalCancelarText}>Seguir trabajando</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.header}>
        <View>
          <Text style={s.saludo}>{getSaludo()} 👋</Text>
          <Text style={s.nombre}>{nombre}</Text>
          <Text style={s.idText}>ID: {userId}</Text>
        </View>
        <TouchableOpacity style={s.perfilBtn} onPress={() => navigation.navigate('PerfilFontanero', { nombre })}>
          <Text style={s.perfilLetra}>{nombre[0]}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.disponibilidadCard}>
        <View style={s.disponibilidadLeft}>
          <View style={[s.indicador, disponible ? s.indicadorVerde : s.indicadorRojo]} />
          <View>
            <Text style={s.disponibilidadTitulo}>{disponible ? 'Visible para clientes' : 'No disponible'}</Text>
            <Text style={s.disponibilidadSub}>{disponible ? 'Estás recibiendo solicitudes' : 'Activa para recibir trabajos'}</Text>
          </View>
        </View>
        <Switch value={disponible} onValueChange={toggleDisponible}
          trackColor={{ false: '#2a2a3e', true: '#1e3a5f' }} thumbColor={disponible ? '#3b82f6' : '#555'} />
      </View>

      <View style={[s.disponibilidadCard, { marginTop: -8 }]}>
        <View style={s.disponibilidadLeft}>
          <Text style={{ fontSize: 20, marginRight: 10 }}>⚡</Text>
          <View>
            <Text style={s.disponibilidadTitulo}>Servicio 24 horas</Text>
            <Text style={s.disponibilidadSub}>{disponible24h ? 'Aceptas urgencias nocturnas' : 'Solo horario normal'}</Text>
          </View>
        </View>
        <Switch value={disponible24h} onValueChange={toggle24h}
          trackColor={{ false: '#2a2a3e', true: '#2d1a3e' }} thumbColor={disponible24h ? '#a855f7' : '#555'} />
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statEmoji}>⭐</Text>
          <Text style={s.statNum}>4.8</Text>
          <Text style={s.statLabel}>Valoración</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statEmoji}>✅</Text>
          <Text style={s.statNum}>{completados.length}</Text>
          <Text style={s.statLabel}>Trabajos</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statEmoji}>💰</Text>
          <Text style={s.statNum}>{gananciasTotal}€</Text>
          <Text style={s.statLabel}>Total ganado</Text>
        </View>
      </View>

      <View style={s.graficoWrap}>
        <View style={s.graficoHeader}>
          <Text style={s.graficoTitulo}>💰 Ingresos esta semana</Text>
          <Text style={s.graficoTotal}>{gananciasTotal}€</Text>
        </View>
        <LineChart
          data={datosGrafico}
          width={ANCHO - 40}
          height={140}
          chartConfig={{
            backgroundColor: '#0D0D1F',
            backgroundGradientFrom: '#0D0D1F',
            backgroundGradientTo: '#0D0D1F',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(39, 110, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(128, 128, 160, ${opacity})`,
            propsForDots: { r: '4', strokeWidth: '2', stroke: '#276EF1' },
            propsForBackgroundLines: { stroke: '#1E1E3F' },
          }}
          bezier
          style={{ borderRadius: 14, marginTop: 8 }}
          withInnerLines={true}
          withOuterLines={false}
        />
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'pendientes' && s.tabActivo]} onPress={() => setTab('pendientes')}>
          <Text style={[s.tabText, tab === 'pendientes' && s.tabTextActivo]}>Pendientes</Text>
          {pendientes.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{pendientes.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'completados' && s.tabActivo]} onPress={() => setTab('completados')}>
          <Text style={[s.tabText, tab === 'completados' && s.tabTextActivo]}>Completados</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ paddingBottom: 30 }}>
        {tab === 'pendientes' ? (
          cargando ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>⏳</Text>
              <Text style={s.vacioTitulo}>Cargando...</Text>
            </View>
          ) : pendientes.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>🎉</Text>
              <Text style={s.vacioTitulo}>¡Al día!</Text>
              <Text style={s.vacioSub}>No tienes solicitudes pendientes</Text>
            </View>
          ) : (
            pendientes.map(t => (
              <View key={t.id} style={s.trabajoCard}>
                <View style={s.trabajoHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(t.cliente_nombre || t.cliente || '?')[0]}</Text>
                  </View>
                  <View style={s.trabajoInfo}>
                    <Text style={s.trabajoCliente}>{t.cliente_nombre || t.cliente}</Text>
                    <Text style={s.trabajoZona}>📍 {t.zona || 'Bilbao'} · 🕐 {t.urgente ? 'Ahora' : '—'}</Text>
                  </View>
                  {t.urgente && <View style={s.urgenteBadge}><Text style={s.urgenteText}>⚡ URGENTE</Text></View>}
                </View>
                <View style={s.trabajoDetalle}>
                  <View style={s.servicioRow}>
                    <Text style={s.servicioEmoji}>🔧</Text>
                    <Text style={s.trabajoServicio}>{t.tipo || t.servicio}</Text>
                  </View>
                  {t.descripcion ? <Text style={s.descripcion}>{t.descripcion}</Text> : null}
                </View>
                <View style={s.botonesRow}>
                  <TouchableOpacity style={s.btnRechazar} onPress={() => rechazar(t.id)}>
                    <Text style={s.btnRechazarText}>✕ Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnAceptar} onPress={() => aceptar(t)}>
                    <Text style={s.btnAceptarText}>✓ Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          completados.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>📋</Text>
              <Text style={s.vacioTitulo}>Sin trabajos completados</Text>
              <Text style={s.vacioSub}>Aquí aparecerán tus trabajos finalizados</Text>
            </View>
          ) : (
            completados.map(t => (
              <View key={t.id} style={s.completadoCard}>
                <View style={s.trabajoHeader}>
                  <View style={s.avatarCompletado}>
                    <Text style={s.avatarText}>{(t.cliente_nombre || t.cliente || '?')[0]}</Text>
                  </View>
                  <View style={s.trabajoInfo}>
                    <Text style={s.trabajoCliente}>{t.cliente_nombre || t.cliente}</Text>
                    <Text style={s.trabajoZona}>📍 {t.zona || '—'} · 📅 {t.fecha}</Text>
                  </View>
                  <Text style={s.completadoPrecio}>+{t.precio}€</Text>
                </View>
                <View style={s.valoracionRow}>
                  <Text style={s.trabajoServicio}>{t.tipo || t.servicio}</Text>
                  {t.pendientePago && <View style={s.pendienteBadge}><Text style={s.pendienteText}>⏳ Pendiente pago</Text></View>}
                  <View style={s.estrellasRow}>
                    {[1,2,3,4,5].map(i => <Text key={i} style={s.estrella}>{i <= (t.valoracion || 0) ? '⭐' : '☆'}</Text>)}
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: '#1e1e2e', borderRadius: 20, padding: 24, margin: 20, width: '90%', borderWidth: 1, borderColor: '#2a2a3e' },
  modalTitulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSub: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  modalCliente: { color: '#3b82f6', fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  modalSeccion: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  modalInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f1a', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  modalInputText: { flex: 1, color: '#fff', paddingVertical: 14, fontSize: 24, fontWeight: 'bold' },
  modalEuro: { color: '#4ade80', fontSize: 24, fontWeight: 'bold' },
  modalBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalBtnDesactivado: { opacity: 0.4 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalCancelar: { marginTop: 12, alignItems: 'center' },
  modalCancelarText: { color: '#aaa', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  saludo: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  nombre: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  idText: { color: '#3b82f6', fontSize: 11, marginTop: 2 },
  perfilBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  perfilLetra: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  disponibilidadCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e2e', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e' },
  disponibilidadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  indicador: { width: 10, height: 10, borderRadius: 5 },
  indicadorVerde: { backgroundColor: '#22c55e' },
  indicadorRojo: { backgroundColor: '#ef4444' },
  disponibilidadTitulo: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  disponibilidadSub: { color: '#aaa', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginVertical: 14 },
  statCard: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { color: '#aaa', fontSize: 11 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e1e2e', gap: 6, borderWidth: 1, borderColor: '#2a2a3e' },
  tabActivo: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  tabText: { color: '#aaa', fontWeight: '500', fontSize: 14 },
  tabTextActivo: { color: '#3b82f6' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  lista: { flex: 1, paddingHorizontal: 20 },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: '#aaa', fontSize: 14 },
  trabajoCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  trabajoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarCompletado: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  trabajoInfo: { flex: 1 },
  trabajoCliente: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 3 },
  trabajoZona: { color: '#aaa', fontSize: 12 },
  urgenteBadge: { backgroundColor: '#2d1515', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ef4444' },
  urgenteText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
  trabajoDetalle: { paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#2a2a3e', marginBottom: 12 },
  servicioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  servicioEmoji: { fontSize: 16 },
  trabajoServicio: { color: '#aaa', fontSize: 13 },
  descripcion: { color: '#666', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  botonesRow: { flexDirection: 'row', gap: 10 },
  btnRechazar: { flex: 1, backgroundColor: '#2d1515', borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  btnRechazarText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  btnAceptar: { flex: 1, backgroundColor: '#1a2e1a', borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' },
  btnAceptarText: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },
  completadoCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  completadoPrecio: { color: '#4ade80', fontWeight: 'bold', fontSize: 15 },
  valoracionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#2a2a3e' },
  pendienteBadge: { backgroundColor: '#1a2340', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#3b82f6' },
  pendienteText: { color: '#3b82f6', fontSize: 11, fontWeight: '600' },
  estrellasRow: { flexDirection: 'row' },
  estrella: { fontSize: 13 },
  graficoWrap: { backgroundColor: '#0D0D1F', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderColor: '#1E1E3F' },
  graficoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  graficoTitulo: { color: '#8080A0', fontSize: 13, fontWeight: '600' },
  graficoTotal: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
});