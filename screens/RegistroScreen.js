import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

const API = 'https://fontap-backend-production.up.railway.app';

export default function RegistroScreen({ navigation }) {
  const { login: guardarSesion } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [serviciosRegistro, setServiciosRegistro] = useState([
    { nombre: 'Desatasco', emoji: '🚽', precio: '' },
    { nombre: 'Fuga de agua', emoji: '💧', precio: '' },
    { nombre: 'Caldera', emoji: '🔥', precio: '' },
    { nombre: 'Grifo / ducha', emoji: '🚿', precio: '' },
    { nombre: 'Radiador', emoji: '♨️', precio: '' },
  ]);

  const registrar = async () => {
    setError('');
    if (!nombre || !email || !telefono || !password) { setError('Rellena todos los campos'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setCargando(true);
    try {
      const res = await axios.post(`${API}/registro`, { nombre, email, telefono, password, tipo });
      await guardarSesion(res.data);
      if (tipo === 'fontanero') {
        navigation.replace('PanelFontanero', { nombre: res.data.nombre || nombre, userId: res.data.id });
      } else {
        navigation.replace('Mapa', { clienteId: res.data.id });
      }
    } catch (e) {
      setError('Este email ya está registrado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <StatusBar barStyle="light-content" />

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.titulo}>Crear cuenta</Text>
      <Text style={s.sub}>Únete a FonTap gratis</Text>

      <View style={s.tipoRow}>
        <TouchableOpacity style={[s.tipoBtn, tipo === 'cliente' && s.tipoBtnActivo]} onPress={() => setTipo('cliente')}>
          <Text style={s.tipoEmoji}>👤</Text>
          <Text style={[s.tipoTitulo, tipo === 'cliente' && s.tipoTituloActivo]}>Soy cliente</Text>
          <Text style={s.tipoSub}>Necesito fontanero</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tipoBtn, tipo === 'fontanero' && s.tipoBtnActivo]} onPress={() => setTipo('fontanero')}>
          <Text style={s.tipoEmoji}>🔧</Text>
          <Text style={[s.tipoTitulo, tipo === 'fontanero' && s.tipoTituloActivo]}>Soy fontanero</Text>
          <Text style={s.tipoSub}>Quiero trabajos</Text>
        </TouchableOpacity>
      </View>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

      <Text style={s.inputLabel}>Nombre completo</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>👤</Text>
        <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={colors.textFaint}
          value={nombre} onChangeText={t => { setNombre(t); setError(''); }} />
      </View>

      <Text style={s.inputLabel}>Email</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>✉️</Text>
        <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor={colors.textFaint}
          value={email} onChangeText={t => { setEmail(t); setError(''); }}
          keyboardType="email-address" autoCapitalize="none" />
      </View>

      <Text style={s.inputLabel}>Teléfono</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>📱</Text>
        <TextInput style={s.input} placeholder="+34 612 345 678" placeholderTextColor={colors.textFaint}
          value={telefono} onChangeText={t => { setTelefono(t); setError(''); }}
          keyboardType="phone-pad" />
      </View>

      <Text style={s.inputLabel}>Contraseña</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>🔒</Text>
        <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textFaint}
          value={password} onChangeText={t => { setPassword(t); setError(''); }}
          secureTextEntry={!mostrarPass} />
        <TouchableOpacity onPress={() => setMostrarPass(!mostrarPass)}>
          <Text style={s.inputIcon}>{mostrarPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      {tipo === 'fontanero' && (
        <>
          <View style={s.infoBox}>
            <Text style={s.infoTitulo}>🎉 Primer mes gratis</Text>
            <Text style={s.infoSub}>Después solo 50€/mes · Cancela cuando quieras</Text>
          </View>
          <Text style={s.inputLabel}>Tus servicios y precios base</Text>
          <Text style={s.inputSublabel}>El cliente los verá antes de contratarte</Text>
          {serviciosRegistro.map((sv, i) => (
            <View key={i} style={s.servicioRow}>
              <Text style={s.servicioEmoji}>{sv.emoji}</Text>
              <Text style={s.servicioNombre}>{sv.nombre}</Text>
              <View style={s.servicioPrecioWrap}>
                <TextInput
                  style={s.servicioPrecioInput}
                  placeholder="€"
                  placeholderTextColor={colors.textFaint}
                  value={sv.precio}
                  onChangeText={t => {
                    const nuevos = [...serviciosRegistro];
                    nuevos[i].precio = t;
                    setServiciosRegistro(nuevos);
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={registrar} disabled={cargando}>
        <Text style={s.btnPrimarioText}>{cargando ? 'Creando cuenta...' : 'Crear cuenta gratis'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginLink}>
        <Text style={s.loginLinkText}>¿Ya tienes cuenta? <Text style={s.loginLinkBlue}>Inicia sesión</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: 28 },
  backText: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { fontSize: 32, fontWeight: 'bold', color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
  tipoRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  tipoBtn: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  tipoBtnActivo: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  tipoEmoji: { fontSize: 28, marginBottom: 8 },
  tipoTitulo: { color: colors.textMuted, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  tipoTituloActivo: { color: colors.blue },
  tipoSub: { color: colors.textFaint, fontSize: 11 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15 },
  infoBox: { backgroundColor: colors.greenLight, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.green },
  infoTitulo: { color: colors.green, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoSub: { color: colors.textMuted, fontSize: 13 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: colors.textMuted, fontSize: 14 },
  loginLinkBlue: { color: colors.blue, fontWeight: '600' },
  inputSublabel: { color: colors.textFaint, fontSize: 12, marginBottom: 14, marginTop: -6 },
  servicioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border2, gap: 10 },
  servicioEmoji: { fontSize: 20 },
  servicioNombre: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  servicioPrecioWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border2 },
  servicioPrecioInput: { color: colors.text, fontSize: 15, fontWeight: 'bold', paddingVertical: 8, minWidth: 50, textAlign: 'center' },
});