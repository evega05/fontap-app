import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, type, shadow } from '../theme';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';
import { GREMIOS, emojiDeServicio } from '../gremios';

const API = 'https://fontap-backend-production.up.railway.app';

function formatMiembroDesde(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function formatFechaResena(iso) {
  if (!iso) return '';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `Hace ${meses} mes${meses > 1 ? 'es' : ''}`;
  const años = Math.floor(meses / 12);
  return `Hace ${años} año${años > 1 ? 's' : ''}`;
}

export default function PerfilFontaneroPublicoScreen({ navigation, route }) {
  const { token, usuario } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const fontaneroBase = route.params?.fontanero || {};
  const usuarioId = fontaneroBase.usuario_id;

  const [perfil, setPerfil] = useState(fontaneroBase);
  const [stats, setStats] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [favorito, setFavorito] = useState(false);
  const [iniciandoChat, setIniciandoChat] = useState(false);

  const esCliente = usuario?.tipo === 'cliente';
  const clienteId = usuario?.id;

  const cargar = useCallback(async () => {
    if (!usuarioId) { setCargando(false); return; }
    try {
      const peticiones = [
        axios.get(`${API}/fontaneros/${usuarioId}/perfil`, { headers }),
        axios.get(`${API}/fontaneros/${usuarioId}/estadisticas`, { headers }),
        axios.get(`${API}/fontaneros/${usuarioId}/servicios`),
        axios.get(`${API}/fontaneros/${usuarioId}/galeria`),
        axios.get(`${API}/fontaneros/${usuarioId}/resenas`),
      ];
      if (esCliente && clienteId) {
        peticiones.push(axios.get(`${API}/clientes/${clienteId}/favoritos`, { headers }));
      }
      const [rPerfil, rStats, rServicios, rGaleria, rResenas, rFavoritos] = await Promise.allSettled(peticiones);
      if (rPerfil.status === 'fulfilled') setPerfil(prev => ({ ...prev, ...rPerfil.value.data }));
      if (rStats.status === 'fulfilled') setStats(rStats.value.data);
      if (rServicios.status === 'fulfilled') setServicios(rServicios.value.data || []);
      if (rGaleria.status === 'fulfilled') setGaleria(rGaleria.value.data || []);
      if (rResenas.status === 'fulfilled') setResenas(rResenas.value.data || []);
      if (rFavoritos?.status === 'fulfilled') {
        setFavorito((rFavoritos.value.data || []).some(f => f.id === perfil.id));
      }
    } catch (e) {}
    finally { setCargando(false); }
  }, [usuarioId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const contratar = () => {
    navigation.navigate('Solicitud', { fontanero: perfil, clienteId });
  };

  const iniciarChat = async () => {
    if (iniciandoChat || !clienteId) return;
    setIniciandoChat(true);
    try {
      const res = await axios.post(
        `${API}/servicios`,
        { tipo: 'Consulta', urgente: false, fontanero_id: perfil.id, es_consulta: true },
        { params: { cliente_id: clienteId }, headers }
      );
      navigation.navigate('Chat', { servicioId: res.data.id, otroNombre: perfil.nombre });
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo iniciar la conversación'));
    } finally {
      setIniciandoChat(false);
    }
  };

  const toggleFavorito = async () => {
    if (!clienteId) return;
    const nuevoValor = !favorito;
    setFavorito(nuevoValor);
    try {
      if (nuevoValor) {
        await axios.post(`${API}/clientes/${clienteId}/favoritos/${perfil.id}`, null, { headers });
      } else {
        await axios.delete(`${API}/clientes/${clienteId}/favoritos/${perfil.id}`, { headers });
      }
    } catch (e) {
      setFavorito(!nuevoValor);
    }
  };

  const [bioExpandida, setBioExpandida] = useState(false);

  const promedios = { puntualidad: 0, calidad: 0, precio_justo: 0, trato: 0, general: 0 };
  if (resenas.length > 0) {
    const suma = resenas.reduce((acc, r) => ({
      puntualidad: acc.puntualidad + (r.puntualidad || 0),
      calidad: acc.calidad + (r.calidad || 0),
      precio_justo: acc.precio_justo + (r.precio_justo || 0),
      trato: acc.trato + (r.trato || 0),
    }), { puntualidad: 0, calidad: 0, precio_justo: 0, trato: 0 });
    promedios.puntualidad = suma.puntualidad / resenas.length;
    promedios.calidad = suma.calidad / resenas.length;
    promedios.precio_justo = suma.precio_justo / resenas.length;
    promedios.trato = suma.trato / resenas.length;
    promedios.general = (promedios.puntualidad + promedios.calidad + promedios.precio_justo + promedios.trato) / 4;
  }
  const etiquetaValoracion = (n) => {
    if (n >= 4.5) return 'Excepcional';
    if (n >= 4) return 'Muy bueno';
    if (n >= 3) return 'Bueno';
    if (n >= 2) return 'Regular';
    return 'Bajo';
  };

  const noMostrarMas = () => {
    confirmarAccion(
      '¿Dejar de ver a este profesional?',
      'No volverás a verlo en el mapa ni recibirás avisos de sus ofertas. Puedes deshacerlo cuando quieras desde Ajustes de cuenta.',
      async () => {
        try {
          await axios.post(`${API}/clientes/${usuario.id}/lista-negra/${perfil.id}`, {}, { headers });
          avisar('Hecho', 'No volverás a ver a este profesional');
          navigation.goBack();
        } catch (e) {
          avisar('Error', 'No se pudo completar la acción');
        }
      },
      { textoConfirmar: 'Dejar de ver' }
    );
  };

  if (cargando) {
    return (
      <View style={s.centro}>
        <GradientBg />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const gremioInfo = GREMIOS.find(g => g.valor === perfil.gremio);
  const miembroDesde = formatMiembroDesde(perfil.miembro_desde);
  const chips = [
    perfil.verificado && { icon: 'checkmark-circle', texto: 'Identidad verificada', color: colors.green },
    perfil.certificado_pro && { icon: 'ribbon', texto: 'Certificado Provenza Pro', color: colors.amber },
    perfil.disponible24h && { icon: 'moon', texto: 'Disponible 24h', color: colors.purple },
    miembroDesde && { icon: 'calendar', texto: `Desde ${miembroDesde}`, color: colors.accent },
  ].filter(Boolean);

  return (
    <View style={s.container}>
      <GradientBg />

      <View style={s.headerFlotante}>
        <Pressable haptic onPress={() => navigation.goBack()}>
          <Glass style={s.headerBtn}><Ionicons name="chevron-back" size={20} color={colors.text} /></Glass>
        </Pressable>
        {esCliente && (
          <Pressable haptic onPress={toggleFavorito}>
            <Glass style={s.headerBtn} colorTint={favorito ? colors.redGlass : undefined}>
              <Ionicons name={favorito ? 'heart' : 'heart-outline'} size={19} color={favorito ? colors.red : colors.text} />
            </Glass>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 100, paddingHorizontal: spacing.lg, paddingBottom: 140 }}>
        <FadeInUp>
          <View style={s.hero}>
            <View style={s.avatarRing}>
              <LinearGradient colors={[colors.accent, colors.accent2]} style={s.avatarGradiente}>
                {perfil.foto_url ? (
                  <Image source={{ uri: `${API}${perfil.foto_url}` }} style={s.avatarImagen} />
                ) : (
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarText}>{(perfil.nombre || '?')[0]}</Text>
                  </View>
                )}
              </LinearGradient>
              {perfil.verificado && (
                <View style={s.verificadoBadge}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
              )}
            </View>

            <Text style={s.nombre}>{perfil.nombre}</Text>

            <View style={s.gremioRow}>
              {gremioInfo && <Text style={s.gremioEmoji}>{gremioInfo.emoji}</Text>}
              <Text style={s.gremioTexto}>
                {perfil.gremio ? perfil.gremio.charAt(0).toUpperCase() + perfil.gremio.slice(1) : 'Profesional'}
              </Text>
              <Text style={s.puntoSeparador}>·</Text>
              <Ionicons name="location" size={12} color={colors.textMuted} />
              <Text style={s.gremioTexto}>{perfil.zona || 'Bilbao'}{perfil.distancia ? ` · ${perfil.distancia}` : ''}</Text>
            </View>

            <View style={s.ratingRow}>
              <Ionicons name="star" size={16} color={colors.amber} />
              <Text style={s.ratingNum}>{(stats?.valoracion_media ?? perfil.valoracion) || '—'}</Text>
              <Text style={s.ratingSub}>({resenas.length} reseña{resenas.length !== 1 ? 's' : ''})</Text>
            </View>
          </View>
        </FadeInUp>

        {chips.length > 0 && (
          <FadeInUp index={1}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsFila}>
              {chips.map((c, i) => (
                <Glass key={i} style={s.chip} colorTint={`${c.color}22`}>
                  <Ionicons name={c.icon} size={13} color={c.color} />
                  <Text style={[s.chipTexto, { color: c.color }]}>{c.texto}</Text>
                </Glass>
              ))}
            </ScrollView>
          </FadeInUp>
        )}

        {perfil.descripcion ? (
          <FadeInUp index={2}>
            <Glass style={s.bioCard}>
              <Text style={s.descripcion} numberOfLines={bioExpandida ? undefined : 3}>{perfil.descripcion}</Text>
              {perfil.descripcion.length > 100 && (
                <TouchableOpacity onPress={() => setBioExpandida(v => !v)}>
                  <Text style={s.verMas}>{bioExpandida ? 'Ver menos' : '+ Ver más'}</Text>
                </TouchableOpacity>
              )}
            </Glass>
          </FadeInUp>
        ) : null}

        <FadeInUp index={3}>
          <View style={s.statsRow}>
            <Glass style={s.statCard}>
              <Text style={s.statNum}>{stats?.valoracion_media ?? perfil.valoracion ?? '—'}</Text>
              <Text style={s.statLabel}>⭐ Valoración</Text>
            </Glass>
            <Glass style={s.statCard}>
              <Text style={s.statNum}>{stats?.trabajos_completados ?? 0}</Text>
              <Text style={s.statLabel}>✅ Trabajos</Text>
            </Glass>
            <Glass style={s.statCard}>
              <Text style={s.statNum}>{stats?.tasa_aceptacion ?? 0}%</Text>
              <Text style={s.statLabel}>📈 Aceptación</Text>
            </Glass>
          </View>
        </FadeInUp>

        <Text style={s.seccionTitulo}>Servicios y tarifas aproximadas</Text>
        {servicios.length === 0 ? (
          <Text style={s.seccionVacia}>Este profesional aún no publicó precios de servicios.</Text>
        ) : (
          <View style={s.serviciosGrid}>
            {servicios.map((sv, i) => (
              <FadeInUp key={sv.id} index={i} style={s.servicioCardWrap}>
                <Glass style={s.servicioCard}>
                  <Text style={s.servicioEmoji}>{emojiDeServicio(sv.nombre)}</Text>
                  <Text style={s.servicioNombre} numberOfLines={2}>{sv.nombre}</Text>
                  <Text style={s.servicioPrecio}>desde {sv.precio}€</Text>
                </Glass>
              </FadeInUp>
            ))}
          </View>
        )}

        <Text style={s.seccionTitulo}>Trabajos realizados</Text>
        {galeria.length === 0 ? (
          <Text style={s.seccionVacia}>Aún no subió fotos de trabajos realizados.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {galeria.map(g => (
              <Image key={g.id} source={{ uri: `${API}${g.url}` }} style={s.fotoTrabajo} />
            ))}
          </ScrollView>
        )}

        <Text style={s.seccionTitulo}>Reseñas ({resenas.length})</Text>
        {resenas.length === 0 ? (
          <Text style={s.seccionVacia}>Aún no tiene reseñas.</Text>
        ) : (
          <Glass style={s.resumenResenas}>
            <View style={s.resumenCabecera}>
              <Text style={s.resumenNota}>{promedios.general.toFixed(1)}</Text>
              <View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons key={i} name={i <= Math.round(promedios.general) ? 'star' : 'star-outline'} size={13} color={colors.amber} />
                  ))}
                </View>
                <Text style={s.resumenEtiqueta}>{etiquetaValoracion(promedios.general)} · {resenas.length} valoraciones</Text>
              </View>
            </View>
            {[
              ['Puntualidad', promedios.puntualidad],
              ['Calidad', promedios.calidad],
              ['Precio justo', promedios.precio_justo],
              ['Trato', promedios.trato],
            ].map(([etiqueta, valor]) => (
              <View key={etiqueta} style={s.barraFila}>
                <Text style={s.barraEtiqueta}>{etiqueta}</Text>
                <View style={s.barraTrack}>
                  <View style={[s.barraRelleno, { width: `${Math.min(100, (valor / 5) * 100)}%` }]} />
                </View>
                <Text style={s.barraValor}>{valor.toFixed(1)}</Text>
              </View>
            ))}
          </Glass>
        )}
        {resenas.map((r, i) => {
          const media = (r.puntualidad + r.calidad + r.precio_justo + r.trato) / 4;
          return (
            <FadeInUp key={r.id} index={i}>
              <Glass style={s.resenaCard}>
                <View style={s.resenaCabecera}>
                  <View style={s.resenaAvatar}>
                    <Text style={s.resenaAvatarText}>{(r.cliente_nombre || '?')[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resenaNombre}>{r.cliente_nombre || 'Cliente'}</Text>
                    <View style={s.estrellasRow}>
                      {[1, 2, 3, 4, 5].map(i2 => (
                        <Ionicons key={i2} name={i2 <= Math.round(media) ? 'star' : 'star-outline'} size={12} color={colors.amber} />
                      ))}
                      <Text style={s.resenaFecha}>· {formatFechaResena(r.creado_en)}</Text>
                    </View>
                  </View>
                </View>
                {r.comentario ? <Text style={s.resenaComentario}>"{r.comentario}"</Text> : null}
              </Glass>
            </FadeInUp>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <Glass strong style={s.footerGlass}>
          <View style={s.footerRow}>
            {esCliente && (
              <Pressable haptic onPress={iniciarChat} disabled={iniciandoChat} style={s.btnMensaje}>
                {iniciandoChat ? <ActivityIndicator color={colors.text} size="small" /> : <Ionicons name="chatbubble-outline" size={19} color={colors.text} />}
              </Pressable>
            )}
            <Pressable haptic onPress={contratar} style={{ flex: 1 }}>
              <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnContratar}>
                <Text style={s.btnContratarText}>Contratar a {perfil.nombre?.split(' ')[0]}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text} />
              </LinearGradient>
            </Pressable>
          </View>
          {esCliente && (
            <TouchableOpacity style={s.btnNoMostrar} onPress={noMostrarMas}>
              <Text style={s.btnNoMostrarText}>No quiero ver más a este profesional</Text>
            </TouchableOpacity>
          )}
        </Glass>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centro: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  headerFlotante: { position: 'absolute', top: 50, left: spacing.lg, right: spacing.lg, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between' },
  headerBtn: { width: 40, height: 40, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },

  hero: { alignItems: 'center', marginBottom: spacing.lg },
  avatarRing: { marginBottom: spacing.md },
  avatarGradiente: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', padding: 3, ...shadow.glow(colors.accent) },
  avatarImagen: { width: '100%', height: '100%', borderRadius: 47 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 47, backgroundColor: colors.bgCard3, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.text, fontWeight: 'bold', fontSize: 38 },
  verificadoBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.bg },
  nombre: { color: colors.text, ...type.h1, textAlign: 'center' },
  gremioRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  gremioEmoji: { fontSize: 14 },
  gremioTexto: { color: colors.textMuted, fontSize: 13 },
  puntoSeparador: { color: colors.textFaint, fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  ratingNum: { color: colors.text, fontWeight: '700', fontSize: 15 },
  ratingSub: { color: colors.textMuted, fontSize: 13 },

  chipsFila: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  chipTexto: { fontSize: 12, fontWeight: '700' },

  bioCard: { padding: spacing.lg, marginBottom: spacing.md },
  descripcion: { color: colors.text, fontSize: 14, lineHeight: 21 },
  verMas: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statNum: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { color: colors.textMuted, fontSize: 11 },

  seccionTitulo: { color: colors.text, ...type.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  seccionVacia: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },

  serviciosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  servicioCardWrap: { width: '48%' },
  servicioCard: { padding: spacing.md, alignItems: 'flex-start', minHeight: 92 },
  servicioEmoji: { fontSize: 22, marginBottom: spacing.xs },
  servicioNombre: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  servicioPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 13 },

  fotoTrabajo: { width: 140, height: 100, borderRadius: radius.md },

  resumenResenas: { padding: spacing.lg, marginBottom: spacing.md },
  resumenCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  resumenNota: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  resumenEtiqueta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barraEtiqueta: { color: colors.textMuted, fontSize: 12, width: 90 },
  barraTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barraRelleno: { height: 6, borderRadius: 3, backgroundColor: colors.amber },
  barraValor: { color: colors.text, fontSize: 12, fontWeight: '600', width: 26, textAlign: 'right' },

  resenaCard: { padding: spacing.md, marginBottom: spacing.sm },
  resenaCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  resenaAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCard3, justifyContent: 'center', alignItems: 'center' },
  resenaAvatarText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  resenaNombre: { color: colors.text, fontSize: 13, fontWeight: '600' },
  estrellasRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
  resenaFecha: { color: colors.textFaint, fontSize: 11, marginLeft: 4 },
  resenaComentario: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', lineHeight: 19 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 34 },
  footerGlass: { padding: spacing.md },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  btnMensaje: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border2 },
  btnContratar: { flexDirection: 'row', gap: 6, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  btnContratarText: { color: colors.text, fontWeight: 'bold', fontSize: 15 },
  btnNoMostrar: { alignItems: 'center', paddingTop: spacing.sm },
  btnNoMostrarText: { color: colors.textMuted, fontSize: 12 },
});
