import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, type, shadow } from '../theme';
import axios from 'axios';
import { agregarArchivo } from '../subirArchivo';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';

const API = 'https://fontap-backend-production.up.railway.app';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HORAS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

const HORARIO_INICIAL = [
  { dia: 0, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 1, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 2, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 3, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 4, activo: true, inicio: '08:00', fin: '18:00' },
  { dia: 5, activo: false, inicio: '09:00', fin: '14:00' },
  { dia: 6, activo: false, inicio: '09:00', fin: '14:00' },
];

const TABS = [
  { key: 'perfil', label: 'Perfil', icon: 'person-outline' },
  { key: 'horario', label: 'Horario', icon: 'time-outline' },
  { key: 'servicios', label: 'Servicios', icon: 'construct-outline' },
  { key: 'trabajos', label: 'Trabajos', icon: 'images-outline' },
  { key: 'resenas', label: 'Reseñas', icon: 'star-outline' },
];

export default function PerfilFontaneroScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const nombre = route.params?.nombre || usuario?.nombre || 'Fontanero';
  const userId = route.params?.userId || usuario?.id || 1;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [tab, setTab] = useState('perfil');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoPerfil, setSubiendoFotoPerfil] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [stats, setStats] = useState(null);
  const [verificado, setVerificado] = useState(false);
  const [horario, setHorario] = useState(HORARIO_INICIAL);
  const [nuevoServicio, setNuevoServicio] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevaDuracion, setNuevaDuracion] = useState('60');
  const [guardado, setGuardado] = useState(false);
  const [editandoHora, setEditandoHora] = useState(null);
  const [zona, setZona] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotosTrabajos, setFotosTrabajos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [subiendoDoc, setSubiendoDoc] = useState(null);
  const [fotoPerfil, setFotoPerfil] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/perfil`);
      const p = res.data;
      setZona(p.zona || '');
      setDescripcion(p.descripcion || '');
      setVerificado(!!p.verificado);
      if (p.foto_url) setFotoPerfil(`${API}${p.foto_url}`);
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/estadisticas`, { headers });
      setStats(res.data);
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/resenas`);
      setResenas(res.data || []);
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/servicios`);
      setServicios(res.data || []);
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/galeria`);
      if (res.data && Array.isArray(res.data)) {
        setFotosTrabajos(res.data.map(f => ({ id: f.id, uri: `${API}${f.url}`, desc: f.descripcion || 'Trabajo realizado' })));
      }
    } catch (e) {}

    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/documentos`, { headers });
      setDocumentos(res.data || []);
    } catch (e) {}
  };

  const DOCUMENTOS_TIPOS = [
    { tipo: 'dni', label: 'DNI / NIE' },
    { tipo: 'carnet_profesional', label: 'Carnet profesional' },
    { tipo: 'seguro', label: 'Seguro de responsabilidad civil' },
  ];

  const documentoDe = (tipo) => documentos.filter(d => d.tipo === tipo).sort((a, b) => b.id - a.id)[0];

  const subirDocumento = async (tipo) => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (resultado.canceled) return;
    const uri = resultado.assets[0].uri;
    setSubiendoDoc(tipo);
    try {
      const form = new FormData();
      await agregarArchivo(form, 'archivo', uri, `${tipo}.jpg`, 'image/jpeg');
      const res = await axios.post(`${API}/fontaneros/${userId}/documentos`, form, {
        params: { tipo },
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setDocumentos(prev => [...prev.filter(d => d.id !== res.data.id), res.data]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir el documento');
    } finally {
      setSubiendoDoc(null);
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
    if (resultado.canceled) return;
    const uri = resultado.assets[0].uri;
    setSubiendoFotoPerfil(true);
    try {
      const form = new FormData();
      await agregarArchivo(form, 'archivo', uri, 'perfil.jpg', 'image/jpeg');
      const res = await axios.post(`${API}/fontaneros/${userId}/foto`, form, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setFotoPerfil(`${API}${res.data.foto_url}`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
    } finally {
      setSubiendoFotoPerfil(false);
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
    setSubiendoFoto(true);
    try {
      const form = new FormData();
      await agregarArchivo(form, 'archivo', uri, 'foto.jpg', 'image/jpeg');
      const res = await axios.post(`${API}/fontaneros/${userId}/galeria`, form, {
        params: { descripcion: 'Trabajo realizado' },
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const fotoBackend = res.data;
      setFotosTrabajos(prev => [...prev, {
        id: fotoBackend.id,
        uri: `${API}${fotoBackend.url}`,
        desc: fotoBackend.descripcion || 'Trabajo realizado',
      }]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto');
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

  const añadirServicio = async () => {
    if (!nuevoServicio || !nuevoPrecio) return;
    try {
      const res = await axios.post(`${API}/fontaneros/${userId}/servicios`, {
        nombre: nuevoServicio,
        precio: parseInt(nuevoPrecio),
        duracion_minutos: parseInt(nuevaDuracion) || 60,
      }, { headers });
      setServicios(prev => [...prev, res.data]);
      setNuevoServicio('');
      setNuevoPrecio('');
      setNuevaDuracion('60');
    } catch (e) {
      Alert.alert('Error', 'No se pudo añadir el servicio');
    }
  };

  const eliminarServicio = async (id) => {
    setServicios(prev => prev.filter(s => s.id !== id));
    try {
      await axios.delete(`${API}/fontaneros/${userId}/servicios/${id}`, { headers });
    } catch (e) {}
  };

  const guardar = async () => {
    try {
      await axios.put(`${API}/fontaneros/${userId}/perfil`, { descripcion, zona }, { headers });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  return (
    <View style={s.container}>
      <GradientBg />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.accent2} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mi perfil</Text>
        <Pressable onPress={guardar} haptic style={s.guardarBtnWrap}>
          <Text style={[s.guardarBtn, guardado && s.guardarBtnOk]}>
            {guardado ? '✓ Guardado' : 'Guardar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {TABS.map(t => (
          <Pressable key={t.key} haptic onPress={() => setTab(t.key)}>
            <Glass style={[s.tab, tab === t.key && s.tabActivo]}>
              <Ionicons name={t.icon} size={14} color={tab === t.key ? colors.accent2 : colors.textMuted} />
              <Text style={[s.tabText, tab === t.key && s.tabTextActivo]}>{t.label}</Text>
            </Glass>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>

        {tab === 'perfil' && (
          <>
            <View style={s.avatarWrap}>
              <TouchableOpacity onPress={subirFotoPerfil} disabled={subiendoFotoPerfil}>
                {subiendoFotoPerfil ? (
                  <View style={s.avatarGrande}><ActivityIndicator color="#fff" /></View>
                ) : fotoPerfil ? (
                  <Image source={{ uri: fotoPerfil }} style={s.avatarGrandeImagen} />
                ) : (
                  <LinearGradient colors={[colors.accent, colors.accent2]} style={s.avatarGrande}>
                    <Text style={s.avatarGrandeText}>{nombre[0]}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
              <Pressable haptic onPress={subirFotoPerfil} disabled={subiendoFotoPerfil}>
                <Glass style={s.fotoBtn}>
                  <Ionicons name="camera-outline" size={14} color={colors.accent2} />
                  <Text style={s.fotoBtnText}>Cambiar foto</Text>
                </Glass>
              </Pressable>
            </View>

            <Text style={s.nombreGrande}>{nombre}</Text>
            <View style={s.verificadoRow}>
              <Ionicons name={verificado ? 'checkmark-circle' : 'time-outline'} size={14} color={verificado ? colors.green : colors.amber} />
              <Text style={verificado ? s.verificado : s.noVerificado}>
                {verificado ? 'Identidad verificada' : 'Verificación pendiente'}
              </Text>
            </View>

            <View style={s.statsRow}>
              <Glass style={s.statCard}>
                <Ionicons name="star" size={16} color={colors.amber} />
                <Text style={s.statNum}>{stats?.valoracion_media ?? '—'}</Text>
                <Text style={s.statLabel}>Valoración</Text>
              </Glass>
              <Glass style={s.statCard}>
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                <Text style={s.statNum}>{stats?.trabajos_completados ?? 0}</Text>
                <Text style={s.statLabel}>Trabajos</Text>
              </Glass>
              <Glass style={s.statCard}>
                <Ionicons name="cash" size={16} color={colors.accent2} />
                <Text style={s.statNum}>{stats?.ingresos_totales ?? 0}€</Text>
                <Text style={s.statLabel}>Total ganado</Text>
              </Glass>
            </View>

            <Text style={s.seccionTitulo}>Zona de trabajo</Text>
            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
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
              <Ionicons name="call-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="Teléfono" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textFaint} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <Text style={s.seccionTitulo}>Verificación de identidad</Text>
            <Text style={s.seccionSub}>Sube estos documentos para que un administrador verifique tu perfil</Text>
            {DOCUMENTOS_TIPOS.map(({ tipo, label }) => {
              const doc = documentoDe(tipo);
              const estado = doc?.estado || 'sin_subir';
              const pillEstilo = estado === 'verificado' ? s.docPillOk : estado === 'rechazado' ? s.docPillMal : estado === 'pendiente' ? s.docPillPendiente : s.docPillVacio;
              const pillTexto = estado === 'verificado' ? '✓ Verificado' : estado === 'rechazado' ? '✕ Rechazado' : estado === 'pendiente' ? '⏳ Revisando' : 'Sin subir';
              return (
                <Glass key={tipo} style={s.docCard}>
                  <View style={s.docInfo}>
                    <Text style={s.docLabel}>{label}</Text>
                    <View style={pillEstilo}><Text style={s.docPillText}>{pillTexto}</Text></View>
                  </View>
                  <Pressable style={s.docBtn} haptic onPress={() => subirDocumento(tipo)} disabled={subiendoDoc === tipo}>
                    <Ionicons name={doc ? 'refresh-outline' : 'cloud-upload-outline'} size={15} color={colors.blue} />
                    <Text style={s.docBtnText}>
                      {subiendoDoc === tipo ? 'Subiendo...' : doc ? 'Reemplazar' : 'Subir'}
                    </Text>
                  </Pressable>
                </Glass>
              );
            })}

            <Pressable style={s.linkTerminos} haptic onPress={() => navigation.navigate('AjustesCuenta')}>
              <Text style={s.linkTerminosText}>Ajustes de cuenta (contraseña, eliminar cuenta)</Text>
            </Pressable>

            <Pressable style={s.linkTerminos} haptic onPress={() => navigation.navigate('Terminos')}>
              <Text style={s.linkTerminosText}>Términos y condiciones</Text>
            </Pressable>
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
                    <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
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

            {servicios.length === 0 && (
              <Text style={s.seccionSub}>Aún no has añadido servicios propios.</Text>
            )}
            {servicios.map(sv => (
              <Glass key={sv.id} style={s.servicioCard}>
                <View style={s.servicioInfo}>
                  <Text style={s.servicioNombre}>{sv.nombre}</Text>
                  <View style={s.servicioDuracionRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={s.servicioDuracion}>{sv.duracion_minutos} min</Text>
                  </View>
                </View>
                <Text style={s.servicioPrecio}>desde {sv.precio}€</Text>
                <Pressable onPress={() => eliminarServicio(sv.id)} haptic style={s.eliminarBtn}>
                  <Ionicons name="close" size={14} color={colors.red} />
                </Pressable>
              </Glass>
            ))}

            <Glass style={s.añadirCard}>
              <Text style={s.añadirTitulo}>Añadir servicio</Text>
              <View style={s.inputWrap}>
                <Ionicons name="construct-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Nombre del servicio" placeholderTextColor={colors.textFaint}
                  value={nuevoServicio} onChangeText={setNuevoServicio} />
              </View>
              <View style={s.dobleInput}>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Ionicons name="cash-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput style={s.input} placeholder="Precio €" placeholderTextColor={colors.textFaint}
                    value={nuevoPrecio} onChangeText={setNuevoPrecio} keyboardType="numeric" />
                </View>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput style={s.input} placeholder="Min" placeholderTextColor={colors.textFaint}
                    value={nuevaDuracion} onChangeText={setNuevaDuracion} keyboardType="numeric" />
                </View>
              </View>
              <Pressable haptic onPress={añadirServicio}>
                <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnAñadir}>
                  <Text style={s.btnAñadirText}>Añadir servicio</Text>
                </LinearGradient>
              </Pressable>
            </Glass>
          </>
        )}

        {tab === 'trabajos' && (
          <>
            <Text style={s.seccionTitulo}>Mis trabajos realizados</Text>
            <Text style={s.seccionSub}>Sube fotos para que los clientes vean la calidad de tu trabajo</Text>

            <Pressable haptic onPress={subirFoto} disabled={subiendoFoto}>
              <Glass style={s.subirFotoBtn}>
                {subiendoFoto ? (
                  <ActivityIndicator color={colors.accent2} style={{ marginBottom: spacing.sm }} />
                ) : (
                  <View style={s.subirFotoIconWrap}>
                    <Ionicons name="camera" size={22} color={colors.accent2} />
                  </View>
                )}
                <Text style={s.subirFotoText}>{subiendoFoto ? 'Subiendo...' : 'Subir foto de trabajo'}</Text>
                <Text style={s.subirFotoSub}>Toca para seleccionar de tu galería</Text>
              </Glass>
            </Pressable>

            {fotosTrabajos.length === 0 ? (
              <View style={s.fotosVacio}>
                <View style={s.vacioIconWrap}>
                  <Ionicons name="images-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={s.fotosVacioText}>Aún no has subido fotos</Text>
                <Text style={s.fotosVacioSub}>Las fotos generan más confianza y más contratos</Text>
              </View>
            ) : (
              <View style={s.fotosGrid}>
                {fotosTrabajos.map(f => (
                  <Glass key={f.id} style={s.fotoCard}>
                    <Image source={{ uri: f.uri }} style={s.fotoImagen} />
                    <TextInput
                      style={s.fotoDescInput}
                      value={f.desc}
                      onChangeText={t => setFotosTrabajos(prev => prev.map(foto => foto.id === f.id ? { ...foto, desc: t } : foto))}
                      placeholder="Descripción..."
                      placeholderTextColor={colors.textFaint}
                    />
                    <Pressable style={s.fotoEliminar} haptic onPress={() => eliminarFoto(f.id)}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </Glass>
                ))}
              </View>
            )}
          </>
        )}

        {tab === 'resenas' && (
          <>
            <Text style={s.seccionTitulo}>Reseñas de tus clientes</Text>
            <Text style={s.seccionSub}>Solo se muestran reseñas reales de servicios ya pagados</Text>

            {resenas.length === 0 ? (
              <View style={s.fotosVacio}>
                <View style={s.vacioIconWrap}>
                  <Ionicons name="star-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={s.fotosVacioText}>Aún no tienes reseñas</Text>
                <Text style={s.fotosVacioSub}>Aparecerán aquí cuando un cliente reseñe un servicio</Text>
              </View>
            ) : (
              resenas.map((r, i) => {
                const media = (r.puntualidad + r.calidad + r.precio_justo + r.trato) / 4;
                return (
                  <FadeInUp key={r.id} index={i}>
                    <Glass style={s.resenaCard}>
                      <View style={s.resenaTop}>
                        <View style={s.estrellasRow}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Ionicons key={i} name={i <= Math.round(media) ? 'star' : 'star-outline'} size={14} color={colors.amber} />
                          ))}
                        </View>
                        <Text style={s.resenaFecha}>{new Date(r.creado_en).toLocaleDateString('es-ES')}</Text>
                      </View>
                      {r.comentario ? <Text style={s.resenaComentario}>"{r.comentario}"</Text> : null}
                      <View style={s.resenaDetalle}>
                        <Text style={s.resenaDetalleItem}>Puntualidad {r.puntualidad}</Text>
                        <Text style={s.resenaDetalleItem}>Calidad {r.calidad}</Text>
                        <Text style={s.resenaDetalleItem}>Precio {r.precio_justo}</Text>
                        <Text style={s.resenaDetalleItem}>Trato {r.trato}</Text>
                      </View>
                    </Glass>
                  </FadeInUp>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, paddingTop: 50 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '700' },
  guardarBtnWrap: { padding: 4 },
  guardarBtn: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  guardarBtnOk: { color: colors.green },
  tabsScroll: { maxHeight: 60 },
  tabs: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.bgCard, gap: 6 },
  tabActivo: { backgroundColor: colors.blueLight },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActivo: { color: colors.blue, fontWeight: '700' },
  contenido: { flex: 1 },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.md },
  avatarGrande: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadow.glow(colors.blue) },
  avatarGrandeText: { color: '#fff', fontWeight: 'bold', fontSize: 38 },
  fotoBtn: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgCard, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, ...shadow.sm },
  fotoBtnText: { color: colors.blue, fontSize: 13, fontWeight: '500' },
  nombreGrande: { color: colors.text, ...type.h1, textAlign: 'center', marginBottom: spacing.sm },
  verificadoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginBottom: spacing.xl },
  verificado: { color: colors.green, fontSize: 13 },
  noVerificado: { color: colors.amber, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 6, ...shadow.sm },
  statNum: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 6, marginTop: spacing.sm },
  seccionSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...shadow.sm },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.text, paddingVertical: spacing.md, fontSize: 14 },
  textArea: { backgroundColor: colors.bgCard, color: colors.text, borderRadius: radius.md, padding: spacing.lg, fontSize: 14, minHeight: 120, textAlignVertical: 'top', marginBottom: spacing.lg, ...shadow.sm },
  docCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  docInfo: { flex: 1 },
  docLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  docPillOk: { alignSelf: 'flex-start', backgroundColor: colors.greenLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.green },
  docPillMal: { alignSelf: 'flex-start', backgroundColor: colors.redLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.red },
  docPillPendiente: { alignSelf: 'flex-start', backgroundColor: colors.bgCard2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.amber },
  docPillVacio: { alignSelf: 'flex-start', backgroundColor: colors.bgCard2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border2 },
  docPillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blueLight, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  docBtnText: { color: colors.blue, fontSize: 12.5, fontWeight: '700' },
  linkTerminos: { alignItems: 'center', paddingVertical: spacing.lg },
  linkTerminosText: { color: colors.textFaint, fontSize: 12.5, textDecorationLine: 'underline' },
  diaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  diaCardInactivo: { opacity: 0.5 },
  diaNombre: { color: colors.text, fontWeight: '500', fontSize: 14, flex: 1 },
  diaInactivo: { color: colors.textFaint },
  horasRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horaBtn: { backgroundColor: colors.bgCard2, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  horaBtnText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  horaSelectorWrap: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm, ...shadow.md },
  horaSelectorTitulo: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: spacing.md },
  horaScroll: { marginBottom: spacing.md },
  horaPill: { backgroundColor: colors.bgCard2, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  horaPillActiva: { backgroundColor: colors.blue },
  horaPillText: { color: colors.textMuted, fontSize: 13 },
  horaPillTextActiva: { color: '#fff', fontWeight: '600' },
  cerrarSelector: { alignItems: 'center', paddingTop: spacing.sm },
  cerrarSelectorText: { color: colors.textMuted, fontSize: 13 },
  servicioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  servicioInfo: { flex: 1 },
  servicioNombre: { color: colors.text, fontWeight: '500', fontSize: 14 },
  servicioDuracionRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  servicioDuracion: { color: colors.textMuted, fontSize: 11 },
  servicioPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 14 },
  eliminarBtn: { backgroundColor: colors.redLight, borderRadius: radius.sm, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  añadirCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm, ...shadow.sm },
  añadirTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: spacing.lg },
  dobleInput: { flexDirection: 'row', gap: spacing.md },
  btnAñadir: { backgroundColor: colors.blue, borderRadius: radius.md, padding: 13, alignItems: 'center', marginTop: 4, ...shadow.glow(colors.blue) },
  btnAñadirText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subirFotoBtn: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, ...shadow.sm },
  subirFotoIconWrap: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.blueLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  subirFotoText: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 4 },
  subirFotoSub: { color: colors.textMuted, fontSize: 12 },
  fotosVacio: { alignItems: 'center', paddingVertical: 40 },
  vacioIconWrap: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadow.sm },
  fotosVacioText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  fotosVacioSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fotoCard: { width: '47%', backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  fotoImagen: { width: '100%', height: 120 },
  fotoDescInput: { color: colors.textMuted, fontSize: 12, padding: spacing.sm, borderTopWidth: 0.5, borderTopColor: colors.border },
  fotoEliminar: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  avatarGrandeImagen: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.md },
  resenaCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  resenaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  estrellasRow: { flexDirection: 'row', gap: 1 },
  resenaFecha: { color: colors.textFaint, fontSize: 11 },
  resenaComentario: { color: colors.text, fontSize: 14, fontStyle: 'italic', marginBottom: spacing.sm },
  resenaDetalle: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  resenaDetalleItem: { color: colors.textMuted, fontSize: 12 },
});
