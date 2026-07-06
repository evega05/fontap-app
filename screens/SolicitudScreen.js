import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../AuthContext';
import { agregarArchivo } from '../subirArchivo';

const API = 'https://fontap-backend-production.up.railway.app';

const SERVICIOS = [
  { id: 1, nombre: 'Desatasco', emoji: '🚽', precio: 'desde 60€' },
  { id: 2, nombre: 'Fuga de agua', emoji: '💧', precio: 'desde 80€' },
  { id: 3, nombre: 'Caldera', emoji: '🔥', precio: 'desde 90€' },
  { id: 4, nombre: 'Grifo / ducha', emoji: '🚿', precio: 'desde 50€' },
  { id: 5, nombre: 'Radiador', emoji: '♨️', precio: 'desde 70€' },
  { id: 6, nombre: 'Otro', emoji: '🔧', precio: 'consultar' },
];

export default function SolicitudScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const fontanero = route.params?.fontanero;
  const [tipo, setTipo] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urgente, setUrgente] = useState(route.params?.urgente || false);
  const [paso, setPaso] = useState(1);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState(null);
  const [fotosProblema, setFotosProblema] = useState([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) setFotosProblema(prev => [...prev, res.assets[0].uri]);
  };

  const subirFotosServicio = async (servicioId) => {
    if (!fotosProblema.length || !servicioId) return;
    setSubiendoFoto(true);
    for (const uri of fotosProblema) {
      try {
        const form = new FormData();
        await agregarArchivo(form, 'archivo', uri, 'foto.jpg', 'image/jpeg');
        await axios.post(`${API}/servicios/${servicioId}/imagenes`, form, {
          headers: { 'Content-Type': 'multipart/form-data', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
      } catch (e) {}
    }
    setSubiendoFoto(false);
  };

  const enviarMensajeInicial = async (servicioId) => {
    if (!mensaje.trim() || !servicioId || !token) return;
    try {
      await axios.post(
        `${API}/servicios/${servicioId}/mensajes`,
        { contenido: mensaje.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {}
  };

  const continuar = async () => {
    if (paso === 1 && !tipo) return;
    if (paso < 3) setPaso(paso + 1);
    else {
      try {
  const clienteId = route.params?.clienteId || usuario?.id || 1;
  const body = {
    tipo: tipo.nombre,
    descripcion,
    urgente,
    fecha: diaSeleccionado !== null ? new Date().toISOString() : null,
    fontanero_id: fontanero?.id || null,
  };
  console.log('[Solicitud] Enviando servicio:', JSON.stringify(body), 'cliente_id:', clienteId);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/servicios`, body, { params: { cliente_id: clienteId }, headers });
  console.log('[Solicitud] Servicio creado:', JSON.stringify(res.data));

  // ← guardar el id del servicio creado
  const servicioId = res.data?.id;
  await subirFotosServicio(servicioId);
  await enviarMensajeInicial(servicioId);

  navigation.navigate('Confirmacion', {
    fontanero, tipo, descripcion, urgente,
    diaSeleccionado, horaSeleccionada,
    servicioId, // ← pasar el id
    clienteId,
  });
} catch (e) {
  navigation.navigate('Confirmacion', {
    fontanero, tipo, descripcion, urgente,
    diaSeleccionado, horaSeleccionada,
  });
}
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { if (paso > 1) { setPaso(paso - 1); } else { navigation.goBack(); } }}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>
          {paso === 1 ? 'Tipo de servicio' : paso === 2 ? 'Detalles' : 'Cuándo'}
        </Text>
        <Text style={s.paso}>{paso}/3</Text>
      </View>

      <View style={s.progreso}>
        {[1, 2, 3].map(p => (
          <View key={p} style={[s.progresoBarra, p <= paso && s.progresoBarraActiva]} />
        ))}
      </View>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: 20 }}>
        {paso === 1 && (
          <>
            <Text style={s.subtitulo}>¿Qué necesitas reparar?</Text>
            <View style={s.grid}>
              {SERVICIOS.map(sv => (
                <TouchableOpacity
                  key={sv.id}
                  style={[s.servicioCard, tipo?.id === sv.id && s.servicioCardActivo]}
                  onPress={() => setTipo(sv)}
                >
                  <Text style={s.servicioEmoji}>{sv.emoji}</Text>
                  <Text style={[s.servicioNombre, tipo?.id === sv.id && s.servicioNombreActivo]}>{sv.nombre}</Text>
                  <Text style={s.servicioPrecio}>{sv.precio}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {paso === 2 && (
          <>
            <Text style={s.subtitulo}>Cuéntanos más</Text>
            <TextInput
              style={s.textArea}
              placeholder="Describe el problema con detalle... (opcional)"
              placeholderTextColor="#555"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={5}
            />
            <Text style={s.subtitulo}>📸 Fotos del problema (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              <TouchableOpacity style={s.addFotoBtn} onPress={seleccionarFoto}>
                <Text style={s.addFotoEmoji}>📷</Text>
                <Text style={s.addFotoText}>Añadir foto</Text>
              </TouchableOpacity>
              {fotosProblema.map((uri, i) => (
                <View key={i} style={s.fotoWrap}>
                  <Image source={{ uri }} style={s.fotoThumb} />
                  <TouchableOpacity style={s.fotoEliminar} onPress={() => setFotosProblema(prev => prev.filter((_, j) => j !== i))}>
                    <Text style={s.fotoEliminarText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {fontanero && (
              <View style={s.fontaneroCard}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{fontanero.nombre[0]}</Text>
                </View>
                <View>
                  <Text style={s.fontaneroNombre}>{fontanero.nombre}</Text>
                  <Text style={s.fontaneroZona}>⭐ {fontanero.valoracion} · {fontanero.zona}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <Text style={s.subtitulo}>¿Cuándo lo necesitas?</Text>

            <TouchableOpacity style={[s.tipoBtn, urgente && s.tipoBtnActivo]} onPress={() => setUrgente(true)}>
              <Text style={s.tipoBtnEmoji}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipoBtnTitulo, urgente && s.tipoBtnTituloActivo]}>Urgente ahora</Text>
                <Text style={s.tipoBtnSub}>El fontanero llega en 30-60 min</Text>
              </View>
              {urgente && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[s.tipoBtn, !urgente && s.tipoBtnActivo]} onPress={() => setUrgente(false)}>
              <Text style={s.tipoBtnEmoji}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipoBtnTitulo, !urgente && s.tipoBtnTituloActivo]}>Reservar cita</Text>
                <Text style={s.tipoBtnSub}>Elige día y hora</Text>
              </View>
              {!urgente && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>

            {!urgente && (
              <View style={s.calendarioWrap}>
                <Text style={s.calendarioTitulo}>📅 Elige el día</Text>
                <View style={s.diasRow}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia, i) => {
                    const fecha = new Date();
                    fecha.setDate(fecha.getDate() + i + 1);
                    const diaNum = fecha.getDate();
                    return (
                      <TouchableOpacity key={i} style={[s.diaBtn, diaSeleccionado === i && s.diaBtnActivo]}
                        onPress={() => setDiaSeleccionado(i)}>
                        <Text style={[s.diaBtnLabel, diaSeleccionado === i && s.diaBtnTextActivo]}>{dia}</Text>
                        <Text style={[s.diaBtnNum, diaSeleccionado === i && s.diaBtnTextActivo]}>{diaNum}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.calendarioTitulo}>🕐 Elige la hora</Text>
                <View style={s.horasWrap}>
                  {['08:00','09:00','10:00','11:00','12:00','13:00','15:00','16:00','17:00','18:00'].map(h => (
                    <TouchableOpacity key={h} style={[s.horaBtn, horaSeleccionada === h && s.horaBtnActivo]}
                      onPress={() => setHoraSeleccionada(h)}>
                      <Text style={[s.horaBtnText, horaSeleccionada === h && s.horaBtnTextActivo]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.subtitulo}>💬 Mensaje para el fontanero (opcional)</Text>
            <TextInput
              style={s.mensajeInput}
              placeholder="Ej: Estoy en el 3ºB, hay que llamar al portero automático..."
              placeholderTextColor="#555"
              value={mensaje}
              onChangeText={setMensaje}
              multiline
              numberOfLines={3}
            />

            <View style={s.resumen}>
              <Text style={s.resumenTitulo}>Resumen</Text>
              <View style={s.resumenFila}>
                <Text style={s.resumenLabel}>Servicio</Text>
                <Text style={s.resumenValor}>{tipo?.emoji} {tipo?.nombre}</Text>
              </View>
              <View style={s.resumenFila}>
                <Text style={s.resumenLabel}>Fontanero</Text>
                <Text style={s.resumenValor}>{fontanero?.nombre || 'Más cercano'}</Text>
              </View>
              {!urgente && diaSeleccionado !== null && (
                <View style={s.resumenFila}>
                  <Text style={s.resumenLabel}>Fecha</Text>
                  <Text style={s.resumenValor}>
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][diaSeleccionado]} {horaSeleccionada || '—'}
                  </Text>
                </View>
              )}
              <View style={s.resumenFila}>
                <Text style={s.resumenLabel}>Precio estimado</Text>
                <Text style={s.resumenValor}>{tipo?.precio}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnContinuar, paso === 1 && !tipo && s.btnDesactivado]}
          onPress={continuar}
          disabled={paso === 1 && !tipo}
        >
          <Text style={s.btnContinuarText}>
            {paso === 3 ? '✓ Confirmar solicitud' : 'Continuar →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  back: { color: '#3b82f6', fontSize: 15 },
  titulo: { color: '#fff', fontSize: 16, fontWeight: '600' },
  paso: { color: '#aaa', fontSize: 13 },
  progreso: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  progresoBarra: { flex: 1, height: 3, backgroundColor: '#1e1e2e', borderRadius: 2 },
  progresoBarraActiva: { backgroundColor: '#3b82f6' },
  contenido: { flex: 1 },
  subtitulo: { color: '#aaa', fontSize: 14, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  servicioCard: { width: '47%', backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  servicioCardActivo: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  servicioEmoji: { fontSize: 32, marginBottom: 8 },
  servicioNombre: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 4 },
  servicioNombreActivo: { color: '#3b82f6' },
  servicioPrecio: { color: '#aaa', fontSize: 11 },
  textArea: { backgroundColor: '#1e1e2e', color: '#fff', borderRadius: 12, padding: 16, fontSize: 14, minHeight: 120, textAlignVertical: 'top', marginBottom: 20 },
  mensajeInput: { backgroundColor: '#1e1e2e', color: '#fff', borderRadius: 12, padding: 16, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  fontaneroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  fontaneroNombre: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fontaneroZona: { color: '#aaa', fontSize: 12, marginTop: 2 },
  tipoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 14, padding: 18, marginBottom: 12, gap: 14, borderWidth: 1.5, borderColor: 'transparent' },
  tipoBtnActivo: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  tipoBtnEmoji: { fontSize: 28 },
  tipoBtnTitulo: { color: '#fff', fontWeight: '600', fontSize: 15 },
  tipoBtnTituloActivo: { color: '#3b82f6' },
  tipoBtnSub: { color: '#aaa', fontSize: 12, marginTop: 2 },
  check: { color: '#3b82f6', fontSize: 18, fontWeight: 'bold' },
  calendarioWrap: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  calendarioTitulo: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 12, marginTop: 4 },
  diasRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  diaBtn: { flex: 1, backgroundColor: '#0f0f1a', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  diaBtnActivo: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  diaBtnLabel: { color: '#aaa', fontSize: 10, marginBottom: 4 },
  diaBtnNum: { color: '#fff', fontSize: 13, fontWeight: '600' },
  diaBtnTextActivo: { color: '#fff' },
  horasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horaBtn: { backgroundColor: '#0f0f1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a3e' },
  horaBtnActivo: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  horaBtnText: { color: '#aaa', fontSize: 13 },
  horaBtnTextActivo: { color: '#fff', fontWeight: '600' },
  resumen: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginTop: 12 },
  resumenTitulo: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 14 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resumenLabel: { color: '#aaa', fontSize: 13 },
  resumenValor: { color: '#fff', fontSize: 13, fontWeight: '500' },
  addFotoBtn: { width: 80, height: 80, backgroundColor: '#1e1e2e', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#2a2a3e', borderStyle: 'dashed' },
  addFotoEmoji: { fontSize: 24, marginBottom: 4 },
  addFotoText: { color: '#aaa', fontSize: 10 },
  fotoWrap: { position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  fotoThumb: { width: 80, height: 80, borderRadius: 12 },
  fotoEliminar: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  fotoEliminarText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  footer: { padding: 20, paddingBottom: 36 },
  btnContinuar: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDesactivado: { backgroundColor: '#1e1e2e', opacity: 0.5 },
  btnContinuarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});