import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';

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
  const [aceptando, setAceptando] = useState(null);
  const [saliendo, setSaliendo] = useState(false);
  const [comisionPorcentaje, setComisionPorcentaje] = useState('');
  const [guardandoComision, setGuardandoComision] = useState(false);
  const [comisionEmpresa, setComisionEmpresa] = useState(null);
  const [liquidando, setLiquidando] = useState(null);

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
      }
      try {
        const resNotifs = await axios.get(`${API}/usuarios/${usuario.id}/notificaciones`, { headers });
        setInvitaciones((resNotifs.data || []).filter(n => n.tipo === 'invitacion_equipo' && !n.leida));
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

  const invitar = async () => {
    if (!emailInvitar.trim()) return;
    setInvitando(true);
    try {
      await axios.post(`${API}/fontaneros/${usuario.id}/equipo/invitar`, { email: emailInvitar.trim() }, { headers });
      avisar('Invitación enviada', 'Le avisaremos para que la acepte');
      setEmailInvitar('');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar la invitación'));
    } finally {
      setInvitando(false);
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

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mi equipo</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {invitaciones.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitulo}>🤝 Invitaciones pendientes</Text>
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
              <Text style={s.cardTitulo}>👥 Formas parte de un equipo</Text>
              <Text style={s.cardSub}>Ya no puedes crear tu propia empresa mientras seas parte de otro equipo.</Text>
              <TouchableOpacity style={[s.btnPeligro, saliendo && s.btnDesactivado]} onPress={salirDelEquipo} disabled={saliendo}>
                <Text style={s.btnPeligroText}>{saliendo ? 'Saliendo...' : 'Salir del equipo'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.card}>
                <Text style={s.cardTitulo}>🏢 Nombre de tu empresa</Text>
                <Text style={s.cardSub}>Ponle nombre a tu empresa para poder invitar a otros profesionales de tu gremio a tu equipo.</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej. Fontanería Bilbao SL"
                  placeholderTextColor={colors.textFaint}
                  value={nombreEmpresa}
                  onChangeText={setNombreEmpresa}
                />
                <TouchableOpacity
                  style={[s.btnPrimario, (!nombreEmpresa.trim() || guardandoNombre) && s.btnDesactivado]}
                  onPress={guardarNombreEmpresa}
                  disabled={!nombreEmpresa.trim() || guardandoNombre}
                >
                  <Text style={s.btnPrimarioText}>{guardandoNombre ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>

              {perfil?.nombre_empresa && (
                <>
                  <View style={s.card}>
                    <Text style={s.cardTitulo}>💰 Comisión del equipo</Text>
                    <Text style={s.cardSub}>
                      Cuando le asignes un trabajo a un empleado, este porcentaje de lo que cobre te corresponde a ti.
                      Os lo repartís aparte (efectivo, Bizum, nómina...); la app solo lo lleva la cuenta.
                    </Text>
                    <View style={s.comisionRow}>
                      <TextInput
                        style={[s.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="0"
                        placeholderTextColor={colors.textFaint}
                        value={comisionPorcentaje}
                        onChangeText={setComisionPorcentaje}
                        keyboardType="numeric"
                      />
                      <Text style={s.comisionPorcentajeSigno}>%</Text>
                      <TouchableOpacity
                        style={[s.btnPrimario, { paddingHorizontal: 18 }, guardandoComision && s.btnDesactivado]}
                        onPress={guardarComision}
                        disabled={guardandoComision}
                      >
                        <Text style={s.btnPrimarioText}>{guardandoComision ? '...' : 'Guardar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {comisionEmpresa && comisionEmpresa.total > 0 && (
                    <View style={s.card}>
                      <Text style={s.cardTitulo}>📋 Lo que te deben tus empleados</Text>
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

                  <View style={s.card}>
                    <Text style={s.cardTitulo}>➕ Invitar a un profesional</Text>
                    <Text style={s.cardSub}>Solo puedes invitar a profesionales de tu mismo gremio ({perfil.gremio}) que aún no formen parte de otro equipo.</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Email del profesional"
                      placeholderTextColor={colors.textFaint}
                      value={emailInvitar}
                      onChangeText={setEmailInvitar}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TouchableOpacity
                      style={[s.btnPrimario, (!emailInvitar.trim() || invitando) && s.btnDesactivado]}
                      onPress={invitar}
                      disabled={!emailInvitar.trim() || invitando}
                    >
                      <Text style={s.btnPrimarioText}>{invitando ? 'Enviando...' : 'Enviar invitación'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.subtitulo}>Tu equipo ({equipo.length})</Text>
                  {equipo.length === 0 ? (
                    <View style={s.vacio}>
                      <Text style={s.vacioEmoji}>👷</Text>
                      <Text style={s.vacioTexto}>Todavía no tienes empleados en tu equipo</Text>
                    </View>
                  ) : (
                    equipo.map(m => (
                      <View key={m.id} style={s.miembroCard}>
                        <View style={s.miembroLeft}>
                          <View style={s.avatar}><Text style={s.avatarText}>{(m.nombre || '?')[0].toUpperCase()}</Text></View>
                          <View>
                            <Text style={s.miembroNombre}>{m.nombre}</Text>
                            <Text style={s.miembroSub}>
                              {m.disponible ? '🟢 Disponible' : '⚪ No disponible'}{m.valoracion ? ` · ⭐ ${m.valoracion}` : ''} · {m.num_trabajos} trabajos
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity style={s.btnQuitar} onPress={() => quitarDelEquipo(m)}>
                          <Text style={s.btnQuitarText}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
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
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  cardSub: { color: colors.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 18 },
  input: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center' },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnDesactivado: { opacity: 0.5 },
  btnPeligro: { backgroundColor: colors.redLight, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  btnPeligroText: { color: colors.red, fontWeight: 'bold', fontSize: 14 },
  subtitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  vacio: { alignItems: 'center', paddingVertical: 30 },
  vacioEmoji: { fontSize: 40, marginBottom: 10 },
  vacioTexto: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  miembroCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  miembroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  miembroNombre: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  miembroSub: { color: colors.textMuted, fontSize: 12 },
  btnQuitar: { backgroundColor: colors.redLight, borderRadius: 10, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  btnQuitarText: { fontSize: 16 },
  invitacionRow: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginTop: 8, gap: 10 },
  invitacionTexto: { color: colors.text, fontSize: 13, lineHeight: 18 },
  comisionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comisionPorcentajeSigno: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  comisionTotal: { color: colors.green, fontSize: 28, fontWeight: 'bold', marginBottom: 14 },
  comisionEmpleadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 12, padding: 12, marginBottom: 8 },
  comisionEmpleadoNombre: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  comisionEmpleadoSub: { color: colors.textMuted, fontSize: 12 },
  btnSaldar: { backgroundColor: colors.greenGlass, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.green },
  btnSaldarText: { color: colors.green, fontWeight: '700', fontSize: 12 },
});
