import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { useIdioma, IDIOMAS } from '../i18n';

const API = 'https://fontap-backend-production.up.railway.app';

export default function AjustesCuentaScreen({ navigation }) {
  const { usuario, token, logout, login } = useAuth();
  const { t, idioma, cambiarIdioma } = useIdioma();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [telefono, setTelefono] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState('');
  const [errPerfil, setErrPerfil] = useState('');

  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passRepetir, setPassRepetir] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [msgPass, setMsgPass] = useState('');
  const [errPass, setErrPass] = useState('');

  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errEliminar, setErrEliminar] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!usuario?.id) return;
    axios.get(`${API}/usuarios/${usuario.id}/perfil`, { headers })
      .then((res) => {
        setNombre(res.data.nombre || '');
        setTelefono(res.data.telefono || '');
        setEmail(res.data.email || '');
      })
      .catch(() => {});
  }, [usuario?.id]);

  const guardarPerfil = async () => {
    setMsgPerfil(''); setErrPerfil('');
    if (!usuario?.id) { setErrPerfil('No se pudieron guardar los datos'); return; }
    if (!nombre.trim()) { setErrPerfil('El nombre no puede estar vacío'); return; }
    setGuardandoPerfil(true);
    try {
      const res = await axios.put(`${API}/usuarios/${usuario.id}/perfil`,
        { nombre: nombre.trim(), telefono: telefono.trim() }, { headers });
      setMsgPerfil('Datos guardados');
      // Refresca el nombre guardado en la sesión local para que se vea al instante
      await login({ access_token: token, tipo_usuario: usuario.tipo, nombre: res.data.nombre, id: usuario.id });
    } catch (e) {
      setErrPerfil(e.response?.data?.detail || 'No se pudieron guardar los datos');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const cambiarPassword = async () => {
    setMsgPass(''); setErrPass('');
    if (!usuario?.id) { setErrPass('No se pudo cambiar la contraseña'); return; }
    if (!passActual || !passNueva || !passRepetir) { setErrPass('Rellena los tres campos'); return; }
    if (passNueva.length < 6) { setErrPass('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (passNueva !== passRepetir) { setErrPass('Las contraseñas nuevas no coinciden'); return; }
    setGuardandoPass(true);
    try {
      await axios.put(`${API}/usuarios/${usuario.id}/password`,
        { password_actual: passActual, password_nueva: passNueva }, { headers });
      setMsgPass('Contraseña actualizada');
      setPassActual(''); setPassNueva(''); setPassRepetir('');
    } catch (e) {
      setErrPass(e.response?.data?.detail || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardandoPass(false);
    }
  };

  const eliminarCuenta = async () => {
    setErrEliminar('');
    if (!usuario?.id) { setErrEliminar('No se pudo eliminar la cuenta'); return; }
    setEliminando(true);
    try {
      await axios.delete(`${API}/usuarios/${usuario.id}`, { headers });
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login', params: { cuentaEliminada: true } }] });
    } catch (e) {
      setErrEliminar(e.response?.data?.detail || 'No se pudo eliminar la cuenta');
      setEliminando(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.btnVolver}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitulo}>{t('miCuenta')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.seccionTitulo}>{t('idioma')}</Text>
        <View style={s.idiomaRow}>
          {IDIOMAS.map((i) => (
            <TouchableOpacity key={i.codigo} onPress={() => cambiarIdioma(i.codigo)}
              style={[s.idiomaBtn, idioma === i.codigo && s.idiomaBtnActivo]}>
              <Text style={[s.idiomaText, idioma === i.codigo && s.idiomaTextActivo]}>{i.etiqueta}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.seccionTitulo}>{t('datosPersonales')}</Text>
        {email ? <Text style={s.emailInfo}>{t('sesionComo')} {email}</Text> : null}
        {errPerfil ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {errPerfil}</Text></View> : null}
        {msgPerfil ? <View style={s.okBox}><Text style={s.okText}>✓ {msgPerfil}</Text></View> : null}
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={colors.textFaint}
            value={nombre} onChangeText={t => { setNombre(t); setMsgPerfil(''); }} />
        </View>
        <View style={s.inputWrap}>
          <Ionicons name="call-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
          <TextInput style={s.input} placeholder="Teléfono (opcional)" placeholderTextColor={colors.textFaint}
            value={telefono} onChangeText={t => { setTelefono(t); setMsgPerfil(''); }} keyboardType="phone-pad" />
        </View>
        <TouchableOpacity style={[s.btnPrimario, guardandoPerfil && s.btnDesactivado]} onPress={guardarPerfil} disabled={guardandoPerfil}>
          <Text style={s.btnPrimarioText}>{guardandoPerfil ? t('guardando') : t('guardarDatos')}</Text>
        </TouchableOpacity>

        <Text style={s.seccionTitulo}>{t('cambiarPassword')}</Text>
        {errPass ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {errPass}</Text></View> : null}
        {msgPass ? <View style={s.okBox}><Text style={s.okText}>✓ {msgPass}</Text></View> : null}
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
          <TextInput style={s.input} placeholder="Contraseña actual" placeholderTextColor={colors.textFaint}
            value={passActual} onChangeText={setPassActual} secureTextEntry />
        </View>
        <View style={s.inputWrap}>
          <Ionicons name="key-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
          <TextInput style={s.input} placeholder="Nueva contraseña (mín. 6)" placeholderTextColor={colors.textFaint}
            value={passNueva} onChangeText={setPassNueva} secureTextEntry />
        </View>
        <View style={s.inputWrap}>
          <Ionicons name="key-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
          <TextInput style={s.input} placeholder="Repite la nueva contraseña" placeholderTextColor={colors.textFaint}
            value={passRepetir} onChangeText={setPassRepetir} secureTextEntry />
        </View>
        <TouchableOpacity style={[s.btnPrimario, guardandoPass && s.btnDesactivado]} onPress={cambiarPassword} disabled={guardandoPass}>
          <Text style={s.btnPrimarioText}>{guardandoPass ? t('cambiando') : t('cambiarPassword')}</Text>
        </TouchableOpacity>

        <Text style={[s.seccionTitulo, s.seccionPeligro]}>{t('zonaPeligrosa')}</Text>
        {errEliminar ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {errEliminar}</Text></View> : null}
        {!confirmandoEliminar ? (
          <TouchableOpacity style={s.btnPeligroBorde} onPress={() => setConfirmandoEliminar(true)}>
            <Ionicons name="trash-outline" size={17} color="#FF6B6B" />
            <Text style={s.btnPeligroBordeText}>{t('eliminarCuenta')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.avisoEliminar}>
            <Text style={s.avisoEliminarTitulo}>{t('eliminarConfirmTitulo')}</Text>
            <Text style={s.avisoEliminarTexto}>{t('eliminarConfirmTexto')}</Text>
            <TouchableOpacity style={[s.btnPeligro, eliminando && s.btnDesactivado]} onPress={eliminarCuenta} disabled={eliminando}>
              <Text style={s.btnPeligroText}>{eliminando ? t('eliminando') : t('eliminarDefinitivo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnCancelar} onPress={() => setConfirmandoEliminar(false)} disabled={eliminando}>
              <Text style={s.btnCancelarText}>{t('cancelar')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12 },
  btnVolver: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  scroll: { padding: 20, paddingBottom: 60 },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 22, marginBottom: 12 },
  seccionPeligro: { color: '#FF6B6B' },
  emailInfo: { color: colors.textFaint, fontSize: 13, marginBottom: 12 },
  idiomaRow: { flexDirection: 'row', gap: 10 },
  idiomaBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' },
  idiomaBtnActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  idiomaText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  idiomaTextActivo: { color: colors.blue },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.red },
  errorText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center' },
  okBox: { backgroundColor: colors.greenLight, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.green },
  okText: { color: colors.green, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 15 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDesactivado: { opacity: 0.5 },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnPeligroBorde: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#FF6B6B', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center' },
  btnPeligroBordeText: { color: '#FF6B6B', fontWeight: '600', fontSize: 15 },
  avisoEliminar: { backgroundColor: colors.redLight, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.red },
  avisoEliminarTitulo: { color: colors.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  avisoEliminarTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  btnPeligro: { backgroundColor: '#C8271A', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPeligroText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnCancelar: { padding: 12, alignItems: 'center', marginTop: 4 },
  btnCancelarText: { color: colors.textMuted, fontSize: 14 },
});
