import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import axios from 'axios';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function ResetPasswordScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState('');

  const resetear = async () => {
    setError('');
    if (!email || !codigo || !nuevaPassword) { setError('Rellena todos los campos'); return; }
    if (nuevaPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setCargando(true);
    try {
      await axios.post(`${API}/auth/resetear-password`, { email, token: codigo, nueva_password: nuevaPassword });
      setHecho(true);
      setTimeout(() => navigation.navigate('Login'), 2000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Código inválido o caducado');
    } finally {
      setCargando(false);
    }
  };

  if (hecho) {
    return (
      <View style={s.container}>
        <View style={s.centro}>
          <Text style={s.emoji}>✅</Text>
          <Text style={s.titulo}>¡Contraseña actualizada!</Text>
          <Text style={s.sub}>Ya puedes iniciar sesión con tu nueva contraseña</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>Nueva contraseña</Text>
        <Text style={s.sub}>Escribe el código que te enviamos y tu nueva contraseña.</Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

        <Text style={s.inputLabel}>Email</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>✉️</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor={colors.textFaint}
            value={email} onChangeText={t => { setEmail(t); setError(''); }}
            keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Text style={s.inputLabel}>Código</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>🔑</Text>
          <TextInput style={s.input} placeholder="Código de 8 caracteres" placeholderTextColor={colors.textFaint}
            value={codigo} onChangeText={t => { setCodigo(t); setError(''); }}
            autoCapitalize="characters" />
        </View>

        <Text style={s.inputLabel}>Nueva contraseña</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>🔒</Text>
          <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textFaint}
            value={nuevaPassword} onChangeText={t => { setNuevaPassword(t); setError(''); }}
            secureTextEntry />
        </View>

        <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={resetear} disabled={cargando}>
          <Text style={s.btnPrimarioText}>{cargando ? 'Guardando...' : 'Restablecer contraseña'}</Text>
        </TouchableOpacity>
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
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 20, textAlign: 'center' },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 4 },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emoji: { fontSize: 56, marginBottom: 16 },
});
