import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { useGoogleAuth, googleConfigurado } from '../googleAuth';
import { useIdioma } from '../i18n';
import { GREMIOS, serviciosDe } from '../gremios';
import { Ionicons } from '@expo/vector-icons';
import { avisar } from '../confirmar';

const API = 'https://fontap-backend-production.up.railway.app';

export default function RegistroScreen({ navigation }) {
  const { login: guardarSesion } = useAuth();
  const { t } = useIdioma();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [gremio, setGremio] = useState('fontanero');
  const [codigoReferido, setCodigoReferido] = useState('');
  const [gremioAbierto, setGremioAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [emailYaRegistrado, setEmailYaRegistrado] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync, redirectUri: googleRedirectUri } = useGoogleAuth();

  const entrarConGoogle = async (data) => {
    await guardarSesion(data);
    if (data.tipo_usuario === 'fontanero') {
      navigation.replace('PanelFontanero', { nombre: data.nombre, userId: data.id });
    } else {
      navigation.replace('Mapa', { clienteId: data.id });
    }
  };

  const handleGoogle = () => {
    if (!googleConfigurado()) {
      avisar('Google no configurado', `Falta el Client ID de Google en googleAuth.js. Redirect URI a registrar en Google Cloud Console: ${googleRedirectUri}`);
      return;
    }
    googlePromptAsync();
  };

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.params?.id_token) {
      setError('');
      setCargando(true);
      axios.post(`${API}/auth/google`, { id_token: googleResponse.params.id_token, tipo, nonce: googleResponse.nonce })
        .then((res) => entrarConGoogle(res.data))
        .catch(() => setError('No se pudo continuar con Google'))
        .finally(() => setCargando(false));
    }
  }, [googleResponse]);
  const [serviciosRegistro, setServiciosRegistro] = useState(
    serviciosDe('fontanero').map((sv) => ({ ...sv, precio: '' }))
  );

  useEffect(() => {
    setServiciosRegistro(serviciosDe(gremio).map((sv) => ({ ...sv, precio: '' })));
  }, [gremio]);

  const registrar = async () => {
    setError('');
    if (!nombre || !email || !telefono || !password) { setError('Rellena todos los campos'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!terminosAceptados) { setError('Debes aceptar los términos y condiciones'); return; }
    setCargando(true);
    try {
      const res = await axios.post(`${API}/registro`, {
        nombre, email, telefono, password, tipo, terminos_aceptados: terminosAceptados, gremio,
        codigo_referido: codigoReferido.trim() || null,
      });
      await guardarSesion(res.data);
      if (tipo === 'fontanero') {
        // El formulario deja fijar precios base por servicio, pero /registro no los
        // acepta: se guardan aparte con el mismo endpoint que usa Mi perfil, para que
        // no se pierdan silenciosamente.
        const authHeaders = { Authorization: `Bearer ${res.data.access_token}` };
        const conPrecio = serviciosRegistro.filter(sv => sv.precio && parseFloat(sv.precio) > 0);
        await Promise.all(conPrecio.map(sv =>
          axios.post(`${API}/fontaneros/${res.data.id}/servicios`, {
            nombre: sv.nombre,
            precio: parseFloat(sv.precio),
          }, { headers: authHeaders }).catch(() => {})
        ));
      }
      const destino = tipo === 'fontanero' ? 'PanelFontanero' : tipo === 'administrador_fincas' ? 'Proyectos' : 'Mapa';
      const destinoParams = tipo === 'fontanero'
        ? { nombre: res.data.nombre || nombre, userId: res.data.id }
        : tipo === 'administrador_fincas' ? {} : { clienteId: res.data.id };
      // Entra directo a la app: la verificación del email no bloquea el registro.
      // Los profesionales ven el aviso "Verifica tu email" en su panel, con acceso
      // a la pantalla de verificación desde ahí.
      navigation.replace(destino, destinoParams);
    } catch (e) {
      const detalle = e.response?.data?.detail;
      if (e.response?.status === 400 && detalle === 'Email ya registrado') {
        setError('Este email ya está registrado');
        setEmailYaRegistrado(true);
      } else if (e.response?.status === 400 && detalle) {
        setError(detalle);
      } else {
        setError('No se pudo crear la cuenta, inténtalo de nuevo');
      }
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

      <Text style={s.titulo}>{t('crearCuenta')}</Text>
      <Text style={s.sub}>{t('uneteGratis')}</Text>

      {/* maxFontSizeMultiplier limita el escalado del ajuste de fuente del sistema:
          con 3 tarjetas en fila, un texto muy ampliado desborda y se ve gigante. */}
      <View style={s.tipoRow}>
        <TouchableOpacity style={[s.tipoBtn, tipo === 'cliente' && s.tipoBtnActivo]} onPress={() => setTipo('cliente')}>
          <Text style={s.tipoEmoji} maxFontSizeMultiplier={1.1}>👤</Text>
          <Text style={[s.tipoTitulo, tipo === 'cliente' && s.tipoTituloActivo]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{t('soyCliente')}</Text>
          <Text style={s.tipoSub} numberOfLines={2} maxFontSizeMultiplier={1.1}>{t('necesitoProfesional')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tipoBtn, tipo === 'fontanero' && s.tipoBtnActivo]} onPress={() => setTipo('fontanero')}>
          <Text style={s.tipoEmoji} maxFontSizeMultiplier={1.1}>🛠️</Text>
          <Text style={[s.tipoTitulo, tipo === 'fontanero' && s.tipoTituloActivo]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{t('soyProfesional')}</Text>
          <Text style={s.tipoSub} numberOfLines={2} maxFontSizeMultiplier={1.1}>{t('quieroTrabajos')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tipoBtn, tipo === 'administrador_fincas' && s.tipoBtnActivo]} onPress={() => setTipo('administrador_fincas')}>
          <Text style={s.tipoEmoji} maxFontSizeMultiplier={1.1}>🏢</Text>
          <Text style={[s.tipoTitulo, tipo === 'administrador_fincas' && s.tipoTituloActivo]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>Administrador</Text>
          <Text style={s.tipoSub} numberOfLines={2} maxFontSizeMultiplier={1.1}>Publico proyectos</Text>
        </TouchableOpacity>
      </View>

      {tipo === 'fontanero' && (
        <>
          <Text style={s.inputLabel}>{t('tuGremio')}</Text>
          <TouchableOpacity style={s.gremioDesplegable} onPress={() => setGremioAbierto(!gremioAbierto)}>
            <View style={s.gremioDesplegableIzq}>
              <Text style={s.gremioEmoji}>{GREMIOS.find((g) => g.valor === gremio)?.emoji}</Text>
              <Text style={s.gremioDesplegableText}>{t(GREMIOS.find((g) => g.valor === gremio)?.clave)}</Text>
            </View>
            <Ionicons name={gremioAbierto ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {gremioAbierto && (
            <View style={s.gremioLista}>
              {GREMIOS.map((g) => (
                <TouchableOpacity key={g.valor} style={[s.gremioOpcion, gremio === g.valor && s.gremioOpcionActiva]}
                  onPress={() => { setGremio(g.valor); setGremioAbierto(false); }}>
                  <Text style={s.gremioEmoji}>{g.emoji}</Text>
                  <Text style={[s.gremioOpcionText, gremio === g.valor && s.gremioOpcionTextActiva]}>{t(g.clave)}</Text>
                  {gremio === g.valor && <Ionicons name="checkmark" size={16} color={colors.blue} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.inputLabel}>Código de invitación de un colega (opcional)</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🎟️</Text>
            <TextInput style={s.input} placeholder="Ej. A1B2C3" placeholderTextColor={colors.textFaint}
              value={codigoReferido} onChangeText={setCodigoReferido}
              autoCapitalize="characters" />
          </View>
        </>
      )}

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>⚠️ {error}</Text>
          {emailYaRegistrado && (
            <TouchableOpacity onPress={() => navigation.replace('Login', { emailPrellenado: email.trim() })}>
              <Text style={s.errorLink}>Inicia sesión con este email →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <Text style={s.inputLabel}>{t('nombreCompleto')}</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>👤</Text>
        <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={colors.textFaint}
          value={nombre} onChangeText={t => { setNombre(t); setError(''); }} />
      </View>

      <Text style={s.inputLabel}>{t('email')}</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>✉️</Text>
        <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor={colors.textFaint}
          value={email} onChangeText={t => { setEmail(t); setError(''); setEmailYaRegistrado(false); }}
          keyboardType="email-address" autoCapitalize="none" />
      </View>

      <Text style={s.inputLabel}>{t('telefono')}</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputIcon}>📱</Text>
        <TextInput style={s.input} placeholder="+34 612 345 678" placeholderTextColor={colors.textFaint}
          value={telefono} onChangeText={t => { setTelefono(t); setError(''); }}
          keyboardType="phone-pad" />
      </View>

      <Text style={s.inputLabel}>{t('password')}</Text>
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
          <Text style={s.inputLabel}>Tus servicios y precios base</Text>
          <Text style={s.inputSublabel}>El cliente los verá antes de contratarte</Text>
          {serviciosRegistro.map((sv, i) => (
            <View key={sv.nombre} style={s.servicioRow}>
              <Text style={s.servicioEmoji}>{sv.emoji}</Text>
              <Text style={s.servicioNombre}>{sv.nombre}</Text>
              <View style={s.servicioPrecioWrap}>
                <TextInput
                  style={s.servicioPrecioInput}
                  placeholder="€"
                  placeholderTextColor={colors.textFaint}
                  value={sv.precio}
                  onChangeText={valor => {
                    const nuevos = [...serviciosRegistro];
                    nuevos[i].precio = valor;
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

      <TouchableOpacity style={s.terminosRow} onPress={() => { setTerminosAceptados(!terminosAceptados); setError(''); }}>
        <View style={[s.checkbox, terminosAceptados && s.checkboxActivo]}>
          {terminosAceptados && <Text style={s.checkboxCheck}>✓</Text>}
        </View>
        <Text style={s.terminosTexto}>
          Acepto los{' '}
          <Text style={s.terminosLink} onPress={() => navigation.navigate('Terminos')}>
            términos y condiciones
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.btnPrimario, cargando && s.btnDesactivado]} onPress={registrar} disabled={cargando}>
        <Text style={s.btnPrimarioText}>{cargando ? t('creando') : t('crearCuentaGratis')}</Text>
      </TouchableOpacity>

      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>o</Text>
        <View style={s.dividerLine} />
      </View>

      <TouchableOpacity style={s.btnGoogle} onPress={handleGoogle} disabled={!googleRequest || cargando}>
        <Text style={s.btnGoogleIcon}>G</Text>
        <Text style={s.btnGoogleText}>Continuar con Google como {tipo === 'fontanero' ? 'profesional' : 'cliente'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginLink}>
        <Text style={s.loginLinkText}>{t('yaTienesCuenta')} <Text style={s.loginLinkBlue}>{t('iniciarSesion')}</Text></Text>
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
  gremioDesplegable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard2, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border2, marginBottom: 10 },
  gremioDesplegableIzq: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gremioDesplegableText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  gremioEmoji: { fontSize: 17 },
  gremioLista: { backgroundColor: colors.bgCard2, borderRadius: 14, borderWidth: 1, borderColor: colors.border2, marginBottom: 20, overflow: 'hidden' },
  gremioOpcion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  gremioOpcionActiva: { backgroundColor: colors.blueLight },
  gremioOpcionText: { flex: 1, color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  gremioOpcionTextActiva: { color: colors.blue, fontWeight: '700' },
  tipoBtn: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  tipoBtnActivo: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  tipoEmoji: { fontSize: 28, marginBottom: 8 },
  tipoTitulo: { color: colors.textMuted, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  tipoTituloActivo: { color: colors.blue },
  tipoSub: { color: colors.textFaint, fontSize: 11 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  errorLink: { color: colors.blue, fontSize: 13, fontWeight: '700', marginTop: 8 },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 15, fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border2 },
  dividerText: { color: colors.textFaint, marginHorizontal: 12, fontSize: 13 },
  btnGoogle: { flexDirection: 'row', gap: 10, borderWidth: 1.5, borderColor: colors.border2, borderRadius: 14, padding: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#fff' },
  btnGoogleIcon: { fontSize: 16, fontWeight: 'bold', color: '#4285F4' },
  btnGoogleText: { color: '#1F1F1F', fontWeight: '600', fontSize: 14 },
  terminosRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border2, justifyContent: 'center', alignItems: 'center' },
  checkboxActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkboxCheck: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  terminosTexto: { flex: 1, color: colors.textMuted, fontSize: 13 },
  terminosLink: { color: colors.blue, fontWeight: '600' },
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