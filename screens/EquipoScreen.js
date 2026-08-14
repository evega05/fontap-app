import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';
import { agregarArchivo } from '../subirArchivo';

const API = 'https://fontap-backend-production.up.railway.app';

const TAREA_ESTADO_LABEL = { pendiente: 'Nueva', aceptada: 'Aceptada', en_camino: 'En camino' };
const TAREA_ESTADO_COLOR = {
  pendiente: { backgroundColor: colors.blueLight },
  aceptada: { backgroundColor: colors.amberGlass },
  en_camino: { backgroundColor: colors.greenGlass },
};

// Sin selector de fecha nativo (evita sumar una dependencia solo para esto): unas
// pocas opciones rápidas cubren el uso real de "instrucción para dentro de un rato".
const OPCIONES_FECHA_INSTRUCCION = [
  { label: 'En 1h', calcular: () => new Date(Date.now() + 60 * 60000) },
  { label: 'En 3h', calcular: () => new Date(Date.now() + 3 * 60 * 60000) },
  { label: 'Mañana 9:00', calcular: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
];

function formatFechaCorta(fecha) {
  if (!fecha) return null;
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const ahora = new Date();
  if (fecha.toDateString() === ahora.toDateString()) return `Hoy · ${hora}`;
  const mañana = new Date(ahora);
  mañana.setDate(mañana.getDate() + 1);
  if (fecha.toDateString() === mañana.toDateString()) return `Mañana · ${hora}`;
  return `${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${hora}`;
}

const RADIO_DIAL_COMISION = 40;
const CIRCUNFERENCIA_DIAL_COMISION = 2 * Math.PI * RADIO_DIAL_COMISION;

export default function EquipoScreen({ navigation }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [equipo, setEquipo] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [emailInvitar, setEmailInvitar] = useState('');
  const [invitando, setInvitando] = useState(false);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [aceptando, setAceptando] = useState(null);
  const [saliendo, setSaliendo] = useState(false);
  const [comisionPorcentaje, setComisionPorcentaje] = useState('');
  const [guardandoComision, setGuardandoComision] = useState(false);
  const [comisionEmpresa, setComisionEmpresa] = useState(null);
  const [liquidando, setLiquidando] = useState(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [tabAdmin, setTabAdmin] = useState('equipo');
  const [tareasEquipo, setTareasEquipo] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [instruccionTexto, setInstruccionTexto] = useState('');
  const [enviandoInstruccion, setEnviandoInstruccion] = useState(false);
  const [urgenteInstruccion, setUrgenteInstruccion] = useState(false);
  const [fechaInstruccion, setFechaInstruccion] = useState(null);
  const [fechaInstruccionLabel, setFechaInstruccionLabel] = useState(null);

  const cargar = useCallback(async () => {
    if (!usuario?.id) { setCargando(false); return; }
    try {
      const resPerfil = await axios.get(`${API}/fontaneros/${usuario.id}/perfil`, { headers });
      setPerfil(resPerfil.data);
      setNombreEmpresa(resPerfil.data.nombre_empresa || '');
      setComisionPorcentaje(resPerfil.data.comision_empresa_porcentaje != null ? String(resPerfil.data.comision_empresa_porcentaje) : '');
      if (resPerfil.data.empresa_id) {
        setEquipo([]);
      } else {
        try {
          const resEquipo = await axios.get(`${API}/fontaneros/${usuario.id}/equipo`, { headers });
          setEquipo(resEquipo.data || []);
        } catch (e) { setEquipo([]); }
        try {
          const resComision = await axios.get(`${API}/fontaneros/${usuario.id}/comision-empresa-pendiente`, { headers });
          setComisionEmpresa(resComision.data);
        } catch (e) { setComisionEmpresa(null); }
        try {
          const resTareas = await axios.get(`${API}/fontaneros/${usuario.id}/tareas-equipo`, { headers });
          setTareasEquipo(resTareas.data || []);
        } catch (e) { setTareasEquipo([]); }
      }
      try {
        const resNotifs = await axios.get(`${API}/usuarios/${usuario.id}/notificaciones`, { headers });
        // No filtramos por "leída": NotificacionesScreen marca leída ANTES de navegar acá,
        // así que una invitación recién tocada ya llegaría con leida=true. Lo que importa es
        // si esa invitación puntual (referencia_id = empresa_fontanero_id) ya fue aceptada.
        setInvitaciones((resNotifs.data || []).filter(n => n.tipo === 'invitacion_equipo' && resPerfil.data.empresa_id !== n.referencia_id));
      } catch (e) { setInvitaciones([]); }
    } catch (e) {}
    finally { setCargando(false); }
  }, [usuario?.id, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarNombreEmpresa = async () => {
    if (!nombreEmpresa.trim()) return;
    setGuardandoNombre(true);
    try {
      await axios.put(`${API}/fontaneros/${usuario.id}/empresa`, { nombre_empresa: nombreEmpresa.trim() }, { headers });
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el nombre de la empresa'));
    } finally {
      setGuardandoNombre(false);
    }
  };

  const ajustarComision = (delta) => {
    const actual = parseFloat(comisionPorcentaje) || 0;
    const nuevo = Math.min(100, Math.max(0, actual + delta));
    setComisionPorcentaje(String(nuevo));
  };

  const guardarComision = async () => {
    const valor = parseFloat(comisionPorcentaje);
    if (isNaN(valor) || valor < 0 || valor > 100) {
      avisar('Error', 'Introduce un porcentaje entre 0 y 100');
      return;
    }
    setGuardandoComision(true);
    try {
      await axios.put(`${API}/fontaneros/${usuario.id}/empresa`, { comision_empresa_porcentaje: valor }, { headers });
      avisar('Guardado', 'Se aplicará a los próximos trabajos que asignes');
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el porcentaje'));
    } finally {
      setGuardandoComision(false);
    }
  };

  const liquidarComision = (empleadoId) => {
    confirmarAccion('Marcar como saldado', '¿Confirmas que ya has cobrado esto de tu empleado (en efectivo, Bizum, nómina, etc.)?', async () => {
      setLiquidando(empleadoId);
      try {
        await axios.put(`${API}/fontaneros/${usuario.id}/comision-empresa-pendiente/liquidar`, { empleado_fontanero_id: empleadoId }, { headers });
        cargar();
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo marcar como saldado'));
      } finally {
        setLiquidando(null);
      }
    }, { textoConfirmar: 'Sí, ya lo cobré', textoCancelar: 'Todavía no' });
  };

  const subirLogo = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (resultado.canceled) return;
    setSubiendoLogo(true);
    try {
      const form = new FormData();
      await agregarArchivo(form, 'archivo', resultado.assets[0].uri, 'logo.jpg', 'image/jpeg');
      await axios.post(`${API}/fontaneros/${usuario.id}/logo-empresa`, form, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo subir el logo'));
    } finally {
      setSubiendoLogo(false);
    }
  };

  const invitar = async () => {
    if (!emailInvitar.trim()) return;
    setInvitando(true);
    try {
      await axios.post(`${API}/fontaneros/${usuario.id}/equipo/invitar`, { email: emailInvitar.trim() }, { headers });
      avisar('Invitación enviada', 'Le avisaremos para que la acepte');
      setEmailInvitar('');
      setMostrarInvitar(false);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar la invitación'));
    } finally {
      setInvitando(false);
    }
  };

  const enviarInstruccion = async () => {
    if (!instruccionTexto.trim() || !miembroSeleccionado) return;
    setEnviandoInstruccion(true);
    try {
      await axios.post(`${API}/tareas`, {
        empleado_fontanero_id: miembroSeleccionado.id,
        descripcion: instruccionTexto.trim(),
        urgente: urgenteInstruccion,
        fecha_objetivo: fechaInstruccion ? fechaInstruccion.toISOString() : null,
      }, { headers });
      setInstruccionTexto('');
      setUrgenteInstruccion(false);
      setFechaInstruccion(null);
      setFechaInstruccionLabel(null);
      const resTareas = await axios.get(`${API}/fontaneros/${usuario.id}/tareas-equipo`, { headers });
      setTareasEquipo(resTareas.data || []);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar la instrucción'));
    } finally {
      setEnviandoInstruccion(false);
    }
  };

  const quitarDelEquipo = (miembro) => {
    confirmarAccion('Quitar del equipo', `¿Seguro que quieres quitar a ${miembro.nombre} de tu equipo?`, async () => {
      try {
        await axios.delete(`${API}/fontaneros/${usuario.id}/equipo/${miembro.id}`, { headers });
        cargar();
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo quitar del equipo'));
      }
    }, { textoConfirmar: 'Sí, quitar', textoCancelar: 'No' });
  };

  const aceptarInvitacion = async (notif) => {
    setAceptando(notif.id);
    try {
      await axios.put(`${API}/fontaneros/${usuario.id}/equipo/aceptar`, { empresa_fontanero_id: notif.referencia_id }, { headers });
      await axios.put(`${API}/notificaciones/${notif.id}/leer`, null, { headers }).catch(() => {});
      avisar('Te has unido', 'Ya formas parte del equipo');
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo aceptar la invitación'));
    } finally {
      setAceptando(null);
    }
  };

  const salirDelEquipo = () => {
    if (!perfil) return;
    confirmarAccion('Salir del equipo', '¿Seguro que quieres salir de este equipo?', async () => {
      setSaliendo(true);
      try {
        await axios.delete(`${API}/fontaneros/${usuario.id}/equipo/${perfil.id}`, { headers });
        cargar();
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo salir del equipo'));
      } finally {
        setSaliendo(false);
      }
    }, { textoConfirmar: 'Sí, salir', textoCancelar: 'No' });
  };

  const comisionNum = parseFloat(comisionPorcentaje) || 0;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Administración</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {invitaciones.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitulo}>Invitaciones pendientes</Text>
              {invitaciones.map(n => (
                <View key={n.id} style={s.invitacionRow}>
                  <Text style={s.invitacionTexto}>{n.mensaje || n.cuerpo}</Text>
                  <TouchableOpacity
                    style={[s.btnPrimario, aceptando === n.id && s.btnDesactivado]}
                    onPress={() => aceptarInvitacion(n)}
                    disabled={aceptando === n.id}
                  >
                    <Text style={s.btnPrimarioText}>{aceptando === n.id ? 'Uniéndote...' : 'Unirme al equipo'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {perfil?.empresa_id ? (
            <View style={s.card}>
              <View style={s.cardHeadRow}>
                <View style={[s.cardIcon, s.cardIconViolet]}>
                  <Ionicons name="people" size={15} color={colors.purple} />
                </View>
                <Text style={s.cardTitulo}>Formas parte de un equipo</Text>
              </View>
              <Text style={s.cardSub}>Ya no puedes crear tu propia empresa mientras seas parte de otro equipo.</Text>
              <TouchableOpacity style={[s.btnPeligro, saliendo && s.btnDesactivado]} onPress={salirDelEquipo} disabled={saliendo}>
                <Text style={s.btnPeligroText}>{saliendo ? 'Saliendo...' : 'Salir del equipo'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.identityRow}>
                <TouchableOpacity style={s.identityLogo} onPress={subirLogo} disabled={subiendoLogo}>
                  {perfil?.logo_empresa_url ? (
                    <Image source={{ uri: `${API}${perfil.logo_empresa_url}` }} style={s.identityLogoImg} />
                  ) : (
                    <Ionicons name="business" size={22} color={colors.textFaint} />
                  )}
                  <View style={s.identityLogoBadge}>
                    {subiendoLogo ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="camera" size={11} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={s.identityEyebrow}>Tu empresa</Text>
                  <View style={s.identityNameRow}>
                    <TextInput
                      style={s.identityNameInput}
                      placeholder="Ej. Fontanería Bilbao SL"
                      placeholderTextColor={colors.textFaint}
                      value={nombreEmpresa}
                      onChangeText={setNombreEmpresa}
                    />
                    {nombreEmpresa.trim() && nombreEmpresa !== (perfil?.nombre_empresa || '') && (
                      <TouchableOpacity onPress={guardarNombreEmpresa} disabled={guardandoNombre} style={s.identitySaveBtn}>
                        <Text style={s.identitySaveBtnText}>{guardandoNombre ? '...' : 'Guardar'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={s.panelGestionCard} onPress={() => navigation.navigate('PanelGestion')} activeOpacity={0.85}>
                <View style={s.panelGestionIconWrap}>
                  <Ionicons name="stats-chart" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.panelGestionTitulo}>Panel de gestión</Text>
                  <Text style={s.panelGestionSub}>Agenda, clientes, obras, presupuestos y nómina</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </TouchableOpacity>

              {perfil?.nombre_empresa && (
                <>
                  <View style={s.tabs}>
                    <TouchableOpacity
                      style={[s.tabBtn, tabAdmin === 'equipo' && s.tabBtnActivo]}
                      onPress={() => setTabAdmin('equipo')}
                    >
                      <Ionicons name="people" size={14} color={tabAdmin === 'equipo' ? colors.text : colors.textMuted} />
                      <Text style={[s.tabBtnText, tabAdmin === 'equipo' && s.tabBtnTextActivo]}>Equipo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.tabBtn, tabAdmin === 'ajustes' && s.tabBtnActivo]}
                      onPress={() => setTabAdmin('ajustes')}
                    >
                      <Ionicons name="settings" size={14} color={tabAdmin === 'ajustes' ? colors.text : colors.textMuted} />
                      <Text style={[s.tabBtnText, tabAdmin === 'ajustes' && s.tabBtnTextActivo]}>Ajustes</Text>
                    </TouchableOpacity>
                  </View>

                  {tabAdmin === 'equipo' ? (
                    <>
                      <View style={s.equipoHeadRow}>
                        <View style={s.equipoHeadLeft}>
                          <View style={[s.cardIcon, s.cardIconAccent]}>
                            <Ionicons name="people" size={14} color={colors.accent2} />
                          </View>
                          <Text style={s.equipoHeadTitulo}>Tu equipo</Text>
                          <Text style={s.equipoHeadCount}>· {equipo.length}</Text>
                        </View>
                        <TouchableOpacity
                          style={[s.fabInvite, mostrarInvitar && s.fabInviteOpen]}
                          onPress={() => setMostrarInvitar(v => !v)}
                        >
                          <Ionicons name={mostrarInvitar ? 'close' : 'add'} size={18} color={mostrarInvitar ? colors.textMuted : '#fff'} />
                        </TouchableOpacity>
                      </View>

                      {mostrarInvitar && (
                        <View style={s.inviteCard}>
                          <Text style={s.inviteCardSub}>Solo puedes invitar a profesionales de tu mismo gremio ({perfil.gremio}) que aún no formen parte de otro equipo.</Text>
                          <View style={s.inviteRow}>
                            <TextInput
                              style={[s.input, { flex: 1, marginBottom: 0 }]}
                              placeholder="Email del profesional"
                              placeholderTextColor={colors.textFaint}
                              value={emailInvitar}
                              onChangeText={setEmailInvitar}
                              autoCapitalize="none"
                              keyboardType="email-address"
                            />
                            <TouchableOpacity
                              style={[s.btnEnviar, (!emailInvitar.trim() || invitando) && s.btnDesactivado]}
                              onPress={invitar}
                              disabled={!emailInvitar.trim() || invitando}
                            >
                              <Text style={s.btnEnviarText}>{invitando ? '...' : 'Enviar'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {comisionEmpresa && comisionEmpresa.total > 0 && (
                        <View style={s.card}>
                          <View style={s.cardHeadRow}>
                            <View style={[s.cardIcon, s.cardIconGreen]}>
                              <Ionicons name="cash" size={14} color={colors.green} />
                            </View>
                            <Text style={s.cardTitulo}>Lo que te deben tus empleados</Text>
                          </View>
                          <Text style={s.comisionTotal}>{comisionEmpresa.total.toFixed(2)}€</Text>
                          {comisionEmpresa.por_empleado.map(pe => (
                            <View key={pe.empleado_id} style={s.comisionEmpleadoRow}>
                              <View>
                                <Text style={s.comisionEmpleadoNombre}>{pe.empleado_nombre}</Text>
                                <Text style={s.comisionEmpleadoSub}>{pe.num_servicios} trabajo{pe.num_servicios !== 1 ? 's' : ''} · {pe.total.toFixed(2)}€</Text>
                              </View>
                              <TouchableOpacity
                                style={[s.btnSaldar, liquidando === pe.empleado_id && s.btnDesactivado]}
                                onPress={() => liquidarComision(pe.empleado_id)}
                                disabled={liquidando === pe.empleado_id}
                              >
                                <Text style={s.btnSaldarText}>{liquidando === pe.empleado_id ? '...' : 'Ya lo cobré'}</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      {equipo.length === 0 ? (
                        <View style={s.vacio}>
                          <View style={s.vacioIconWrap}>
                            <Ionicons name="people-outline" size={20} color={colors.purple} />
                          </View>
                          <Text style={s.vacioTexto}>Todavía no invitaste a nadie</Text>
                          <Text style={s.vacioSub}>Los profesionales que aceptes aparecerán acá, con su disponibilidad y trabajos asignados.</Text>
                        </View>
                      ) : (
                        equipo.map(m => (
                          <TouchableOpacity key={m.id} style={s.miembroCard} activeOpacity={0.8} onPress={() => { setMiembroSeleccionado(m); setUrgenteInstruccion(false); setFechaInstruccion(null); setFechaInstruccionLabel(null); }}>
                            <View style={s.miembroLeft}>
                              <View style={s.avatar}><Text style={s.avatarText}>{(m.nombre || '?')[0].toUpperCase()}</Text></View>
                              <View>
                                <Text style={s.miembroNombre}>{m.nombre}</Text>
                                <Text style={s.miembroSub}>
                                  {m.disponible ? '🟢 Disponible' : '⚪ No disponible'}{m.valoracion ? ` · ⭐ ${m.valoracion}` : ''} · {m.num_trabajos} trabajos
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity style={s.btnQuitar} onPress={(e) => { e.stopPropagation(); quitarDelEquipo(m); }}>
                              <Ionicons name="trash-outline" size={15} color={colors.red} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      <View style={s.dialCard}>
                        <View style={s.cardHeadRow}>
                          <View style={[s.cardIcon, s.cardIconGreen]}>
                            <Ionicons name="cash-outline" size={14} color={colors.green} />
                          </View>
                          <Text style={s.cardTitulo}>Comisión del equipo</Text>
                        </View>
                        <View style={s.dialBody}>
                          <TouchableOpacity style={s.stepperBtn} onPress={() => ajustarComision(-5)}>
                            <Ionicons name="remove" size={18} color={colors.text} />
                          </TouchableOpacity>
                          <View style={s.dialRingWrap}>
                            <Svg width={96} height={96} style={{ transform: [{ rotate: '-90deg' }] }}>
                              <Circle cx={48} cy={48} r={RADIO_DIAL_COMISION} stroke={colors.glassBorder} strokeWidth={8} fill="none" />
                              <Circle
                                cx={48} cy={48} r={RADIO_DIAL_COMISION} stroke={colors.green} strokeWidth={8} fill="none"
                                strokeLinecap="round"
                                strokeDasharray={CIRCUNFERENCIA_DIAL_COMISION}
                                strokeDashoffset={CIRCUNFERENCIA_DIAL_COMISION * (1 - Math.min(comisionNum, 100) / 100)}
                              />
                            </Svg>
                            <View style={s.dialValueWrap}>
                              <Text style={s.dialValueText}>{comisionNum}%</Text>
                            </View>
                          </View>
                          <TouchableOpacity style={s.stepperBtn} onPress={() => ajustarComision(5)}>
                            <Ionicons name="add" size={18} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                        <View style={s.dialFoot}>
                          <Text style={s.dialFootText}>
                            De lo que cobre un empleado, este % te corresponde. Os lo repartís aparte — la app solo lleva la cuenta.
                          </Text>
                          <TouchableOpacity
                            style={[s.btnGuardarDial, guardandoComision && s.btnDesactivado]}
                            onPress={guardarComision}
                            disabled={guardandoComision}
                          >
                            <Text style={s.btnGuardarDialText}>{guardandoComision ? '...' : 'Guardar'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={s.fieldCard}>
                        <Text style={s.fieldCardLabel}>Gremio del equipo</Text>
                        <Text style={s.fieldCardVal}>{perfil.gremio}</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {miembroSeleccionado && (
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={() => setMiembroSeleccionado(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={s.avatar}><Text style={s.avatarText}>{(miembroSeleccionado.nombre || '?')[0].toUpperCase()}</Text></View>
              <Text style={s.sheetNombre} numberOfLines={1}>{miembroSeleccionado.nombre}</Text>
              <TouchableOpacity onPress={() => setMiembroSeleccionado(null)} style={s.sheetCerrar}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>Instrucción rápida</Text>
            <View style={s.sheetInputRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Ej. Pasate a buscar materiales al depósito"
                placeholderTextColor={colors.textFaint}
                value={instruccionTexto}
                onChangeText={setInstruccionTexto}
                multiline
              />
              <TouchableOpacity
                style={[s.btnEnviarInstruccion, (!instruccionTexto.trim() || enviandoInstruccion) && s.btnDesactivado]}
                onPress={enviarInstruccion}
                disabled={!instruccionTexto.trim() || enviandoInstruccion}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={s.instruccionOpciones}>
              <TouchableOpacity
                style={[s.chipOpcion, urgenteInstruccion && s.chipOpcionUrgenteActiva]}
                onPress={() => setUrgenteInstruccion(v => !v)}
              >
                <Ionicons name="alert-circle-outline" size={13} color={urgenteInstruccion ? colors.red : colors.textMuted} />
                <Text style={[s.chipOpcionText, urgenteInstruccion && { color: colors.red }]}>Urgente</Text>
              </TouchableOpacity>
              {OPCIONES_FECHA_INSTRUCCION.map(op => {
                const activa = fechaInstruccionLabel === op.label;
                return (
                  <TouchableOpacity
                    key={op.label}
                    style={[s.chipOpcion, activa && s.chipOpcionActiva]}
                    onPress={() => {
                      if (activa) { setFechaInstruccion(null); setFechaInstruccionLabel(null); }
                      else { setFechaInstruccion(op.calcular()); setFechaInstruccionLabel(op.label); }
                    }}
                  >
                    <Text style={[s.chipOpcionText, activa && { color: colors.text, fontWeight: '700' }]}>{op.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {fechaInstruccion && (
              <Text style={s.instruccionFechaHint}>Se enviará para: {formatFechaCorta(fechaInstruccion)}</Text>
            )}

            <Text style={s.sheetLabel}>Tareas activas</Text>
            {tareasEquipo.filter(t => t.empleado_id === miembroSeleccionado.id).length === 0 ? (
              <Text style={s.sheetVacio}>No tiene tareas activas ahora mismo</Text>
            ) : (
              tareasEquipo.filter(t => t.empleado_id === miembroSeleccionado.id).map(t => (
                <View key={t.id} style={s.sheetTareaRow}>
                  <View style={{ flex: 1 }}>
                    <View style={s.sheetTareaBadgesRow}>
                      {t.urgente && (
                        <View style={s.sheetUrgenteBadge}>
                          <Text style={s.sheetUrgenteBadgeText}>Urgente</Text>
                        </View>
                      )}
                      {t.fecha_objetivo && (
                        <Text style={s.sheetTareaFecha}>{formatFechaCorta(new Date(t.fecha_objetivo))}</Text>
                      )}
                    </View>
                    <Text style={s.sheetTareaDescripcion} numberOfLines={2}>{t.descripcion}</Text>
                    {t.estado === 'en_camino' && t.empleado_latitud != null && (
                      <Text style={s.sheetTareaUbicacion}>📍 Compartiendo ubicación en vivo</Text>
                    )}
                  </View>
                  <View style={[s.sheetEstadoPill, TAREA_ESTADO_COLOR[t.estado]]}>
                    <Text style={s.sheetEstadoPillText}>{TAREA_ESTADO_LABEL[t.estado] || t.estado}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 },
  identityLogo: { width: 56, height: 56, borderRadius: 17, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2, justifyContent: 'center', alignItems: 'center' },
  identityLogoImg: { width: 56, height: 56, borderRadius: 17 },
  identityLogoBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blue, borderWidth: 2.5, borderColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  identityEyebrow: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  identityNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identityNameInput: { flex: 1, color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, padding: 0 },
  identitySaveBtn: { backgroundColor: colors.blue, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  identitySaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  panelGestionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.blueLight, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.blue },
  panelGestionIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  panelGestionTitulo: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 3 },
  panelGestionSub: { color: colors.textMuted, fontSize: 12.5, lineHeight: 17 },

  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgCard2, borderRadius: 14, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  tabBtnActivo: { backgroundColor: colors.blue },
  tabBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  tabBtnTextActivo: { color: colors.text },

  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 },
  cardIcon: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cardIconAccent: { backgroundColor: colors.blueLight },
  cardIconGreen: { backgroundColor: colors.greenLight },
  cardIconViolet: { backgroundColor: 'rgba(180,156,255,0.15)' },
  cardTitulo: { color: colors.text, fontWeight: '700', fontSize: 15 },
  cardSub: { color: colors.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 18 },
  input: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center' },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnDesactivado: { opacity: 0.5 },
  btnPeligro: { backgroundColor: colors.redLight, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  btnPeligroText: { color: colors.red, fontWeight: 'bold', fontSize: 14 },

  equipoHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  equipoHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  equipoHeadTitulo: { color: colors.text, fontWeight: '800', fontSize: 14 },
  equipoHeadCount: { color: colors.textFaint, fontSize: 12, fontWeight: '700' },
  fabInvite: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  fabInviteOpen: { backgroundColor: colors.bgCard2 },

  inviteCard: { backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 14 },
  inviteCardSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  btnEnviar: { backgroundColor: colors.bgCard2, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: colors.border2 },
  btnEnviarText: { color: colors.text, fontWeight: '700', fontSize: 13 },

  vacio: { alignItems: 'center', paddingVertical: 26, backgroundColor: colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  vacioIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(180,156,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  vacioTexto: { color: colors.text, fontWeight: '800', fontSize: 14.5, marginBottom: 5 },
  vacioSub: { color: colors.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },

  miembroCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  miembroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  miembroNombre: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  miembroSub: { color: colors.textMuted, fontSize: 12 },
  btnQuitar: { backgroundColor: colors.redLight, borderRadius: 10, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.red },

  invitacionRow: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginTop: 8, gap: 10 },
  invitacionTexto: { color: colors.text, fontSize: 13, lineHeight: 18 },

  comisionTotal: { color: colors.green, fontSize: 28, fontWeight: 'bold', marginBottom: 14 },
  comisionEmpleadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginBottom: 8 },
  comisionEmpleadoNombre: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  comisionEmpleadoSub: { color: colors.textMuted, fontSize: 12 },
  btnSaldar: { backgroundColor: colors.greenGlass, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.green },
  btnSaldarText: { color: colors.green, fontWeight: '700', fontSize: 12 },

  dialCard: { backgroundColor: colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 14 },
  dialBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 8 },
  stepperBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border2, justifyContent: 'center', alignItems: 'center' },
  dialRingWrap: { width: 96, height: 96, justifyContent: 'center', alignItems: 'center' },
  dialValueWrap: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  dialValueText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dialFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  dialFootText: { flex: 1, color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  btnGuardarDial: { backgroundColor: colors.green, borderRadius: 11, paddingHorizontal: 15, paddingVertical: 9 },
  btnGuardarDialText: { color: '#052018', fontWeight: '800', fontSize: 12.5 },

  fieldCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15 },
  fieldCardLabel: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600' },
  fieldCardVal: { color: colors.text, fontSize: 13.5, fontWeight: '700' },

  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 200 },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sheetNombre: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 16 },
  sheetCerrar: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center' },
  sheetLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  sheetInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 10 },
  btnEnviarInstruccion: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  instruccionOpciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chipOpcion: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgCard2, borderRadius: 999, borderWidth: 1, borderColor: colors.border2, paddingHorizontal: 10, paddingVertical: 6 },
  chipOpcionActiva: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  chipOpcionUrgenteActiva: { backgroundColor: colors.redGlass, borderColor: colors.red },
  chipOpcionText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600' },
  instruccionFechaHint: { color: colors.textFaint, fontSize: 11, marginBottom: 14 },
  sheetVacio: { color: colors.textFaint, fontSize: 13 },
  sheetTareaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginBottom: 8 },
  sheetTareaBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  sheetUrgenteBadge: { backgroundColor: colors.redGlass, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  sheetUrgenteBadgeText: { color: colors.red, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  sheetTareaFecha: { color: colors.textFaint, fontSize: 10.5, fontWeight: '600' },
  sheetTareaDescripcion: { color: colors.text, fontSize: 13, lineHeight: 18 },
  sheetTareaUbicacion: { color: colors.green, fontSize: 11, fontWeight: '600', marginTop: 3 },
  sheetEstadoPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sheetEstadoPillText: { color: colors.text, fontSize: 10.5, fontWeight: '700' },
});
