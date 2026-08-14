import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius } from '../theme';
import { avisar } from '../confirmar';
import { mensajeError } from '../errores';
import Pressable from '../components/Pressable';
import GradientBg from '../components/GradientBg';

const API = 'https://fontap-backend-production.up.railway.app';

// Chat livianito sobre una TareaEmpleado puntual — no el chat de un Servicio real
// (ChatScreen), porque muchas tareas son avisos internos sin cliente detrás.
export default function TareaChatScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const { tareaId, otroNombre } = route.params || {};
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef(null);
  const pollingRef = useRef(null);

  const cargarMensajes = useCallback(async () => {
    if (!tareaId) return;
    try {
      const res = await axios.get(`${API}/tareas/${tareaId}/mensajes`, { headers });
      setMensajes(res.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [tareaId, token]);

  useEffect(() => {
    cargarMensajes();
    pollingRef.current = setInterval(cargarMensajes, 4000);
    return () => clearInterval(pollingRef.current);
  }, [cargarMensajes]);

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const res = await axios.post(`${API}/tareas/${tareaId}/mensajes`, { texto: contenido }, { headers });
      setMensajes(prev => [...prev, res.data]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar el mensaje'));
      setTexto(contenido);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBg />
      <View style={s.header}>
        <Pressable haptic onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.accent2} />
        </Pressable>
        <Text style={s.titulo} numberOfLines={1}>{otroNombre || 'Tarea'}</Text>
        <View style={{ width: 34 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1, justifyContent: mensajes.length ? 'flex-start' : 'center' }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.vacio}>
              <Ionicons name="chatbubble-outline" size={26} color={colors.textFaint} />
              <Text style={s.vacioTexto}>Sin mensajes todavía</Text>
            </View>
          }
          renderItem={({ item }) => {
            const esMio = item.autor_usuario_id === usuario?.id;
            return (
              <View style={[s.fila, esMio ? s.filaMia : s.filaOtro]}>
                <View style={[s.burbuja, esMio ? s.burbujaMia : s.burbujaOtro]}>
                  {!esMio && <Text style={s.autor}>{item.autor_nombre || 'Equipo'}</Text>}
                  <Text style={[s.texto, esMio && s.textoMio]}>{item.texto}</Text>
                  <Text style={[s.hora, esMio && s.horaMia]}>
                    {new Date(item.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <Pressable haptic disabled={!texto.trim() || enviando} onPress={enviar} style={[s.enviarBtn, (!texto.trim() || enviando) && s.enviarBtnDesactivado]}>
          <Ionicons name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 50, paddingBottom: spacing.md },
  backBtn: { width: 34, height: 34, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.glass },
  titulo: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '700' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacio: { alignItems: 'center', gap: spacing.sm },
  vacioTexto: { color: colors.textFaint, fontSize: 13 },
  fila: { marginBottom: spacing.sm, flexDirection: 'row' },
  filaMia: { justifyContent: 'flex-end' },
  filaOtro: { justifyContent: 'flex-start' },
  burbuja: { maxWidth: '78%', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1 },
  burbujaMia: { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomRightRadius: 4 },
  burbujaOtro: { backgroundColor: colors.bgCard, borderColor: colors.border, borderBottomLeftRadius: 4 },
  autor: { color: colors.accent2, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  texto: { color: colors.text, fontSize: 14.5, lineHeight: 20 },
  textoMio: { color: '#fff' },
  hora: { color: colors.textFaint, fontSize: 10.5, marginTop: 4, textAlign: 'right' },
  horaMia: { color: 'rgba(255,255,255,0.65)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  input: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border2, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14.5, maxHeight: 100 },
  enviarBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  enviarBtnDesactivado: { backgroundColor: colors.bgCard3 },
});
