import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import axios from 'axios';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function VerificarEmailScreen({ navigation, route }) {
  const { email, destino, destinoParams } = route.params || {};
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const continuar = () => navigation.replace(destino || 'Mapa', destinoParams);

  const verificar = async () => {
    setError(''); setInfo('');
    if (!codigo) { setError('Escribe el código'); return; }
    setCargando(true);
    try {
      await axios.post(`${API}/auth/verificar-email`, { email, token: codigo });
      setInfo('¡Email verificado!');
      setTimeout(continuar, 1200);
    } catch (e) {
      setError(e.response?.data?.detail || 'Código inválido o caducado');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    setError(''); setInfo('');
    setReenviando(true);
    try {
      await axios.post(`${API}/auth/reenviar-verificacion`, { email });
      setInfo('Código reenviado, revisa tu email');
    } catch (e) {
      setError('No se pudo reenviar el código');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.content}>
        <Text style={s.emoji}>✉️</Text>
        <Text style={s.titulo}>Verifica tu email</Text>
        <Text style={s.sub}>
          Te enviamos un código de 8 caracteres a{'\n'}
          <Text style={s.emailDestacado}>{email}</Text>
        </Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}
        {info ? <View style={s.infoBox}><Text style={s.infoText}>✓ {info}</Text></View> : null}

        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>🔑</Text>
          <TextInput style={s.input} placeholder="Código de 8 caracteres" placeholderTextColor={colors.textFaint}
            value={codigo} onChangeText={t => { setCodigo(t); setError(''); }}
            autoCapitalize="characters" />
        </View>

        <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={verificar} disabled={cargando}>
          <Text style={s.btnPrimarioText}>{cargando ? 'Verificando...' : 'Verificar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={reenviar} disabled={reenviando} style={s.reenviarLink}>
          <Text style={s.reenviarText}>{reenviando ? 'Enviando...' : '¿No te llegó? Reenviar código'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={continuar} style={s.saltarLink}>
          <Text style={s.saltarText}>Verificar más tarde →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 90, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  emailDestacado: { color: colors.text, fontWeight: '600' },
  errorBox: { width: '100%', backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center' },
  infoBox: { width: '100%', backgroundColor: colors.greenLight, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.green },
  infoText: { color: colors.green, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  inputWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15, textAlign: 'center', letterSpacing: 2 },
  btnPrimario: { width: '100%', backgroundColor: colors.blue, borderRadius: 14, padding: 17, alignItems: 'center' },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  reenviarLink: { marginTop: 18 },
  reenviarText: { color: colors.blue, fontSize: 13, fontWeight: '500' },
  saltarLink: { marginTop: 14 },
  saltarText: { color: colors.textFaint, fontSize: 13 },
});
