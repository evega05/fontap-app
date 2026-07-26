import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../AuthContext';
import { agregarArchivo } from '../subirArchivo';
import { avisar, confirmarAccion } from '../confirmar';
import { colors } from '../theme';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';

const RESPUESTAS_RAPIDAS = {
  fontanero: ['Voy en camino 🚗', '¿A qué hora te viene bien?', 'Ya he terminado ✅', 'Necesito más detalles del problema', '5 minutos y llego'],
  cliente: ['¿Cuánto tardarás?', 'Estoy en casa, puedes venir', '¿Cuál es el precio aproximado?', 'Gracias, quedo a la espera', '¿Puedes venir mañana?'],
};

export default function ChatScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const { servicioId, otroNombre } = route.params || {};
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [servicio, setServicio] = useState(null);
  const [mostrarProponerPrecio, setMostrarProponerPrecio] = useState(false);
  const [precioInput, setPrecioInput] = useState('');
  const [procesandoEstado, setProcesandoEstado] = useState(false);
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);
  const ultimoIdRef = useRef(0);

  const cargarMensajes = useCallback(async () => {
    try {
      const hdrs = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/servicios/${servicioId}/mensajes`, { headers: hdrs });
      const nuevos = res.data || [];
      setMensajes(nuevos);
      if (nuevos.length > 0) {
        ultimoIdRef.current = nuevos[nuevos.length - 1].id;
      }
    } catch (e) {
      console.log('[Chat] ERROR GET mensajes:', e?.response?.status, JSON.stringify(e?.response?.data));
    } finally {
      setCargando(false);
    }
  }, [servicioId, token]);

  const marcarLeidos = useCallback(async () => {
    if (!token) return;
    try {
      await axios.put(
        `${API}/servicios/${servicioId}/mensajes/leer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
  }, [servicioId, token]);

  const cargarServicio = useCallback(async () => {
    if (!token || !servicioId) return;
    try {
      const res = await axios.get(`${API}/servicios/${servicioId}`, { headers: { Authorization: `Bearer ${token}` } });
      setServicio(res.data);
    } catch (e) {}
  }, [servicioId, token]);

  useEffect(() => {
    cargarMensajes();
    marcarLeidos();
    cargarServicio();
    pollingRef.current = setInterval(() => {
      cargarMensajes();
      marcarLeidos();
      cargarServicio();
    }, 4000);
    return () => clearInterval(pollingRef.current);
  }, [cargarMensajes, marcarLeidos, cargarServicio]);

  const proponerPrecio = async () => {
    const precioNum = parseFloat(precioInput);
    if (isNaN(precioNum) || precioNum <= 0) { avisar('Error', 'Introduce un precio válido'); return; }
    setProcesandoEstado(true);
    try {
      await axios.put(`${API}/servicios/${servicioId}/precio`, { precio: precioNum }, { headers });
      setServicio(prev => ({ ...prev, precio: precioNum, estado: 'precio_enviado' }));
      setMostrarProponerPrecio(false);
      setPrecioInput('');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar el precio'));
    } finally {
      setProcesandoEstado(false);
    }
  };

  const aceptarPrecio = async () => {
    setProcesandoEstado(true);
    try {
      await axios.put(`${API}/servicios/${servicioId}/precio/aceptar`, null, { headers });
      setServicio(prev => ({ ...prev, estado: 'precio_aceptado' }));
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo aceptar el precio'));
    } finally {
      setProcesandoEstado(false);
    }
  };

  const rechazarPrecio = () => {
    confirmarAccion('Rechazar precio', '¿Seguro que quieres rechazar este precio? El profesional podrá proponerte uno nuevo.', async () => {
      setProcesandoEstado(true);
      try {
        await axios.put(`${API}/servicios/${servicioId}/precio/rechazar`, null, { headers });
        setServicio(prev => ({ ...prev, precio: null, estado: prev.es_consulta ? 'pendiente' : 'aceptado' }));
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo rechazar el precio'));
      } finally {
        setProcesandoEstado(false);
      }
    }, { textoConfirmar: 'Sí, rechazar', textoCancelar: 'No' });
  };

  const irEnCamino = async () => {
    setProcesandoEstado(true);
    try {
      await axios.put(`${API}/servicios/${servicioId}/en-camino`, null, { headers });
      setServicio(prev => ({ ...prev, estado: 'en_camino' }));
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo actualizar el estado'));
    } finally {
      setProcesandoEstado(false);
    }
  };

  const marcarTerminado = () => {
    confirmarAccion('Marcar como terminado', '¿Confirmas que el trabajo ya está terminado? El cliente podrá pagar a partir de ahora.', async () => {
      setProcesandoEstado(true);
      try {
        await axios.put(`${API}/servicios/${servicioId}/completar`, null, { headers });
        setServicio(prev => ({ ...prev, estado: 'completado' }));
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo marcar como terminado'));
      } finally {
        setProcesandoEstado(false);
      }
    }, { textoConfirmar: 'Sí, terminado' });
  };

  const irAPagar = () => {
    navigation.navigate('Pago', {
      servicioId,
      precio: servicio?.precio,
      servicio: { nombre: servicio?.tipo },
      fontanero: { nombre: otroNombre },
    });
  };

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes.length]);

  const enviar = async () => {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setTexto('');
    setEnviando(true);

    const mensajeTemporal = {
      id: `tmp_${Date.now()}`,
      contenido: msg,
      remitente_tipo: usuario?.tipo,
      creado_en: new Date().toISOString(),
      pendiente: true,
    };
    setMensajes(prev => [...prev, mensajeTemporal]);

    try {
      const hdrs = token ? { Authorization: `Bearer ${token}` } : {};
      const body = { contenido: msg };
      await axios.post(
        `${API}/servicios/${servicioId}/mensajes`,
        body,
        { headers: { ...hdrs, 'Content-Type': 'application/json' } }
      );
      await cargarMensajes();
    } catch (e) {
      setMensajes(prev => prev.map(m =>
        m.id === mensajeTemporal.id ? { ...m, error: true, pendiente: false } : m
      ));
      avisar('No se pudo enviar', mensajeError(e, 'Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  const enviarFoto = async () => {
    if (enviandoFoto) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.canceled) return;
    setEnviandoFoto(true);
    try {
      const hdrs = token ? { Authorization: `Bearer ${token}` } : {};
      const form = new FormData();
      await agregarArchivo(form, 'archivo', res.assets[0].uri, 'foto.jpg', 'image/jpeg');
      await axios.post(`${API}/servicios/${servicioId}/mensajes/imagen`, form, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      await cargarMensajes();
    } catch (e) {
      avisar('No se pudo enviar', mensajeError(e, 'No se pudo enviar la foto. Inténtalo de nuevo.'));
    } finally {
      setEnviandoFoto(false);
    }
  };

  const esMio = (msg) => msg.remitente_tipo === usuario?.tipo;

  const renderMensaje = ({ item }) => {
    const mio = esMio(item);
    return (
      <View style={[s.msgRow, mio ? s.msgRowMio : s.msgRowOtro]}>
        <View style={[s.bubble, mio ? s.bubbleMio : s.bubbleOtro, item.error && s.bubbleError, item.imagen_url && s.bubbleFoto]}>
          {item.imagen_url ? (
            <Image source={{ uri: `${API}${item.imagen_url}` }} style={s.fotoMensaje} resizeMode="cover" />
          ) : (
            <Text style={[s.bubbleText, mio ? s.bubbleTextMio : s.bubbleTextOtro]}>
              {item.contenido}
            </Text>
          )}
          <Text style={[s.bubbleHora, mio ? s.bubbleHoraMio : s.bubbleHoraOtro]}>
            {item.pendiente ? '⏳' : item.error ? '⚠️' : formatHora(item.creado_en)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>{(otroNombre || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.headerNombre}>{otroNombre || 'Chat'}</Text>
            <Text style={s.headerSub}>Servicio #{servicioId}</Text>
          </View>
        </View>
      </View>

      {servicio && (
        <View style={s.estadoWrap}>
          {usuario?.tipo === 'fontanero' && !servicio.precio && !['cancelado', 'rechazado'].includes(servicio.estado) && (
            mostrarProponerPrecio ? (
              <View style={s.precioInputRow}>
                <TextInput
                  style={s.precioInput}
                  placeholder="Precio en €"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="numeric"
                  value={precioInput}
                  onChangeText={setPrecioInput}
                  autoFocus
                />
                <TouchableOpacity style={s.precioEnviarBtn} onPress={proponerPrecio} disabled={procesandoEstado}>
                  {procesandoEstado ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.precioEnviarText}>Enviar</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.precioCancelarBtn} onPress={() => { setMostrarProponerPrecio(false); setPrecioInput(''); }}>
                  <Text style={s.precioCancelarText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.estadoBtn} onPress={() => setMostrarProponerPrecio(true)}>
                <Text style={s.estadoBtnText}>💰 Proponer precio</Text>
              </TouchableOpacity>
            )
          )}

          {usuario?.tipo === 'cliente' && servicio.estado === 'precio_enviado' && (
            <View style={s.precioPropuestoBox}>
              <Text style={s.precioPropuestoTexto}>💰 Precio propuesto: {servicio.precio}€</Text>
              <View style={s.precioAccionesRow}>
                <TouchableOpacity style={s.btnRechazarPrecio} onPress={rechazarPrecio} disabled={procesandoEstado}>
                  <Text style={s.btnRechazarPrecioText}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAceptarPrecio} onPress={aceptarPrecio} disabled={procesandoEstado}>
                  {procesandoEstado ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnAceptarPrecioText}>Aceptar {servicio.precio}€</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {usuario?.tipo === 'fontanero' && (servicio.estado === 'precio_aceptado' || servicio.estado === 'en_camino') && (
            <View style={s.accionesTrabajoRow}>
              {servicio.estado === 'precio_aceptado' && (
                <TouchableOpacity style={s.estadoBtn} onPress={irEnCamino} disabled={procesandoEstado}>
                  <Text style={s.estadoBtnText}>🚗 Voy en camino</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.estadoBtnVerde} onPress={marcarTerminado} disabled={procesandoEstado}>
                <Text style={s.estadoBtnVerdeText}>✅ Marcar terminado</Text>
              </TouchableOpacity>
            </View>
          )}

          {usuario?.tipo === 'cliente' && servicio.estado === 'completado' && (
            <TouchableOpacity style={s.estadoBtnVerde} onPress={irAPagar}>
              <Text style={s.estadoBtnVerdeText}>💳 Pagar {servicio.precio}€</Text>
            </TouchableOpacity>
          )}

          {usuario?.tipo === 'cliente' && (servicio.estado === 'precio_aceptado' || servicio.estado === 'en_camino') && (
            <View style={s.infoBanner}>
              <Text style={s.infoBannerText}>
                {servicio.estado === 'en_camino'
                  ? '🚗 El profesional va en camino'
                  : `✅ Precio aceptado (${servicio.precio}€) · esperando a que el profesional vaya y termine el trabajo`}
              </Text>
            </View>
          )}
        </View>
      )}

      {cargando ? (
        <View style={s.cargando}>
          <ActivityIndicator color={colors.blue} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={item => String(item.id)}
          renderItem={renderMensaje}
          contentContainerStyle={s.lista}
          ListEmptyComponent={
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>💬</Text>
              <Text style={s.vacioText}>Inicia la conversación</Text>
              <Text style={s.vacioSub}>Los mensajes aparecerán aquí</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={RESPUESTAS_RAPIDAS[usuario?.tipo] || []}
        keyExtractor={(item) => item}
        contentContainerStyle={s.respuestasRapidas}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.chipRapido} onPress={() => setTexto(item)}>
            <Text style={s.chipRapidoText}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={s.inputRow}>
        <TouchableOpacity
          style={[s.adjuntarBtn, enviandoFoto && s.sendBtnDisabled]}
          onPress={enviarFoto}
          disabled={enviandoFoto}
        >
          {enviandoFoto ? <ActivityIndicator color={colors.text} size="small" /> : <Text style={s.adjuntarIcon}>📷</Text>}
        </TouchableOpacity>
        <TextInput
          style={s.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textFaint}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={500}
          onSubmitEditing={enviar}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!texto.trim() || enviando) && s.sendBtnDisabled]}
          onPress={enviar}
          disabled={!texto.trim() || enviando}
        >
          <Text style={s.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatHora(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, backgroundColor: colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { color: colors.blue, fontSize: 22, fontWeight: '600' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerNombre: { color: colors.text, fontWeight: '600', fontSize: 15 },
  headerSub: { color: colors.textMuted, fontSize: 12 },
  estadoWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  estadoBtn: { backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.blue, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  estadoBtnText: { color: colors.blue, fontWeight: '700', fontSize: 13.5 },
  estadoBtnVerde: { flex: 1, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  estadoBtnVerdeText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  accionesTrabajoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  precioInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  precioInput: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 12, borderWidth: 1, borderColor: colors.border2, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, fontSize: 14 },
  precioEnviarBtn: { backgroundColor: colors.blue, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  precioEnviarText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  precioCancelarBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  precioCancelarText: { color: colors.textMuted, fontSize: 16 },
  precioPropuestoBox: { backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.blue, borderRadius: 12, padding: 12, marginBottom: 8 },
  precioPropuestoTexto: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  precioAccionesRow: { flexDirection: 'row', gap: 8 },
  btnRechazarPrecio: { flex: 1, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  btnRechazarPrecioText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  btnAceptarPrecio: { flex: 1.4, backgroundColor: colors.green, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  btnAceptarPrecioText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  infoBanner: { backgroundColor: colors.bgCard2, borderRadius: 12, borderWidth: 1, borderColor: colors.border2, padding: 10, marginBottom: 8 },
  infoBannerText: { color: colors.textMuted, fontSize: 12.5, textAlign: 'center' },
  cargando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' },
  msgRow: { marginBottom: 8, flexDirection: 'row' },
  msgRowMio: { justifyContent: 'flex-end' },
  msgRowOtro: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleMio: { backgroundColor: colors.blue, borderColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleOtro: { backgroundColor: colors.bgCard, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleError: { borderColor: colors.red, opacity: 0.7 },
  bubbleFoto: { padding: 4 },
  fotoMensaje: { width: 200, height: 200, borderRadius: 14 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMio: { color: '#fff' },
  bubbleTextOtro: { color: colors.text },
  bubbleHora: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  bubbleHoraMio: { color: 'rgba(255,255,255,0.6)' },
  bubbleHoraOtro: { color: colors.textMuted },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  vacioEmoji: { fontSize: 48, marginBottom: 12 },
  vacioText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  vacioSub: { color: colors.textMuted, fontSize: 13 },
  respuestasRapidas: { gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: colors.bgCard },
  chipRapido: { backgroundColor: colors.bgCard2, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2 },
  chipRapidoText: { color: colors.text, fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: 28,
    backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: colors.bgCard2, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, color: colors.text,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: colors.border2,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.blueLight, opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  adjuntarBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard2,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border2,
  },
  adjuntarIcon: { fontSize: 18 },
});
