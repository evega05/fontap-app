import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../AuthContext';
import { agregarArchivo } from '../subirArchivo';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function ChatScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const { servicioId, otroNombre } = route.params || {};
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
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

  useEffect(() => {
    cargarMensajes();
    marcarLeidos();
    pollingRef.current = setInterval(() => {
      cargarMensajes();
      marcarLeidos();
    }, 4000);
    return () => clearInterval(pollingRef.current);
  }, [cargarMensajes, marcarLeidos]);

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
      console.log('[Chat] POST body:', JSON.stringify(body), 'servicioId:', servicioId, 'token:', !!token);
      const res = await axios.post(
        `${API}/servicios/${servicioId}/mensajes`,
        body,
        { headers: { ...hdrs, 'Content-Type': 'application/json' } }
      );
      console.log('[Chat] Mensaje enviado OK:', res.status);
      await cargarMensajes();
    } catch (e) {
      console.log('[Chat] ERROR POST:', e?.response?.status, JSON.stringify(e?.response?.data));
      setMensajes(prev => prev.map(m =>
        m.id === mensajeTemporal.id ? { ...m, error: true, pendiente: false } : m
      ));
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
      console.log('[Chat] ERROR foto:', e?.response?.status, JSON.stringify(e?.response?.data));
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
