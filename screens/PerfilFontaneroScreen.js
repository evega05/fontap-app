import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';
import axios from 'axios';

const API = 'https://fontap-backend-production.up.railway.app';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HORAS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

const SERVICIOS_INICIALES = [
  { id: 1, nombre: 'Desatasco', precio: 60, duracion: 60, activo: true },
  { id: 2, nombre: 'Fuga de agua', precio: 80, duracion: 90, activo: true },
  { id: 3, nombre: 'Caldera', precio: 90, duracion: 120, activo: true },
  { id: 4, nombre: 'Grifo / ducha', precio: 50, duracion: 60, activo: true },
];

const HORARIO_INICIAL = [
  { dia: 0, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 1, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 2, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 3, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 4, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 5, activo: false, inicio: '09:00', fin: '14:00' },
  { dia: 6, activo: false, inicio: '09:00', fin: '14:00' },
];

export default function PerfilFontaneroScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const nombre = route.params?.nombre || usuario?.nombre || 'Fontanero';
  const userId = route.params?.userId || usuario?.id || 1;
  const PERFIL_KEY = `perfil_${userId}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [tab, setTab] = useState('perfil');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [servicios, setServicios] = useState(SERVICIOS_INICIALES);
  const [horario, setHorario] = useState(HORARIO_INICIAL);
  const [nuevoServicio, setNuevoServicio] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevaDuracion, setNuevaDuracion] = useState('60');
  const [guardado, setGuardado] = useState(false);
  const [editandoHora, setEditandoHora] = useState(null);
  const [zona, setZona] = useState('Bilbao Centro');
  const [descripcion, setDescripcion] = useState('Fontanero profesional con más de 10 años de experiencia en Bilbao.');
  const [suscripcionActiva, setSuscripcionActiva] = useState(true);
  const [fotosTrabajos, setFotosTrabajos] = useState([]);
  const [fotoPerfil, setFotoPerfil] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const foto = await AsyncStorage.getItem(`${PERFIL_KEY}_fotoPerfil`);
      const desc = await AsyncStorage.getItem(`${PERFIL_KEY}_descripcion`);
      const zon = await AsyncStorage.getItem(`${PERFIL_KEY}_zona`);
      if (foto) setFotoPerfil(foto);
      if (desc) setDescripcion(desc);
      if (zon) setZona(zon);
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/galeria`, { headers });
      if (res.data && Array.isArray(res.data)) {
        setFotosTrabajos(res.data.map(f => ({ id: f.id, uri: f.url, desc: f.descripcion || 'Trabajo realizado' })));
      }
    } catch (e) {
      const fotos = await AsyncStorage.getItem(`${PERFIL_KEY}_fotosTrabajos`).catch(() => null);
      if (fotos) setFotosTrabajos(JSON.parse(fotos));
    }
  };

  const subirFotoPerfil = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!resultado.canceled) {
      const uri = resultado.assets[0].uri;
      setFotoPerfil(uri);
      await AsyncStorage.setItem(`${PERFIL_KEY}_fotoPerfil`, uri);
    }
  };

  const subirFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (resultado.canceled) return;

    const uri = resultado.assets[0].uri;
    const localFoto = { id: Date.now(), uri, desc: 'Trabajo realizado' };
    setFotosTrabajos(prev => [...prev, localFoto]);
    setSubiendoFoto(true);

    try {
      const form = new FormData();
      form.append('archivo', { uri, name: 'foto.jpg', type: 'image/jpeg' });
      const res = await axios.post(`${API}/fontaneros/${userId}/galeria`, form, {
        params: { descripcion: 'Trabajo realizado' },
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const fotoBackend = res.data;
      setFotosTrabajos(prev =>
        prev.map(f => f.id === localFoto.id
          ? { id: fotoBackend.id, uri: fotoBackend.url || uri, desc: fotoBackend.descripcion || 'Trabajo realizado' }
          : f
        )
      );
    } catch (e) {
      await AsyncStorage.setItem(`${PERFIL_KEY}_fotosTrabajos`, JSON.stringify(
        fotosTrabajos.concat(localFoto)
      )).catch(() => {});
    } finally {
      setSubiendoFoto(false);
    }
  };

  const eliminarFoto = async (id) => {
    setFotosTrabajos(prev => prev.filter(f => f.id !== id));
    try {
      await axios.delete(`${API}/fontaneros/${userId}/galeria/${id}`, { headers });
    } catch (e) {}
  };

  const toggleDia = (index) => {
    const nuevo = [...horario];
    nuevo[index].activo = !nuevo[index].activo;
    setHorario(nuevo);
  };

  const cambiarHora = (diaIndex, tipo, hora) => {
    const nuevo = [...horario];
    nuevo[diaIndex][tipo] = hora;
    setHorario(nuevo);
    setEditandoHora(null);
  };

  const toggleServicio = (id) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, activo: !s.activo } : s));
  };

  const añadirServicio = () => {
    if (!nuevoServicio || !nuevoPrecio) return;
    setServicios(prev => [...prev, {
      id: Date.now(),
      nombre: nuevoServicio,
      precio: parseInt(nuevoPrecio),
      duracion: parseInt(nuevaDuracion) || 60,
      activo: true
    }]);
    setNuevoServicio('');
    setNuevoPrecio('');
    setNuevaDuracion('60');
  };

  const eliminarServicio = (id) => {
    setServicios(prev => prev.filter(s => s.id !== id));
  };

  const guardar = async () => {
    try {
      await AsyncStorage.setItem(`${PERFIL_KEY}_fotoPerfil`, fotoPerfil || '');
      await AsyncStorage.setItem(`${PERFIL_KEY}_descripcion`, descripcion);
      await AsyncStorage.setItem(`${PERFIL_KEY}_zona`, zona);
    } catch (e) {}
    try {
      await axios.put(`${API}/fontaneros/${userId}/perfil`, { descripcion, zona }, { headers });
    } catch (e) {}
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const TABS = [
    { key: 'perfil', label: 'Perfil', emoji: '👤' },
    { key: 'horario', label: 'Horario', emoji: '🗓' },
    { key: 'servicios', label: 'Servicios', emoji: '🔧' },
    { key: 'trabajos', label: 'Trabajos', emoji: '📸' },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mi perfil</Text>
        <TouchableOpacity onPress={guardar} style={s.guardarBtnWrap}>
          <Text style={[s.guardarBtn, guardado && s.guardarBtnOk]}>
            {guardado ? '✓ Guardado' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActivo]} onPress={() => setTab(t.key)}>
            <Text style={s.tabEmoji}>{t.emoji}</Text>
            <Text style={[s.tabText, tab === t.key && s.tabTextActivo]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {tab === 'perfil' && (
          <>
            <View style={s.avatarWrap}>
              <TouchableOpacity onPress={subirFotoPerfil}>
                {fotoPerfil ? (
                  <Image source={{ uri: fotoPerfil }} style={s.avatarGrandeImagen} />
                ) : (
                  <View style={s.avatarGrande}>
                    <Text style={s.avatarGrandeText}>{nombre[0]}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.fotoBtn} onPress={subirFotoPerfil}>
                <Text style={s.fotoBtnText}>📷 Cambiar foto</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.nombreGrande}>{nombre}</Text>
            <Text style={s.verificado}>✅ Identidad verificada</Text>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>4.8</Text>
                <Text style={s.statLabel}>⭐ Valoración</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statNum}>87</Text>
                <Text style={s.statLabel}>✅ Trabajos</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statNum}>340€</Text>
                <Text style={s.statLabel}>💰 Este mes</Text>
              </View>
            </View>

            <Text style={s.seccionTitulo}>Zona de trabajo</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>📍</Text>
              <TextInput style={s.input} placeholder="Ej: Bilbao y alrededores"
                placeholderTextColor={colors.textFaint} value={zona} onChangeText={setZona} />
            </View>

            <Text style={s.seccionTitulo}>Sobre mí</Text>
            <TextInput
              style={s.textArea}
              placeholder="Cuéntanos tu experiencia, especialidades..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={5}
              value={descripcion}
              onChangeText={setDescripcion}
            />

            <Text style={s.seccionTitulo}>Contacto</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>📱</Text>
              <TextInput style={s.input} placeholder="Teléfono" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
            </View>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>✉️</Text>
              <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textFaint} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={[s.suscripcionCard, !suscripcionActiva && s.suscripcionInactiva]}>
              <View style={s.suscripcionHeader}>
                <Text style={s.suscripcionTitulo}>{suscripcionActiva ? '💎 Suscripción activa' : '⚠️ Suscripción inactiva'}</Text>
                <View style={[s.suscripcionBadge, !suscripcionActiva && s.suscripcionBadgeInactiva]}>
                  <Text style={s.suscripcionBadgeText}>{suscripcionActiva ? 'PRO' : 'INACTIVA'}</Text>
                </View>
              </View>
              <Text style={s.suscripcionSub}>
                {suscripcionActiva ? '50€/mes · Próxima renovación: 01/07/26' : 'Reactiva tu suscripción para recibir trabajos'}
              </Text>
              <View style={s.suscripcionBotones}>
                <TouchableOpacity style={s.btnGestionar} onPress={() => setSuscripcionActiva(!suscripcionActiva)}>
                  <Text style={s.btnGestionarText}>{suscripcionActiva ? 'Cancelar suscripción' : 'Reactivar suscripción'}</Text>
                </TouchableOpacity>
                {suscripcionActiva && (
                  <TouchableOpacity style={s.btnFacturas}>
                    <Text style={s.btnFacturasText}>Ver facturas</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}

        {tab === 'horario' && (
          <>
            <Text style={s.seccionTitulo}>Días y horas de trabajo</Text>
            <Text style={s.seccionSub}>Toca las horas para editarlas</Text>

            {horario.map((h, i) => (
              <View key={i} style={[s.diaCard, !h.activo && s.diaCardInactivo]}>
                <Switch value={h.activo} onValueChange={() => toggleDia(i)}
                  trackColor={{ false: colors.bgCard3, true: colors.blueLight }}
                  thumbColor={h.activo ? colors.blue : colors.textFaint} />
                <Text style={[s.diaNombre, !h.activo && s.diaInactivo]}>{DIAS[i]}</Text>
                {h.activo && (
                  <View style={s.horasRow}>
                    <TouchableOpacity style={s.horaBtn} onPress={() => setEditandoHora({ dia: i, tipo: 'inicio' })}>
                      <Text style={s.horaBtnText}>{h.inicio}</Text>
                    </TouchableOpacity>
                    <Text style={s.horaFlecha}>→</Text>
                    <TouchableOpacity style={s.horaBtn} onPress={() => setEditandoHora({ dia: i, tipo: 'fin' })}>
                      <Text style={s.horaBtnText}>{h.fin}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {editandoHora && (
              <View style={s.horaSelectorWrap}>
                <Text style={s.horaSelectorTitulo}>
                  Hora de {editandoHora.tipo === 'inicio' ? 'inicio' : 'fin'} — {DIAS[editandoHora.dia]}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.horaScroll}>
                  {HORAS.map(h => (
                    <TouchableOpacity key={h}
                      style={[s.horaPill, horario[editandoHora.dia][editandoHora.tipo] === h && s.horaPillActiva]}
                      onPress={() => cambiarHora(editandoHora.dia, editandoHora.tipo, h)}>
                      <Text style={[s.horaPillText, horario[editandoHora.dia][editandoHora.tipo] === h && s.horaPillTextActiva]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setEditandoHora(null)} style={s.cerrarSelector}>
                  <Text style={s.cerrarSelectorText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tab === 'servicios' && (
          <>
            <Text style={s.seccionTitulo}>Mis servicios y precios base</Text>
            <Text style={s.seccionSub}>El cliente verá estos precios antes de contratarte</Text>

            {servicios.map(sv => (
              <View key={sv.id} style={[s.servicioCard, !sv.activo && s.servicioInactivo]}>
                <Switch value={sv.activo} onValueChange={() => toggleServicio(sv.id)}
                  trackColor={{ false: colors.bgCard3, true: colors.blueLight }}
                  thumbColor={sv.activo ? colors.blue : colors.textFaint} />
                <View style={s.servicioInfo}>
                  <Text style={[s.servicioNombre, !sv.activo && s.diaInactivo]}>{sv.nombre}</Text>
                  <Text style={s.servicioDuracion}>⏱ {sv.duracion} min</Text>
                </View>
                <Text style={s.servicioPrecio}>desde {sv.precio}€</Text>
                <TouchableOpacity onPress={() => eliminarServicio(sv.id)} style={s.eliminarBtn}>
                  <Text style={s.eliminarBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={s.añadirCard}>
              <Text style={s.añadirTitulo}>➕ Añadir servicio</Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>🔧</Text>
                <TextInput style={s.input} placeholder="Nombre del servicio" placeholderTextColor={colors.textFaint}
                  value={nuevoServicio} onChangeText={setNuevoServicio} />
              </View>
              <View style={s.dobleInput}>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.inputIcon}>💰</Text>
                  <TextInput style={s.input} placeholder="Precio €" placeholderTextColor={colors.textFaint}
                    value={nuevoPrecio} onChangeText={setNuevoPrecio} keyboardType="numeric" />
                </View>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.inputIcon}>⏱</Text>
                  <TextInput style={s.input} placeholder="Min" placeholderTextColor={colors.textFaint}
                    value={nuevaDuracion} onChangeText={setNuevaDuracion} keyboardType="numeric" />
                </View>
              </View>
              <TouchableOpacity style={s.btnAñadir} onPress={añadirServicio}>
                <Text style={s.btnAñadirText}>Añadir servicio</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tab === 'trabajos' && (
          <>
            <Text style={s.seccionTitulo}>Mis trabajos realizados</Text>
            <Text style={s.seccionSub}>Sube fotos para que los clientes vean la calidad de tu trabajo</Text>

            <TouchableOpacity style={s.subirFotoBtn} onPress={subirFoto} disabled={subiendoFoto}>
              {subiendoFoto ? (
                <ActivityIndicator color={colors.blue} style={{ marginBottom: 8 }} />
              ) : (
                <Text style={s.subirFotoEmoji}>📸</Text>
              )}
              <Text style={s.subirFotoText}>{subiendoFoto ? 'Subiendo...' : 'Subir foto de trabajo'}</Text>
              <Text style={s.subirFotoSub}>Toca para seleccionar de tu galería</Text>
            </TouchableOpacity>

            {fotosTrabajos.length === 0 ? (
              <View style={s.fotosVacio}>
                <Text style={s.fotosVacioEmoji}>🖼️</Text>
                <Text style={s.fotosVacioText}>Aún no has subido fotos</Text>
                <Text style={s.fotosVacioSub}>Las fotos generan más confianza y más contratos</Text>
              </View>
            ) : (
              <View style={s.fotosGrid}>
                {fotosTrabajos.map(f => (
                  <View key={f.id} style={s.fotoCard}>
                    <Image source={{ uri: f.uri }} style={s.fotoImagen} />
                    <TextInput
                      style={s.fotoDescInput}
                      value={f.desc}
                      onChangeText={t => setFotosTrabajos(prev => prev.map(foto => foto.id === f.id ? { ...foto, desc: t } : foto))}
                      placeholder="Descripción..."
                      placeholderTextColor={colors.textFaint}
                    />
                    <TouchableOpacity style={s.fotoEliminar} onPress={() => eliminarFoto(f.id)}>
                      <Text style={s.fotoEliminarText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  backBtn: { padding: 4 },
  backText: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '600' },
  guardarBtnWrap: { padding: 4 },
  guardarBtn: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  guardarBtnOk: { color: colors.green },
  tabsScroll: { maxHeight: 60 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.bgCard, gap: 6, borderWidth: 1, borderColor: colors.border },
  tabActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  tabEmoji: { fontSize: 14 },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActivo: { color: colors.blue },
  contenido: { flex: 1 },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatarGrande: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: colors.blueLight },
  avatarGrandeText: { color: '#fff', fontWeight: 'bold', fontSize: 38 },
  fotoBtn: { backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2 },
  fotoBtnText: { color: colors.blue, fontSize: 13, fontWeight: '500' },
  nombreGrande: { color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  verificado: { color: colors.green, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  seccionTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 6, marginTop: 8 },
  seccionSub: { color: colors.textMuted, fontSize: 12, marginBottom: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border2 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: colors.text, paddingVertical: 13, fontSize: 14 },
  textArea: { backgroundColor: colors.bgCard, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border2, marginBottom: 16 },
  suscripcionCard: { backgroundColor: colors.blueLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.blue, marginTop: 8 },
  suscripcionInactiva: { backgroundColor: colors.redLight, borderColor: colors.red },
  suscripcionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  suscripcionTitulo: { color: colors.text, fontWeight: '600', fontSize: 15 },
  suscripcionBadge: { backgroundColor: colors.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  suscripcionBadgeInactiva: { backgroundColor: colors.red },
  suscripcionBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  suscripcionSub: { color: colors.textMuted, fontSize: 13, marginBottom: 14 },
  suscripcionBotones: { flexDirection: 'row', gap: 10 },
  btnGestionar: { flex: 1, borderWidth: 1, borderColor: colors.blue, borderRadius: 10, padding: 10, alignItems: 'center' },
  btnGestionarText: { color: colors.blue, fontSize: 13, fontWeight: '500' },
  btnFacturas: { flex: 1, borderWidth: 1, borderColor: colors.border2, borderRadius: 10, padding: 10, alignItems: 'center' },
  btnFacturasText: { color: colors.textMuted, fontSize: 13 },
  diaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: colors.border },
  diaCardInactivo: { opacity: 0.5 },
  diaNombre: { color: colors.text, fontWeight: '500', fontSize: 14, flex: 1 },
  diaInactivo: { color: colors.textFaint },
  horasRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horaBtn: { backgroundColor: colors.bgCard2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.blue },
  horaBtnText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  horaFlecha: { color: colors.textMuted, fontSize: 13 },
  horaSelectorWrap: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.blue },
  horaSelectorTitulo: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 12 },
  horaScroll: { marginBottom: 12 },
  horaPill: { backgroundColor: colors.bgCard2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  horaPillActiva: { backgroundColor: colors.blue, borderColor: colors.blue },
  horaPillText: { color: colors.textMuted, fontSize: 13 },
  horaPillTextActiva: { color: '#fff', fontWeight: '600' },
  cerrarSelector: { alignItems: 'center', paddingTop: 8 },
  cerrarSelectorText: { color: colors.textMuted, fontSize: 13 },
  servicioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: colors.border },
  servicioInactivo: { opacity: 0.5 },
  servicioInfo: { flex: 1 },
  servicioNombre: { color: colors.text, fontWeight: '500', fontSize: 14 },
  servicioDuracion: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  servicioPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 14 },
  eliminarBtn: { backgroundColor: colors.redLight, borderRadius: 8, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  eliminarBtnText: { color: colors.red, fontSize: 14, fontWeight: 'bold' },
  añadirCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  añadirTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 14 },
  dobleInput: { flexDirection: 'row', gap: 10 },
  btnAñadir: { backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 4 },
  btnAñadirText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subirFotoBtn: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, marginBottom: 16 },
  subirFotoEmoji: { fontSize: 36, marginBottom: 8 },
  subirFotoText: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 4 },
  subirFotoSub: { color: colors.textMuted, fontSize: 12 },
  fotosVacio: { alignItems: 'center', paddingVertical: 40 },
  fotosVacioEmoji: { fontSize: 48, marginBottom: 12 },
  fotosVacioText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  fotosVacioSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fotoCard: { width: '47%', backgroundColor: colors.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  fotoImagen: { width: '100%', height: 120 },
  fotoDescInput: { color: colors.textMuted, fontSize: 12, padding: 8, borderTopWidth: 0.5, borderTopColor: colors.border },
  fotoEliminar: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  fotoEliminarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  avatarGrandeImagen: { width: 92, height: 92, borderRadius: 46, marginBottom: 12 },
});