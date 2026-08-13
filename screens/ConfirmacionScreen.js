import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';
const TIMEOUT_URGENTE_MS = 3 * 60 * 1000; // aviso tras 3 min sin respuesta en urgencias
const HORAS_REPROGRAMAR = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'];
const ESTADOS_REPROGRAMABLES = new Set(['pendiente', 'aceptado', 'precio_enviado', 'precio_aceptado']);

const ESTADOS = {
  pendiente: { emoji: '🔍', titulo: 'Buscando profesional...', sub: 'Tu solicitud ha sido enviada', color: '#FFC043', paso: 1 },
  aceptado: { emoji: '👷', titulo: 'Profesional asignado', sub: 'Pronto recibirás un precio', color: '#05A357', paso: 1 },
  precio_enviado: { emoji: '💰', titulo: 'Precio recibido', sub: 'Revisa el precio y acéptalo para continuar', color: '#276EF1', paso: 2 },
  precio_aceptado: { emoji: '✅', titulo: 'Precio aceptado', sub: 'El profesional se pondrá en camino', color: '#276EF1', paso: 2 },
  en_camino: { emoji: '🚗', titulo: '¡Profesional en camino!', sub: 'El profesional va camino a tu domicilio', color: '#276EF1', paso: 3 },
  completado: { emoji: '🏁', titulo: 'Trabajo terminado', sub: 'Ya puedes pagar el servicio', color: '#05A357', paso: 4 },
  pago_pendiente: { emoji: '💵', titulo: 'Pago en confirmación', sub: 'Esperando que el profesional confirme el cobro', color: '#7356BF', paso: 4 },
  pagado: { emoji: '🎉', titulo: '¡Servicio completado!', sub: 'Gracias por usar Multiservicios Provenza', color: '#05A357', paso: 4 },
  cancelado: { emoji: '✕', titulo: 'Servicio cancelado', sub: 'Esta solicitud ya no está activa', color: '#ef4444', paso: 0 },
  rechazado: { emoji: '❌', titulo: 'Solicitud rechazada', sub: 'El profesional no pudo atender esta solicitud', color: '#E11900', paso: 0 },
};

export default function ConfirmacionScreen({ navigation, route }) {
  const { token } = useAuth();
  const { fontanero, tipo, urgente, servicioId, precio: precioProp, clienteId } = route.params || {};
  const [estado, setEstado] = useState('pendiente');
  const [precio, setPrecio] = useState(precioProp || null);
  const [actualizando, setActualizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [sinRespuesta, setSinRespuesta] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [modalReprogramar, setModalReprogramar] = useState(false);
  const [diaReprog, setDiaReprog] = useState(0);
  const [horaReprog, setHoraReprog] = useState(null);
  const [reprogramando, setReprogramando] = useState(false);
  const desdeRef = useRef(Date.now());

  const consultar = useCallback(async () => {
    if (!servicioId) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    setActualizando(true);
    try {
      const res = await axios.get(`${API}/servicios/${servicioId}`, { headers });
      const nuevoEstado = res.data.estado || 'pendiente';
      setEstado(nuevoEstado);
      if (res.data.precio) setPrecio(res.data.precio);
    } catch (e) {
      console.log('[Confirmacion] ERROR polling:', e?.response?.status, JSON.stringify(e?.response?.data));
    } finally {
      setActualizando(false);
    }
  }, [servicioId, token]);

  useEffect(() => {
    if (!servicioId) return;
    consultar();
    const intervalo = setInterval(consultar, 3000);
    return () => clearInterval(intervalo);
  }, [consultar, servicioId]);

  // Aviso si una solicitud urgente lleva demasiado tiempo sin que nadie la acepte
  useEffect(() => {
    if (!urgente || estado !== 'pendiente') { setSinRespuesta(false); return; }
    const chequeo = setInterval(() => {
      if (Date.now() - desdeRef.current > TIMEOUT_URGENTE_MS) setSinRespuesta(true);
    }, 5000);
    return () => clearInterval(chequeo);
  }, [urgente, estado]);

  const cancelarServicio = () => {
    if (!servicioId) return;
    confirmarAccion('Cancelar solicitud', '¿Seguro que quieres cancelar este servicio?', async () => {
      setCancelando(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(`${API}/servicios/${servicioId}/cancelar`, null, { headers });
        setEstado('cancelado');
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo cancelar el servicio'));
      } finally {
        setCancelando(false);
      }
    }, { textoConfirmar: 'Sí, cancelar', textoCancelar: 'No' });
  };

  const abrirReprogramar = () => {
    setDiaReprog(0);
    setHoraReprog(null);
    setModalReprogramar(true);
  };

  const confirmarReprogramar = async () => {
    if (!servicioId || !horaReprog) return;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diaReprog);
    const [h, m] = horaReprog.split(':').map(Number);
    fecha.setHours(h, m, 0, 0);
    setReprogramando(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/servicios/${servicioId}/reprogramar`, { fecha: fecha.toISOString() }, { headers });
      setModalReprogramar(false);
      avisar('Cita reprogramada', 'Se ha avisado a la otra parte del nuevo horario');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo reprogramar la cita'));
    } finally {
      setReprogramando(false);
    }
  };

  const aceptarPrecio = async () => {
    if (!servicioId) return;
    setAceptando(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await axios.put(`${API}/servicios/${servicioId}/precio/aceptar`, null, { headers });
      await consultar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo aceptar el precio'));
    } finally {
      setAceptando(false);
    }
  };

  const rechazarPrecio = () => {
    if (!servicioId) return;
    confirmarAccion('Rechazar precio', '¿Seguro que quieres rechazar este precio? El profesional podrá proponerte uno nuevo.', async () => {
      setAceptando(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await axios.put(`${API}/servicios/${servicioId}/precio/rechazar`, null, { headers });
        setPrecio(null);
        await consultar();
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo rechazar el precio'));
      } finally {
        setAceptando(false);
      }
    }, { textoConfirmar: 'Sí, rechazar', textoCancelar: 'No' });
  };

  const descargarRecibo = async () => {
    if (!servicioId) return;
    setDescargando(true);
    try {
      const destino = `${FileSystem.cacheDirectory}factura_${servicioId}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${API}/servicios/${servicioId}/factura`,
        destino,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.status !== 200) {
        await FileSystem.deleteAsync(res.uri, { idempotent: true });
        avisar('Error', 'No se pudo descargar el recibo');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Recibo Multiservicios Provenza' });
      } else {
        avisar('Recibo descargado', `Se guardó en: ${res.uri}`);
      }
    } catch (e) {
      avisar('Error', 'No se pudo descargar el recibo');
    } finally {
      setDescargando(false);
    }
  };

  const estadoActual = ESTADOS[estado] || ESTADOS.pendiente;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        {servicioId && (
          <TouchableOpacity onPress={consultar} disabled={actualizando} style={s.refreshBtn}>
            {actualizando
              ? <ActivityIndicator size="small" color={colors.blue} />
              : <Text style={s.refreshText}>🔄 Actualizar</Text>}
          </TouchableOpacity>
        )}
      </View>

      {!servicioId && (
        <View style={s.avisoSinId}>
          <Text style={s.avisoSinIdText}>
            ⚠️ No se pudo registrar el servicio. Vuelve atrás e inténtalo de nuevo.
          </Text>
        </View>
      )}

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={[s.estadoCirculo, { borderColor: estadoActual.color }]}>
          <Text style={s.estadoEmoji}>{estadoActual.emoji}</Text>
        </View>
        <Text style={[s.estadoTitulo, { color: estadoActual.color }]}>{estadoActual.titulo}</Text>
        <Text style={s.estadoSub}>{estadoActual.sub}</Text>

        {sinRespuesta && (
          <View style={s.avisoTimeout}>
            <Text style={s.avisoTimeoutTitulo}>⏱️ Nadie ha respondido todavía</Text>
            <Text style={s.avisoTimeoutText}>
              Puede que no haya profesionales disponibles cerca en este momento. Puedes seguir
              esperando o cancelar e intentarlo de nuevo más tarde.
            </Text>
          </View>
        )}

        <View style={s.progresoWrap}>
          {[1, 2, 3, 4].map(p => (
            <View key={p} style={s.progresoItem}>
              <View style={[s.progresoPunto, estadoActual.paso >= p && { backgroundColor: estadoActual.color }]}>
                <Text style={s.progresoPuntoText}>{p}</Text>
              </View>
              {p < 4 && <View style={[s.progresoLinea, estadoActual.paso > p && { backgroundColor: estadoActual.color }]} />}
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.fila}>
            <Text style={s.label}>Servicio</Text>
            <Text style={s.valor}>{tipo?.emoji} {tipo?.nombre}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Profesional</Text>
            <Text style={s.valor}>{fontanero?.nombre || 'Más cercano'}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Tipo</Text>
            <Text style={s.valor}>{urgente ? '⚡ Urgente' : '📅 Cita'}</Text>
          </View>
          <View style={[s.fila, { borderBottomWidth: 0 }]}>
            <Text style={s.label}>Precio</Text>
            {precio ? (
              <Text style={s.precioValor}>{precio}€</Text>
            ) : (
              <Text style={s.precioEspera}>Pendiente</Text>
            )}
          </View>
        </View>

        <View style={s.pasos}>
          <Text style={s.pasosTitulo}>¿Qué pasa ahora?</Text>
          {[
            { num: 1, texto: 'El profesional recibe tu solicitud', activo: estadoActual.paso >= 1 },
            { num: 2, texto: 'Te envía un precio y lo aceptas', activo: estadoActual.paso >= 2 },
            { num: 3, texto: 'Va a tu domicilio y hace el trabajo', activo: estadoActual.paso >= 3 },
            { num: 4, texto: 'Pagas y dejas una reseña', activo: estadoActual.paso >= 4 },
          ].map(p => (
            <View key={p.num} style={s.paso}>
              <View style={[s.pasoNumWrap, p.activo && { backgroundColor: estadoActual.color }]}>
                <Text style={s.pasoNum}>{p.activo ? '✓' : p.num}</Text>
              </View>
              <Text style={[s.pasoText, p.activo && { color: colors.text }]}>{p.texto}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {estado === 'precio_enviado' && precio && (
          <>
            <View style={s.precioCard}>
              <Text style={s.precioCardTitulo}>💰 Precio propuesto por el profesional</Text>
              <Text style={s.precioCardValor}>{precio}€</Text>
            </View>
            <TouchableOpacity style={s.btnPago} onPress={aceptarPrecio} disabled={aceptando}>
              {aceptando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnPagoText}>✅ Aceptar precio</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.btnRechazar} onPress={rechazarPrecio} disabled={aceptando}>
              <Text style={s.btnRechazarText}>✕ Rechazar precio</Text>
            </TouchableOpacity>
          </>
        )}
        {estado === 'precio_aceptado' && (
          <View style={s.precioCard}>
            <Text style={s.precioCardTitulo}>✅ Precio aceptado</Text>
            <Text style={s.precioCardValor}>{precio}€</Text>
            <Text style={s.precioCardSub}>Esperando a que el profesional vaya y termine el trabajo</Text>
          </View>
        )}
        {estado === 'completado' && precio && (
          <>
            <View style={s.precioCard}>
              <Text style={s.precioCardTitulo}>🏁 Trabajo terminado</Text>
              <Text style={s.precioCardValor}>{precio}€</Text>
            </View>
            <TouchableOpacity style={s.btnPago}
              onPress={() => navigation.navigate('Pago', { fontanero, servicio: tipo, precio, servicioId })}>
              <Text style={s.btnPagoText}>💶 Pagar {precio}€</Text>
            </TouchableOpacity>
          </>
        )}
        {estado === 'pagado' && (
          <>
            <TouchableOpacity style={s.btnResena}
              onPress={() => navigation.navigate('Resena', { fontanero, tipo, servicioId })}>
              <Text style={s.btnResenaText}>⭐ Dejar reseña</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnRecibo} onPress={descargarRecibo} disabled={descargando}>
              {descargando
                ? <ActivityIndicator size="small" color={colors.blue} />
                : <Text style={s.btnReciboText}>🧾 Descargar recibo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimario} onPress={() => navigation.navigate('Mapa')}>
              <Text style={s.btnPrimarioText}>Volver al inicio</Text>
            </TouchableOpacity>
          </>
        )}
        {['aceptado', 'precio_enviado', 'precio_aceptado', 'en_camino', 'completado', 'pago_pendiente'].includes(estado) && servicioId && (
          <TouchableOpacity
            style={[s.btnPrimario, { marginBottom: 10, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.blue }]}
            onPress={() => navigation.navigate('Chat', { servicioId, otroNombre: fontanero?.nombre || 'Profesional' })}
          >
            <Text style={[s.btnPrimarioText, { color: colors.blue }]}>💬 Chatear con el profesional</Text>
          </TouchableOpacity>
        )}
        {ESTADOS_REPROGRAMABLES.has(estado) && servicioId && (
          <TouchableOpacity style={s.btnReprogramar} onPress={abrirReprogramar}>
            <Text style={s.btnReprogramarText}>📅 Reprogramar cita</Text>
          </TouchableOpacity>
        )}
        {['pendiente', 'aceptado', 'precio_aceptado', 'en_camino'].includes(estado) && servicioId && (
          <TouchableOpacity style={s.btnRechazar} onPress={cancelarServicio} disabled={cancelando}>
            {cancelando
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Text style={s.btnRechazarText}>✕ Cancelar solicitud</Text>}
          </TouchableOpacity>
        )}
        {(estado === 'pendiente' || estado === 'aceptado' || estado === 'cancelado' || estado === 'rechazado') && (
          <TouchableOpacity style={s.btnPrimario} onPress={() => navigation.navigate('Mapa')}>
            <Text style={s.btnPrimarioText}>Volver al inicio</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.btnPrimario, { marginTop: 10, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => navigation.navigate('MisServicios', { clienteId })}>
          <Text style={[s.btnPrimarioText, { color: colors.textMuted }]}>📋 Ver todos mis servicios</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalReprogramar} transparent animationType="fade" onRequestClose={() => setModalReprogramar(false)}>
        <View style={s.modalFondo}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>📅 Reprogramar cita</Text>
            <Text style={s.modalSub}>Elige el nuevo día y hora. Se avisará a la otra parte al momento.</Text>

            <Text style={s.modalLabel}>Día</Text>
            <View style={s.modalDiasWrap}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const f = new Date();
                f.setDate(f.getDate() + i);
                const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][f.getDay()];
                return (
                  <TouchableOpacity key={i} style={[s.modalDiaBtn, diaReprog === i && s.modalDiaBtnActivo]}
                    onPress={() => setDiaReprog(i)}>
                    <Text style={[s.modalDiaBtnText, diaReprog === i && s.modalDiaBtnTextActivo]}>{etiqueta}</Text>
                    <Text style={[s.modalDiaBtnNum, diaReprog === i && s.modalDiaBtnTextActivo]}>{f.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.modalLabel}>Hora</Text>
            <View style={s.modalHorasWrap}>
              {HORAS_REPROGRAMAR.map(h => (
                <TouchableOpacity key={h} style={[s.modalHoraBtn, horaReprog === h && s.modalDiaBtnActivo]}
                  onPress={() => setHoraReprog(h)}>
                  <Text style={[s.modalHoraBtnText, horaReprog === h && s.modalDiaBtnTextActivo]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.btnPago, { marginTop: 20 }, (!horaReprog || reprogramando) && { opacity: 0.5 }]}
              onPress={confirmarReprogramar}
              disabled={!horaReprog || reprogramando}>
              {reprogramando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnPagoText}>Confirmar nuevo horario</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setModalReprogramar(false)}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 52, paddingBottom: 8 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  refreshBtn: { paddingVertical: 4, paddingHorizontal: 8, minWidth: 90, alignItems: 'flex-end' },
  refreshText: { color: colors.blue, fontSize: 14, fontWeight: '500' },
  avisoSinId: { marginHorizontal: 24, marginTop: 8, backgroundColor: colors.redLight, borderWidth: 1, borderColor: colors.red, borderRadius: 12, padding: 12 },
  avisoSinIdText: { color: colors.red, fontSize: 13, textAlign: 'center', fontWeight: '500' },
  avisoTimeout: { width: '100%', backgroundColor: '#3A2E12', borderWidth: 1, borderColor: '#FFC043', borderRadius: 14, padding: 14, marginBottom: 20 },
  avisoTimeoutTitulo: { color: '#FFC043', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  avisoTimeoutText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  contenido: { flex: 1 },
  estadoCirculo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: colors.bgCard },
  estadoEmoji: { fontSize: 44 },
  estadoTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  estadoSub: { fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center' },
  progresoWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  progresoItem: { flexDirection: 'row', alignItems: 'center' },
  progresoPunto: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCard3, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  progresoPuntoText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progresoLinea: { width: 40, height: 2, backgroundColor: colors.border },
  card: { width: '100%', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontSize: 14 },
  valor: { color: colors.text, fontSize: 14, fontWeight: '500' },
  precioValor: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  precioEspera: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  pasos: { width: '100%', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  pasosTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 16 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pasoNumWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCard3, justifyContent: 'center', alignItems: 'center' },
  pasoNum: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  pasoText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  footer: { padding: 20, paddingBottom: 36 },
  precioCard: { backgroundColor: colors.greenLight, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.green },
  precioCardTitulo: { color: colors.green, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  precioCardValor: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  precioCardSub: { color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  btnPago: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  btnPagoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnRechazar: { backgroundColor: colors.redLight, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.red },
  btnRechazarText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  btnResena: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#f59e0b' },
  btnResenaText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 },
  btnRecibo: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border2 },
  btnReciboText: { color: colors.blue, fontWeight: 'bold', fontSize: 16 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnReprogramar: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.blue },
  btnReprogramarText: { color: colors.blue, fontWeight: 'bold', fontSize: 16 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: colors.border },
  modalTitulo: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  modalSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalLabel: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 10 },
  modalDiasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  modalDiaBtn: { backgroundColor: colors.bgCard3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border, minWidth: 52 },
  modalDiaBtnActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  modalDiaBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  modalDiaBtnNum: { color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  modalDiaBtnTextActivo: { color: '#fff' },
  modalHorasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalHoraBtn: { backgroundColor: colors.bgCard3, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  modalHoraBtnText: { color: colors.textMuted, fontSize: 13 },
});