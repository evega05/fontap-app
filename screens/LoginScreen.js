import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { registrarNotificaciones } from './notifications';
import { useGoogleAuth, googleConfigurado } from '../googleAuth';
import { useIdioma, IDIOMAS } from '../i18n';

const API = 'https://fontap-backend-production.up.railway.app';

export default function LoginScreen({ navigation, route }) {
  const { login: guardarSesion } = useAuth();
  const { t, idioma, cambiarIdioma } = useIdioma();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState('');
  // Guarda la CLAVE de traducción, no el texto, para que cambie con el idioma
  const [aviso, setAviso] = useState(
    route?.params?.sesionCaducada ? 'sesionCaducada'
    : route?.params?.cuentaEliminada ? 'cuentaEliminada' : ''
  );
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync, redirectUri: googleRedirectUri } = useGoogleAuth();

  const entrarConToken = async (data, esGoogle) => {
    await guardarSesion(data);
    if (!esGoogle) registrarNotificaciones(data.id, data.access_token);
    if (data.tipo_usuario === 'fontanero') {
      navigation.replace('PanelFontanero', { nombre: data.nombre, userId: data.id });
    } else {
      navigation.replace('Mapa');
    }
  };

  const handleLogin = async () => {
    setError(''); setAviso('');
    if (!email || !password) { setError(t('rellenaCampos')); return; }
    setCargando(true);
    try {
      const res = await axios.post(`${API}/login`, { email, password });
      await entrarConToken(res.data, false);
    } catch (e) {
      if (e.response?.status === 429 || e.response?.status === 403) {
        setError(e.response?.data?.detail || t('errorCredenciales'));
      } else {
        setError(t('errorCredenciales'));
      }
    } finally {
      setCargando(false);
    }
  };

  const handleGoogle = () => {
    if (!googleConfigurado()) {
      Alert.alert('Google no configurado', `Falta el Client ID de Google en googleAuth.js.\n\nRedirect URI a registrar en Google Cloud Console:\n${googleRedirectUri}`);
      return;
    }
    googlePromptAsync();
  };

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.params?.id_token) {
      setError('');
      setCargando(true);
      axios.post(`${API}/auth/google`, { id_token: googleResponse.params.id_token })
        .then((res) => entrarConToken(res.data, true))
        .catch(() => setError('No se pudo iniciar sesión con Google'))
        .finally(() => setCargando(false));
    }
  }, [googleResponse]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.idiomaRow}>
        {IDIOMAS.map((i) => (
          <TouchableOpacity key={i.codigo} onPress={() => cambiarIdioma(i.codigo)}
            style={[s.idiomaBtn, idioma === i.codigo && s.idiomaBtnActivo]}>
            <Text style={[s.idiomaText, idioma === i.codigo && s.idiomaTextActivo]}>{i.codigo.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.hero}>
        <View style={s.logoWrap}>
          <Text style={s.logoIcon}>🛠️</Text>
        </View>
        <Text style={s.logoText}>{t('marca')}</Text>
        <Text style={s.logoSub}>{t('marcaSub')}</Text>
      </View>

      <View style={s.sheet}>
        <Text style={s.sheetTitulo}>{t('bienvenido')}</Text>
        <Text style={s.sheetSub}>{t('iniciaSub')}</Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}
        {aviso ? <View style={s.avisoBox}><Text style={s.avisoText}>ℹ️ {t(aviso)}</Text></View> : null}

        <Text style={s.inputLabel}>{t('email')}</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>✉️</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor={colors.textFaint}
            value={email} onChangeText={t => { setEmail(t); setError(''); }}
            keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Text style={s.inputLabel}>{t('password')}</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>🔒</Text>
          <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={colors.textFaint}
            value={password} onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry={!mostrarPass} />
          <TouchableOpacity onPress={() => setMostrarPass(!mostrarPass)}>
            <Text style={s.inputIcon}>{mostrarPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={handleLogin} disabled={cargando}>
          <Text style={s.btnPrimarioText}>{cargando ? t('entrando') : t('iniciarSesion')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('OlvidePassword')} style={s.olvideLink}>
          <Text style={s.olvideLinkText}>{t('olvidastePassword')}</Text>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>o</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity style={s.btnGoogle} onPress={handleGoogle} disabled={!googleRequest || cargando}>
          <Text style={s.btnGoogleIcon}>G</Text>
          <Text style={s.btnGoogleText}>{t('continuarGoogle')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btnSecundario} onPress={() => navigation.navigate('Registro')}>
          <Text style={s.btnSecundarioText}>{t('crearCuentaNueva')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Registro')} style={s.fontaneroLink}>
          <Text style={s.fontaneroLinkText}>{t('eresProfesional')} <Text style={s.fontaneroLinkBlue}>{t('unete')}</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  logoWrap: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.blueLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: colors.blue },
  logoIcon: { fontSize: 40 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: colors.text, letterSpacing: -0.5, textAlign: 'center', paddingHorizontal: 20 },
  idiomaRow: { position: 'absolute', top: 52, right: 18, flexDirection: 'row', gap: 6, zIndex: 10 },
  idiomaBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2 },
  idiomaBtnActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  idiomaText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  idiomaTextActivo: { color: colors.blue },
  logoSub: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 48, borderTopWidth: 1, borderColor: colors.border },
  sheetTitulo: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  sheetSub: { fontSize: 14, color: colors.textMuted, marginBottom: 28 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.red },
  avisoBox: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border2 },
  avisoText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 4 },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 },
  olvideLink: { alignItems: 'center', marginTop: 16 },
  olvideLinkText: { color: colors.blue, fontSize: 13, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border2 },
  dividerText: { color: colors.textFaint, marginHorizontal: 12, fontSize: 13 },
  btnSecundario: { borderWidth: 1.5, borderColor: colors.border2, borderRadius: 14, padding: 17, alignItems: 'center' },
  btnSecundarioText: { color: colors.text, fontWeight: '600', fontSize: 16 },
  btnGoogle: { flexDirection: 'row', gap: 10, borderWidth: 1.5, borderColor: colors.border2, borderRadius: 14, padding: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: '#fff' },
  btnGoogleIcon: { fontSize: 16, fontWeight: 'bold', color: '#4285F4' },
  btnGoogleText: { color: '#1F1F1F', fontWeight: '600', fontSize: 15 },
  fontaneroLink: { marginTop: 20, alignItems: 'center' },
  fontaneroLinkText: { color: colors.textMuted, fontSize: 14 },
  fontaneroLinkBlue: { color: colors.blue, fontWeight: '600' },
});