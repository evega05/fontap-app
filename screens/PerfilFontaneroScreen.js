import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Image, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, type, shadow } from '../theme';
import { avisar } from '../confirmar';
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

const RADIO_ANILLO_DOC = 24;
const CIRCUNFERENCIA_ANILLO_DOC = 2 * Math.PI * RADIO_ANILLO_DOC;

export default function PerfilFontaneroScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const nombre = route.params?.nombre || usuario?.nombre || 'Fontanero';
  const userId = route.params?.userId || usuario?.id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [tab, setTab] = useState('perfil');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoPerfil, setSubiendoFotoPerfil] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [stats, setStats] = useState(null);
  const [verificado, setVerificado] = useState(false);
  const [certificadoPro, setCertificadoPro] = useState(false);
  const [codigoReferido, setCodigoReferido] = useState('');
  const [trabajosGratis, setTrabajosGratis] = useState(0);
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
  const [mostrarDetallado, setMostrarDetallado] = useState(false);
  const [disponible, setDisponible] = useState(true);
  const [actualizandoDisponible, setActualizandoDisponible] = useState(false);
  const [vacacionesDesde, setVacacionesDesde] = useState(null);
  const [vacacionesHasta, setVacacionesHasta] = useState(null);
  const [mostrarVacaciones, setMostrarVacaciones] = useState(false);
  const [guardandoVacaciones, setGuardandoVacaciones] = useState(false);
  const [avisoAutomatico, setAvisoAutomatico] = useState(false);
  const [actualizandoAviso, setActualizandoAviso] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/perfil`, { headers });
      const p = res.data;
      setZona(p.zona || '');
      setDescripcion(p.descripcion || '');
      setVerificado(!!p.verificado);
      setCertificadoPro(!!p.certificado_pro);
      setCodigoReferido(p.codigo_referido || '');
      setTrabajosGratis(p.primeros_trabajos_gratis || 0);
      setDisponible(p.disponible !== false);
      setVacacionesDesde(p.vacaciones_desde || null);
      setVacacionesHasta(p.vacaciones_hasta || null);
      setAvisoAutomatico(!!p.aviso_automatico_activo);
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
    { tipo: 'dni', label: 'DNI / NIE', icon: 'card-outline' },
    { tipo: 'carnet_profesional', label: 'Carnet profesional', icon: 'ribbon-outline' },
    { tipo: 'seguro', label: 'Seguro RC', icon: 'shield-checkmark-outline' },
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
      avisar('Error', 'No se pudo subir el documento');
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
      avisar('Error', 'No se pudo subir la foto de perfil');
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
      avisar('Error', 'No se pudo subir la foto');
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

  const guardarDescFoto = async (id, desc) => {
    try {
      await axios.put(`${API}/fontaneros/${userId}/galeria/${id}`, { descripcion: desc }, { headers });
    } catch (e) {}
  };

  const toggleDisponibleAhora = async () => {
    const nuevoValor = !disponible;
    setDisponible(nuevoValor);
    setActualizandoDisponible(true);
    try {
      await axios.put(`${API}/fontaneros/${userId}/disponibilidad`, { disponible: nuevoValor }, { headers });
    } catch (e) {
      setDisponible(!nuevoValor);
      avisar('Error', 'No se pudo actualizar tu disponibilidad');
    } finally {
      setActualizandoDisponible(false);
    }
  };

  const activarVacaciones = async (dias) => {
    const desde = new Date();
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + dias);
    setGuardandoVacaciones(true);
    try {
      await axios.put(`${API}/fontaneros/${userId}/vacaciones`, { desde: desde.toISOString(), hasta: hasta.toISOString() }, { headers });
      setVacacionesDesde(desde.toISOString());
      setVacacionesHasta(hasta.toISOString());
      setDisponible(false);
      setMostrarVacaciones(false);
    } catch (e) {
      avisar('Error', 'No se pudo activar el modo vacaciones');
    } finally {
      setGuardandoVacaciones(false);
    }
  };

  const cancelarVacaciones = async () => {
    setGuardandoVacaciones(true);
    try {
      await axios.delete(`${API}/fontaneros/${userId}/vacaciones`, { headers });
      setVacacionesDesde(null);
      setVacacionesHasta(null);
      setDisponible(true);
    } catch (e) {
      avisar('Error', 'No se pudo cancelar el modo vacaciones');
    } finally {
      setGuardandoVacaciones(false);
    }
  };

  const vacacionesActivas = vacacionesHasta && new Date(vacacionesHasta) > new Date();

  const toggleAvisoAutomatico = async () => {
    const nuevoValor = !avisoAutomatico;
    setAvisoAutomatico(nuevoValor);
    setActualizandoAviso(true);
    try {
      await axios.put(`${API}/fontaneros/${userId}/perfil`, { aviso_automatico_activo: nuevoValor }, { headers });
    } catch (e) {
      setAvisoAutomatico(!nuevoValor);
      avisar('Error', 'No se pudo actualizar el aviso automático');
    } finally {
      setActualizandoAviso(false);
    }
  };

  // Lunes a viernes (índices 0-4) suelen compartir el mismo horario — si coinciden,
  // se editan juntos en la vista compacta en vez de repetir 5 filas idénticas.
  const lunVierIguales = [1, 2, 3, 4].every(i => horario[i].activo === horario[0].activo && horario[i].inicio === horario[0].inicio && horario[i].fin === horario[0].fin);

  const toggleLunVier = (valor) => {
    const nuevo = [...horario];
    for (let i = 0; i <= 4; i++) nuevo[i] = { ...nuevo[i], activo: valor };
    setHorario(nuevo);
  };

  const cambiarHoraLunVier = (tipo, hora) => {
    const nuevo = [...horario];
    for (let i = 0; i <= 4; i++) nuevo[i] = { ...nuevo[i], [tipo]: hora };
    setHorario(nuevo);
    setEditandoHora(null);
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
    const precioNum = parseFloat(nuevoPrecio);
    if (isNaN(precioNum) || precioNum <= 0) {
      avisar('Error', 'Introduce un precio válido');
      return;
    }
    try {
      const res = await axios.post(`${API}/fontaneros/${userId}/servicios`, {
        nombre: nuevoServicio,
        precio: precioNum,
        duracion_minutos: parseInt(nuevaDuracion) || 60,
      }, { headers });
      setServicios(prev => [...prev, res.data]);
      setNuevoServicio('');
      setNuevoPrecio('');
      setNuevaDuracion('60');
    } catch (e) {
      avisar('Error', 'No se pudo añadir el servicio');
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
      avisar('Error', 'No se pudo guardar el perfil');
    }
  };

  const masSolicitadoId = servicios.reduce((mejor, sv) => {
    if (!sv.veces_solicitado) return mejor;
    if (!mejor || sv.veces_solicitado > mejor.veces_solicitado) return sv;
    return mejor;
  }, null)?.id;

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

      <View style={s.dock}>
        {TABS.map(t => (
          <Pressable key={t.key} haptic onPress={() => setTab(t.key)} style={s.dockItem}>
            <View style={[s.dockIcon, tab === t.key && s.dockIconActivo]}>
              <Ionicons name={t.icon} size={17} color={tab === t.key ? '#fff' : colors.textMuted} />
            </View>
            <Text style={[s.dockLabel, tab === t.key && s.dockLabelActivo]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>

        {tab === 'perfil' && (
          <>
            <Glass style={s.heroCard}>
              <View style={s.heroTop}>
                <TouchableOpacity onPress={subirFotoPerfil} disabled={subiendoFotoPerfil} style={s.heroAvatarWrap}>
                  {subiendoFotoPerfil ? (
                    <View style={s.heroAvatar}><ActivityIndicator color="#fff" /></View>
                  ) : fotoPerfil ? (
                    <Image source={{ uri: fotoPerfil }} style={s.heroAvatarImagen} />
                  ) : (
                    <LinearGradient colors={[colors.accent, colors.accent2]} style={s.heroAvatar}>
                      <Text style={s.heroAvatarText}>{nombre[0]}</Text>
                    </LinearGradient>
                  )}
                  <View style={s.heroAvatarBadge}>
                    <Ionicons name="camera" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={s.heroNombre} numberOfLines={1}>{nombre}</Text>
                  <View style={s.badgesRow}>
                    <View style={[s.idBadge, verificado ? s.idBadgeVerde : s.idBadgeAmbar]}>
                      <Ionicons name={verificado ? 'checkmark-circle' : 'time-outline'} size={11} color={verificado ? colors.green : colors.amber} />
                      <Text style={[s.idBadgeText, { color: verificado ? colors.green : colors.amber }]}>
                        {verificado ? 'Verificado' : 'Pendiente'}
                      </Text>
                    </View>
                    {certificadoPro && (
                      <View style={[s.idBadge, s.idBadgeAmbar]}>
                        <Text style={[s.idBadgeText, { color: colors.amber }]}>🏅 Pro</Text>
                      </View>
                    )}
                    {!!zona && (
                      <View style={[s.idBadge, s.idBadgeNeutro]}>
                        <Ionicons name="location" size={11} color={colors.textMuted} />
                        <Text style={[s.idBadgeText, { color: colors.textMuted }]} numberOfLines={1}>{zona}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <View style={s.heroStatValueRow}>
                    <Text style={s.heroStatValue}>{stats?.valoracion_media ?? '—'}</Text>
                    <Ionicons name="star" size={12} color={colors.amber} />
                  </View>
                  <Text style={s.heroStatLabel}>Valoración</Text>
                </View>
                <View style={[s.heroStat, s.heroStatDivider]}>
                  <Text style={s.heroStatValue}>{stats?.trabajos_completados ?? 0}</Text>
                  <Text style={s.heroStatLabel}>Trabajos</Text>
                </View>
                <View style={[s.heroStat, s.heroStatDivider]}>
                  <Text style={[s.heroStatValue, { color: colors.green }]}>{stats?.ingresos_totales ?? 0}€</Text>
                  <Text style={s.heroStatLabel}>Ganado</Text>
                </View>
              </View>
            </Glass>

            <Text style={s.seccionTitulo}>Sobre mí</Text>
            <Glass style={s.bioCard}>
              <Text style={s.bioFieldLabel}>Zona de trabajo</Text>
              <View style={s.inputWrap}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Ej: Bilbao y alrededores"
                  placeholderTextColor={colors.textFaint} value={zona} onChangeText={setZona} />
              </View>
              <Text style={[s.bioFieldLabel, { marginTop: spacing.sm }]}>Lo que ven tus clientes</Text>
              <TextInput
                style={s.textArea}
                placeholder="Cuéntanos tu experiencia, especialidades..."
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={4}
                value={descripcion}
                onChangeText={setDescripcion}
              />
            </Glass>

            <View style={s.verifHeadRow}>
              <Text style={[s.seccionTitulo, { marginBottom: 0 }]}>Verificación de identidad</Text>
              <Text style={s.verifCount}>
                {DOCUMENTOS_TIPOS.filter(({ tipo }) => documentoDe(tipo)?.estado === 'verificado').length} de {DOCUMENTOS_TIPOS.length}
              </Text>
            </View>
            <View style={s.verifTrack}>
              {DOCUMENTOS_TIPOS.map(({ tipo, label, icon }) => {
                const doc = documentoDe(tipo);
                const estado = doc?.estado || 'sin_subir';
                const completo = estado === 'verificado';
                const colorEstado = estado === 'verificado' ? colors.green : estado === 'rechazado' ? colors.red : estado === 'pendiente' ? colors.amber : colors.glassBorder;
                return (
                  <Pressable
                    key={tipo}
                    haptic
                    style={s.verifItem}
                    onPress={() => subirDocumento(tipo)}
                    disabled={subiendoDoc === tipo}
                  >
                    <View style={s.verifRingWrap}>
                      <Svg width={52} height={52} style={{ transform: [{ rotate: '-90deg' }] }}>
                        <Circle cx={26} cy={26} r={RADIO_ANILLO_DOC} stroke={colors.glassBorder} strokeWidth={3} fill="none" />
                        <Circle
                          cx={26} cy={26} r={RADIO_ANILLO_DOC} stroke={colorEstado} strokeWidth={3} fill="none"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUNFERENCIA_ANILLO_DOC}
                          strokeDashoffset={completo ? 0 : CIRCUNFERENCIA_ANILLO_DOC}
                        />
                      </Svg>
                      <View style={s.verifIconWrap}>
                        {subiendoDoc === tipo ? (
                          <ActivityIndicator size={14} color={colors.text} />
                        ) : (
                          <Ionicons name={completo ? 'checkmark' : icon} size={17} color={completo ? colors.green : colors.textMuted} />
                        )}
                      </View>
                      {!completo && (
                        <View style={s.verifPlus}>
                          <Ionicons name="add" size={9} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={s.verifItemLabel} numberOfLines={2}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {(trabajosGratis > 0 || !!codigoReferido) && (
              <>
                <Text style={s.seccionTitulo}>Recompensas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xl }} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
                  {trabajosGratis > 0 && (
                    <Glass style={s.rewardCard}>
                      <View style={[s.rewardIcon, s.idBadgeAmbar]}>
                        <Ionicons name="gift" size={15} color={colors.amber} />
                      </View>
                      <Text style={s.rewardTitulo}>Te quedan {trabajosGratis} trabajo{trabajosGratis > 1 ? 's' : ''} sin comisión</Text>
                      <Text style={s.rewardSub}>Los primeros trabajos que cobres no le pagan comisión a la plataforma.</Text>
                    </Glass>
                  )}
                  {!!codigoReferido && (
                    <Glass style={s.rewardCard}>
                      <View style={[s.rewardIcon, { backgroundColor: colors.blueLight }]}>
                        <Ionicons name="people" size={15} color={colors.accent2} />
                      </View>
                      <Text style={s.rewardTitulo}>Invita a un colega</Text>
                      <Text style={s.rewardSub}>Comisión reducida (2,5%) por 90 días cuando se registre con tu código.</Text>
                      <View style={s.codeChip}>
                        <Text style={s.codeChipText}>{codigoReferido}</Text>
                        <Pressable
                          haptic
                          style={s.codeChipBtn}
                          onPress={() => Share.share({ message: `Únete a Multiservicios Provenza como profesional usando mi código ${codigoReferido} y los dos salimos ganando.` })}
                        >
                          <Ionicons name="share-social-outline" size={12} color={colors.text} />
                          <Text style={s.codeChipBtnText}>Compartir</Text>
                        </Pressable>
                      </View>
                    </Glass>
                  )}
                </ScrollView>
              </>
            )}

            <Text style={s.seccionTitulo}>Tu negocio</Text>
            <Pressable haptic onPress={() => navigation.navigate('Equipo')}>
              <Glass style={s.adminCard}>
                <LinearGradient colors={[colors.accent, colors.accent2]} style={s.adminIconWrap}>
                  <Ionicons name="business" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.adminTitulo}>Administración</Text>
                  <Text style={s.adminSub}>Registra tu empresa, gestiona tu equipo y tu panel de gestión</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Glass>
            </Pressable>

            <Text style={s.seccionTitulo}>Cuenta</Text>
            <Glass style={s.cuentaCard}>
              <Pressable style={s.cuentaRow} haptic onPress={() => navigation.navigate('PerfilFontaneroPublico', { fontanero: { usuario_id: userId, nombre } })}>
                <View style={s.cuentaRowIcon}><Ionicons name="eye-outline" size={14} color={colors.textMuted} /></View>
                <Text style={s.cuentaRowText}>Vista previa de tu perfil público</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </Pressable>
              <Pressable style={[s.cuentaRow, s.cuentaRowDivider]} haptic onPress={() => navigation.navigate('AjustesCuenta')}>
                <View style={s.cuentaRowIcon}><Ionicons name="settings-outline" size={14} color={colors.textMuted} /></View>
                <Text style={s.cuentaRowText}>Ajustes de cuenta</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </Pressable>
              <Pressable style={[s.cuentaRow, s.cuentaRowDivider]} haptic onPress={() => navigation.navigate('Terminos')}>
                <View style={s.cuentaRowIcon}><Ionicons name="document-text-outline" size={14} color={colors.textMuted} /></View>
                <Text style={s.cuentaRowText}>Términos y condiciones</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </Pressable>
            </Glass>
          </>
        )}

        {tab === 'horario' && (
          <>
            <View style={s.quickRow}>
              <Glass style={s.quickChip}>
                <View style={s.quickChipTop}>
                  <View style={[s.quickChipIcon, s.idBadgeVerde]}>
                    <Ionicons name="pause" size={13} color={colors.green} />
                  </View>
                  <Switch value={!disponible} onValueChange={toggleDisponibleAhora} disabled={actualizandoDisponible}
                    trackColor={{ false: colors.bgCard3, true: colors.red }} thumbColor={!disponible ? '#fff' : colors.textFaint} />
                </View>
                <Text style={s.quickChipTitulo}>No disponible ahora</Text>
                <Text style={s.quickChipSub}>Pausa sin tocar tu horario semanal</Text>
              </Glass>
              <Pressable haptic onPress={() => setMostrarVacaciones(v => !v)} style={{ flex: 1 }}>
                <Glass style={s.quickChip}>
                  <View style={s.quickChipTop}>
                    <View style={[s.quickChipIcon, s.idBadgeAmbar]}>
                      <Ionicons name="airplane" size={13} color={colors.amber} />
                    </View>
                    <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
                  </View>
                  <Text style={s.quickChipTitulo}>Modo vacaciones</Text>
                  <Text style={s.quickChipSub}>
                    {vacacionesActivas
                      ? `Hasta el ${new Date(vacacionesHasta).toLocaleDateString('es-ES')}`
                      : 'Bloquea un rango de fechas'}
                  </Text>
                </Glass>
              </Pressable>
            </View>

            {mostrarVacaciones && (
              <Glass style={s.vacacionesPanel}>
                {vacacionesActivas ? (
                  <>
                    <Text style={s.vacacionesTexto}>
                      Vacaciones activas hasta el {new Date(vacacionesHasta).toLocaleDateString('es-ES')}
                    </Text>
                    <TouchableOpacity style={s.btnCancelarVacaciones} onPress={cancelarVacaciones} disabled={guardandoVacaciones}>
                      <Text style={s.btnCancelarVacacionesText}>{guardandoVacaciones ? '...' : 'Cancelar vacaciones'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={s.vacacionesTexto}>Sin fechas bloqueadas todavía</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity style={s.btnVacacionesPreset} onPress={() => activarVacaciones(7)} disabled={guardandoVacaciones}>
                        <Text style={s.btnVacacionesPresetText}>1 semana</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnVacacionesPreset} onPress={() => activarVacaciones(14)} disabled={guardandoVacaciones}>
                        <Text style={s.btnVacacionesPresetText}>2 semanas</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Glass>
            )}

            <Glass style={s.avisoAutoCard}>
              <View style={s.avisoAutoLeft}>
                <View style={[s.quickChipIcon, s.idBadgeNeutro, { backgroundColor: colors.glass }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.quickChipTitulo}>Avisar fuera de horario</Text>
                  <Text style={s.avisoAutoSub}>
                    Si te escriben mientras estás pausado o de vacaciones, se responde solo una vez por chat
                  </Text>
                </View>
              </View>
              <Switch value={avisoAutomatico} onValueChange={toggleAvisoAutomatico} disabled={actualizandoAviso}
                trackColor={{ false: colors.bgCard3, true: colors.accent }} thumbColor={avisoAutomatico ? '#fff' : colors.textFaint} />
            </Glass>

            <View style={s.horarioHeadRow}>
              <View>
                <Text style={[s.seccionTitulo, { marginTop: 0 }]}>Días y horas de trabajo</Text>
                <Text style={[s.seccionSub, { marginBottom: 0 }]}>Toca las horas para editarlas</Text>
              </View>
              <View style={s.modeSwitchWrap}>
                <Text style={s.modeSwitchLabel}>{mostrarDetallado ? 'Detallado' : 'Compacto'}</Text>
                <Switch value={mostrarDetallado} onValueChange={setMostrarDetallado}
                  trackColor={{ false: colors.bgCard3, true: colors.accent }} thumbColor={mostrarDetallado ? '#fff' : colors.textFaint} />
              </View>
            </View>

            {!mostrarDetallado ? (
              <>
                <View style={[s.diaCard, { marginTop: spacing.md }]}>
                  <Switch value={horario[0].activo} onValueChange={toggleLunVier}
                    trackColor={{ false: colors.bgCard3, true: colors.blueLight }}
                    thumbColor={horario[0].activo ? colors.blue : colors.textFaint} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.diaNombre, !horario[0].activo && s.diaInactivo]}>Lunes a viernes</Text>
                    <Text style={s.diaSubetiqueta}>{lunVierIguales ? 'Mismo horario los 5 días' : 'Horarios distintos — mirá el detalle'}</Text>
                  </View>
                  {horario[0].activo && lunVierIguales && (
                    <View style={s.horasRow}>
                      <TouchableOpacity style={s.horaBtn} onPress={() => setEditandoHora({ dia: 'lunvier', tipo: 'inicio' })}>
                        <Text style={s.horaBtnText}>{horario[0].inicio}</Text>
                      </TouchableOpacity>
                      <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                      <TouchableOpacity style={s.horaBtn} onPress={() => setEditandoHora({ dia: 'lunvier', tipo: 'fin' })}>
                        <Text style={s.horaBtnText}>{horario[0].fin}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={s.weekendRow}>
                  {[5, 6].map(i => (
                    <View key={i} style={s.weekendChip}>
                      <Text style={[s.diaNombre, !horario[i].activo && s.diaInactivo]}>{DIAS[i]}</Text>
                      <Switch value={horario[i].activo} onValueChange={() => toggleDia(i)}
                        trackColor={{ false: colors.bgCard3, true: colors.blueLight }}
                        thumbColor={horario[i].activo ? colors.blue : colors.textFaint} />
                    </View>
                  ))}
                </View>
              </>
            ) : (
              horario.map((h, i) => (
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
              ))
            )}

            {editandoHora && (
              <View style={s.horaSelectorWrap}>
                <Text style={s.horaSelectorTitulo}>
                  Hora de {editandoHora.tipo === 'inicio' ? 'inicio' : 'fin'} — {editandoHora.dia === 'lunvier' ? 'Lunes a viernes' : DIAS[editandoHora.dia]}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.horaScroll}>
                  {HORAS.map(h => {
                    const valorActual = editandoHora.dia === 'lunvier' ? horario[0][editandoHora.tipo] : horario[editandoHora.dia][editandoHora.tipo];
                    return (
                      <TouchableOpacity key={h}
                        style={[s.horaPill, valorActual === h && s.horaPillActiva]}
                        onPress={() => editandoHora.dia === 'lunvier' ? cambiarHoraLunVier(editandoHora.tipo, h) : cambiarHora(editandoHora.dia, editandoHora.tipo, h)}>
                        <Text style={[s.horaPillText, valorActual === h && s.horaPillTextActiva]}>{h}</Text>
                      </TouchableOpacity>
                    );
                  })}
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
            <Text style={[s.seccionTitulo, { marginTop: 0 }]}>Mis servicios y precios base</Text>
            <Text style={s.seccionSub}>El cliente verá estos precios antes de contratarte</Text>

            {servicios.length === 0 ? (
              <Glass style={s.servicioVacio}>
                <View style={s.servicioVacioIcon}>
                  <Ionicons name="construct-outline" size={18} color={colors.textFaint} />
                </View>
                <Text style={s.servicioVacioTexto}>Aún no has añadido servicios propios</Text>
              </Glass>
            ) : (
              servicios.map(sv => (
                <Glass key={sv.id} style={s.servicioCard}>
                  <View style={s.servicioIconWrap}>
                    <Ionicons name="construct" size={16} color={colors.accent2} />
                  </View>
                  <View style={s.servicioInfo}>
                    <Text style={s.servicioNombre}>{sv.nombre}</Text>
                    <View style={s.servicioDuracionRow}>
                      <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                      <Text style={s.servicioDuracion}>{sv.duracion_minutos} min</Text>
                    </View>
                    {sv.id === masSolicitadoId && (
                      <View style={s.masSolicitadoBadge}>
                        <Ionicons name="trophy" size={9} color={colors.amber} />
                        <Text style={s.masSolicitadoText}>Más solicitado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.servicioPrecio}>{sv.precio}€</Text>
                  <Pressable onPress={() => eliminarServicio(sv.id)} haptic style={s.eliminarBtn}>
                    <Ionicons name="close" size={14} color={colors.red} />
                  </Pressable>
                </Glass>
              ))
            )}

            <Glass style={s.añadirCard}>
              <Text style={s.añadirTitulo}>Añadir servicio</Text>
              <View style={s.inputWrap}>
                <Ionicons name="construct-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Nombre del servicio" placeholderTextColor={colors.textFaint}
                  value={nuevoServicio} onChangeText={setNuevoServicio} />
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="cash-outline" size={16} color={colors.textMuted} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Precio €" placeholderTextColor={colors.textFaint}
                  value={nuevoPrecio} onChangeText={setNuevoPrecio} keyboardType="numeric" />
              </View>
              <Text style={s.duracionLabel}>Duración estimada</Text>
              <View style={s.duracionRow}>
                {['30', '60', '90', '120'].map(min => (
                  <Pressable key={min} haptic onPress={() => setNuevaDuracion(min)} style={[s.duracionChip, nuevaDuracion === min && s.duracionChipActivo]}>
                    <Text style={[s.duracionChipText, nuevaDuracion === min && s.duracionChipTextActivo]}>{min} min</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable haptic onPress={añadirServicio} disabled={!nuevoServicio || !nuevoPrecio} style={s.btnAñadirWrap}>
                <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnAñadir}>
                  <Text style={s.btnAñadirText}>Añadir servicio</Text>
                  <Ionicons name="add" size={15} color={colors.text} />
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
                      onBlur={() => guardarDescFoto(f.id, f.desc)}
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
  dock: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  dockItem: { alignItems: 'center', gap: 5, width: 58 },
  dockIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  dockIconActivo: { backgroundColor: colors.accent },
  dockLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '700' },
  dockLabelActivo: { color: colors.text },
  contenido: { flex: 1 },

  heroCard: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, ...shadow.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  heroAvatarWrap: { position: 'relative' },
  heroAvatar: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  heroAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 21 },
  heroAvatarImagen: { width: 56, height: 56, borderRadius: radius.md },
  heroAvatarBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.bgCard2, borderWidth: 2.5, borderColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  heroNombre: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  idBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  idBadgeVerde: { backgroundColor: colors.greenGlass },
  idBadgeAmbar: { backgroundColor: colors.amberGlass },
  idBadgeNeutro: { backgroundColor: colors.glass, maxWidth: 130 },
  idBadgeText: { fontSize: 10, fontWeight: '800' },
  heroStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.glassBorder },
  heroStat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  heroStatDivider: { borderLeftWidth: 1, borderLeftColor: colors.glassBorder },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroStatValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  heroStatLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '600', marginTop: 2 },

  bioCard: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm },
  bioFieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 10, marginTop: spacing.lg },
  seccionSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.text, paddingVertical: spacing.md, fontSize: 14 },
  textArea: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: radius.md, padding: spacing.lg, fontSize: 13.5, minHeight: 80, textAlignVertical: 'top' },

  verifHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  verifCount: { color: colors.textFaint, fontSize: 11, fontWeight: '700', backgroundColor: colors.bgCard2, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  verifTrack: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  verifItem: { alignItems: 'center', gap: spacing.sm, width: 84 },
  verifRingWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  verifIconWrap: { position: 'absolute', width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  verifPlus: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: radius.full, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  verifItemLabel: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700', textAlign: 'center', lineHeight: 13 },

  rewardCard: { width: 240, padding: spacing.md, borderRadius: radius.lg },
  rewardIcon: { width: 32, height: 32, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  rewardTitulo: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 3 },
  rewardSub: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  codeChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: spacing.sm, backgroundColor: colors.bgCard2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, borderStyle: 'dashed', paddingHorizontal: 10, paddingVertical: 8 },
  codeChipText: { color: colors.text, fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 },
  codeChipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.glass, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  codeChipBtnText: { color: colors.text, fontSize: 10.5, fontWeight: '700' },

  adminCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
  adminIconWrap: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  cuentaCard: { borderRadius: radius.lg, overflow: 'hidden' },
  cuentaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  cuentaRowDivider: { borderTopWidth: 1, borderTopColor: colors.glassBorder },
  cuentaRowIcon: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  cuentaRowText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  adminTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  adminSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  quickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  quickChip: { flex: 1, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  quickChipTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickChipIcon: { width: 26, height: 26, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  quickChipTitulo: { color: colors.text, fontWeight: '800', fontSize: 12.5 },
  quickChipSub: { color: colors.textMuted, fontSize: 10.5, lineHeight: 14 },
  vacacionesPanel: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, gap: spacing.sm },
  vacacionesTexto: { color: colors.textMuted, fontSize: 12.5 },
  btnVacacionesPreset: { backgroundColor: colors.bgCard2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2 },
  btnVacacionesPresetText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  btnCancelarVacaciones: { alignSelf: 'flex-start' },
  btnCancelarVacacionesText: { color: colors.red, fontSize: 12.5, fontWeight: '700' },
  avisoAutoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  avisoAutoLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avisoAutoSub: { color: colors.textMuted, fontSize: 10.5, lineHeight: 14, marginTop: 1 },
  horarioHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  modeSwitchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeSwitchLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  diaSubetiqueta: { color: colors.textFaint, fontSize: 11, marginTop: 1 },
  weekendRow: { flexDirection: 'row', gap: spacing.md },
  weekendChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
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
  servicioVacio: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm },
  servicioVacioIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  servicioVacioTexto: { color: colors.textMuted, fontSize: 13, flex: 1 },
  servicioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  servicioIconWrap: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.blueLight, justifyContent: 'center', alignItems: 'center' },
  servicioInfo: { flex: 1 },
  servicioNombre: { color: colors.text, fontWeight: '500', fontSize: 14 },
  servicioDuracionRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  servicioDuracion: { color: colors.textMuted, fontSize: 11 },
  masSolicitadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.amberGlass, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  masSolicitadoText: { color: colors.amber, fontSize: 9.5, fontWeight: '800' },
  servicioPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 14 },
  eliminarBtn: { backgroundColor: colors.redLight, borderRadius: radius.sm, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  añadirCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm, ...shadow.sm },
  añadirTitulo: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: spacing.lg },
  duracionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
  duracionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  duracionChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2 },
  duracionChipActivo: { backgroundColor: colors.blue, borderColor: colors.blue },
  duracionChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  duracionChipTextActivo: { color: '#fff' },
  btnAñadirWrap: { alignSelf: 'flex-end' },
  btnAñadir: { flexDirection: 'row', gap: 6, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', ...shadow.glow(colors.blue) },
  btnAñadirText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
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
  resenaCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  resenaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  estrellasRow: { flexDirection: 'row', gap: 1 },
  resenaFecha: { color: colors.textFaint, fontSize: 11 },
  resenaComentario: { color: colors.text, fontSize: 14, fontStyle: 'italic', marginBottom: spacing.sm },
  resenaDetalle: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  resenaDetalleItem: { color: colors.textMuted, fontSize: 12 },
});
