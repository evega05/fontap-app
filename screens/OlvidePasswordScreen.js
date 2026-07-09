import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import axios from 'axios';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function OlvidePasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    setError('');
    if (!email) { setError('Escribe tu email'); return; }
    setCargando(true);
    try {
      await axios.post(`${API}/auth/olvide-password`, { email });
      setEnviado(true);
    } catch (e) {
      setError('No se pudo enviar el código. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>Recuperar contraseña</Text>
        <Text style={s.sub}>
          {enviado
            ? 'Si el email existe, te enviamos un código de un solo uso. Revisa tu bandeja de entrada (y spam).'
            : 'Escribe el email de tu cuenta y te enviaremos un código para restablecer tu contraseña.'}
        </Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

        {!enviado ? (
          <>
            <Text style={s.inputLabel}>Email</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>✉️</Text>
              <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor={colors.textFaint}
                value={email} onChangeText={t => { setEmail(t); setError(''); }}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
            <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={enviar} disabled={cargando}>
              <Text style={s.btnPrimarioText}>{cargando ? 'Enviando...' : 'Enviar código'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.btnPrimario} onPress={() => navigation.navigate('ResetPassword', { email })}>
            <Text style={s.btnPrimarioText}>Ya tengo el código →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 56 },
  backBtn: { marginBottom: 28 },
  backText: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 20 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 4 },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 },
});
