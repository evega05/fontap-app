import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import axios from 'axios';
import * as Location from 'expo-location';
import { useAuth } from '../AuthContext';
import { colors, spacing, radius, type, shadow } from '../theme';
import Pressable from '../components/Pressable';
import FadeInUp from '../components/FadeInUp';
import GradientBg from '../components/GradientBg';
import Glass from '../components/Glass';
import { confirmarAccion, avisar } from '../confirmar';
import { iniciarSeguimientoUbicacion, detenerSeguimientoUbicacion } from '../ubicacionSeguimiento';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';

function distanciaKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

const RADIO_ANILLO_PERFIL = 14.5;
const CIRCUNFERENCIA_ANILLO_PERFIL = 2 * Math.PI * RADIO_ANILLO_PERFIL;

const HORAS_REPROGRAMAR = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'];
const ESTADOS_REPROGRAMABLES = new Set(['aceptado', 'precio_enviado', 'precio_aceptado']);

const ESTADO_PILL = {
  aceptado: { icon: 'cash-outline', label: 'Falta enviar precio' },
  precio_enviado: { icon: 'hourglass-outline', label: 'Esperando que acepte el precio' },
  precio_aceptado: { icon: 'checkmark-circle-outline', label: 'Precio aceptado' },
  en_camino: { icon: 'car-sport-outline', label: 'En camino' },
  pago_pendiente: { icon: 'hourglass-outline', label: 'Esperando pago' },
};

export default function PanelFontaneroScreen({ navigation, route }) {
  const { usuario, token, logout } = useAuth();
  const nombre = usuario?.nombre || route.params?.nombre || 'Fontanero';
  const userId = route.params?.userId || usuario?.id;

  const [disponible, setDisponible] = useState(true);
  const [disponible24h, setDisponible24h] = useState(false);
  const [tab, setTab] = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [completados, setCompletados] = useState([]);
  const [trabajoActivo, setTrabajoActivo] = useState(null);
  const [precioFinal, setPrecioFinal] = useState('');
  const [mostrarPrecio, setMostrarPrecio] = useState(false);
  const [mostrarReprogramar, setMostrarReprogramar] = useState(false);
  const [diaReprog, setDiaReprog] = useState(0);
  const [horaReprog, setHoraReprog] = useState(null);
  const [reprogramando, setReprogramando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [stats, setStats] = useState(null);
  const [comisionPendiente, setComisionPendiente] = useState(0);
  const [comisionNumServicios, setComisionNumServicios] = useState(0);
  const [comisionLimite, setComisionLimite] = useState(10);
  const [checklist, setChecklist] = useState(null);
  const [mostrarPagoComision, setMostrarPagoComision] = useState(false);
  const [metodoComisionElegido, setMetodoComisionElegido] = useState(null);
  const [instruccionesComision, setInstruccionesComision] = useState(null);
  const [cargandoInstrucciones, setCargandoInstrucciones] = useState(false);
  const [yaLlegue, setYaLlegue] = useState(false);
  const [equipo, setEquipo] = useState([]);
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [perfilPropio, setPerfilPropio] = useState(null);

  const pollingRef = useRef(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const cargarEstadisticas = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/estadisticas`, { headers });
      setStats(res.data);
    } catch (e) {}
  }, [userId, token]);

  const cargarCobros = useCallback(async () => {
    try {
      const resComision = await axios.get(`${API}/fontaneros/${userId}/comision-pendiente`, { headers });
      setComisionPendiente(resComision.data.total || 0);
      setComisionNumServicios(resComision.data.num_servicios || 0);
      setComisionLimite(resComision.data.limite_servicios || 10);
    } catch (e) {}
  }, [userId, token]);

  useEffect(() => {
    cargarEstadisticas();
    cargarCobros();
    const intervalo = setInterval(cargarEstadisticas, 15000);
    return () => clearInterval(intervalo);
  }, [cargarEstadisticas, cargarCobros]);

  useEffect(() => {
    axios.get(`${API}/fontaneros/${userId}/checklist-perfil`, { headers })
      .then(res => setChecklist(res.data))
      .catch(() => {});
  }, [userId, token]);

  useEffect(() => {
    axios.get(`${API}/fontaneros/${userId}/equipo`, { headers })
      .then(res => setEquipo(res.data || []))
      .catch(() => setEquipo([]));
  }, [userId, token]);

  useEffect(() => {
    axios.get(`${API}/fontaneros/${userId}/perfil`, { headers })
      .then(res => {
        setPerfilPropio(res.data);
        // Si es empleado de otra empresa (no dueño), este panel no es el suyo — el
        // suyo es el de tareas/avisos, más simple y sin las métricas del jefe.
        if (res.data?.empresa_id) {
          navigation.replace('PanelEmpleado', { nombre, userId });
        }
      })
      .catch(() => {});
  }, [userId, token]);

  const cerrarModalComision = () => {
    setMostrarPagoComision(false);
    setMetodoComisionElegido(null);
    setInstruccionesComision(null);
  };

  const elegirMetodoComision = async (metodo) => {
    setMetodoComisionElegido(metodo);
    setCargandoInstrucciones(true);
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/comision-pendiente/${metodo}`, { headers });
      setInstruccionesComision(res.data);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudieron cargar las instrucciones'));
    } finally {
      setCargandoInstrucciones(false);
    }
  };

  const cargarSolicitudes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fontaneros/${userId}/solicitudes`, { headers });
      const nuevas = res.data || [];
      // El backend devuelve siempre el conjunto completo y autoritativo (pendientes +
      // trabajo propio activo/terminado), así que se recalcula directo de `nuevas` en
      // vez de acumular sobre el estado previo: si no, un servicio pendiente cancelado
      // por el cliente (o cualquier otro que deje de aparecer en la respuesta) nunca se
      // quitaba de la lista —y si `nuevas` llegaba vacía, todo el bloque se saltaba y
      // quedaba un "trabajo en curso" fantasma para siempre.
      setPendientes(nuevas.filter(s => s.estado === 'pendiente'));
      const activo = nuevas.find(s => ['aceptado', 'precio_enviado', 'precio_aceptado', 'en_camino', 'pago_pendiente'].includes(s.estado));
      setTrabajoActivo(activo || null);
      setCompletados(prev => {
        // Si el backend ya confirmó "pagado" para un id que teníamos marcado como
        // pendiente de pago (tras marcarlo terminado), hay que quitarle esa marca aquí:
        // si no, "Pendiente pago" y el bloqueo de "Reseñar cliente" se quedan pegados
        // para siempre aunque el cliente ya haya pagado de verdad.
        const idsPagados = new Set(nuevas.filter(s => s.estado === 'pagado').map(s => s.id));
        const actualizados = prev.map(c => (idsPagados.has(c.id) ? { ...c, pendientePago: false } : c));
        const idsPrev = new Set(prev.map(s => s.id));
        const nuevosComp = nuevas
          .filter(s => (s.estado === 'completado' || s.estado === 'pagado') && !idsPrev.has(s.id))
          .map(s => ({
            id: s.id,
            cliente: s.cliente_nombre,
            servicio: s.tipo,
            zona: s.zona || '—',
            precio: s.precio,
            valoracion: 0,
            fecha: s.fecha,
            pendientePago: s.estado === 'completado',
          }));
        return [...actualizados, ...nuevosComp];
      });
    } catch (e) {}
    finally { setCargando(false); }
  }, [userId, token]);

  useEffect(() => {
    cargarSolicitudes();
    pollingRef.current = setInterval(cargarSolicitudes, 5000);
    return () => clearInterval(pollingRef.current);
  }, [cargarSolicitudes]);

  const compartirUbicacion = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      await axios.put(`${API}/fontaneros/${userId}/ubicacion`, {
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
      }, { headers });
    } catch (e) {}
  }, [userId, token]);

  const ubicacionRef = useRef(null);
  useEffect(() => {
    if (!disponible) { clearInterval(ubicacionRef.current); return; }
    compartirUbicacion();
    ubicacionRef.current = setInterval(compartirUbicacion, 60000);
    return () => clearInterval(ubicacionRef.current);
  }, [disponible, compartirUbicacion]);

  // Mientras el trabajo está "en camino", la ubicación se sigue mandando aunque el
  // profesional cambie de pantalla o bloquee el celular, para que el cliente pueda
  // seguirlo en el mapa como en Uber. Se apaga en cuanto deja de ir en camino
  // (precio enviado, cancelado, etc.) para no gastar batería de más.
  useEffect(() => {
    if (trabajoActivo?.estado === 'en_camino') {
      iniciarSeguimientoUbicacion();
    } else {
      detenerSeguimientoUbicacion();
    }
    return () => { detenerSeguimientoUbicacion(); };
  }, [trabajoActivo?.estado]);

  useEffect(() => { setYaLlegue(false); }, [trabajoActivo?.id]);

  const toggleDisponible = async (valor) => {
    setDisponible(valor);
    try {
      await axios.put(`${API}/fontaneros/${userId}/disponibilidad`, { disponible: valor }, { headers });
    } catch (e) {}
  };

  const toggle24h = async (valor) => {
    setDisponible24h(valor);
    try {
      await axios.put(`${API}/fontaneros/${userId}/disponibilidad`, { disponible, disponible_24h: valor }, { headers });
    } catch (e) {}
  };

  const aceptar = async (trabajo) => {
    try {
      await axios.put(`${API}/servicios/${trabajo.id}/aceptar`, null, { headers });
      setPendientes(prev => prev.filter(t => t.id !== trabajo.id));
      setTrabajoActivo(trabajo);
      setMostrarPrecio(true);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo aceptar la solicitud'));
    }
  };

  const rechazar = async (id) => {
    try {
      await axios.put(`${API}/servicios/${id}/rechazar`, null, { headers });
      setPendientes(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      avisar('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const enviarPrecio = async () => {
    if (!precioFinal || !trabajoActivo) return;
    const precioNum = parseFloat(precioFinal);
    if (isNaN(precioNum) || precioNum <= 0) {
      avisar('Error', 'Introduce un precio válido');
      return;
    }
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/precio`, { precio: precioNum }, { headers });
      setTrabajoActivo({ ...trabajoActivo, estado: 'precio_enviado', precio: precioNum });
      setMostrarPrecio(false);
      setPrecioFinal('');
      avisar('Precio enviado', 'El cliente debe aceptarlo para que puedas ir a hacer el trabajo');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo enviar el precio'));
    }
  };

  const marcarEnCamino = async () => {
    if (!trabajoActivo) return;
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/en-camino`, null, { headers });
      setTrabajoActivo({ ...trabajoActivo, estado: 'en_camino' });
      setYaLlegue(false);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo actualizar el estado'));
    }
  };

  const heLlegado = async () => {
    if (!trabajoActivo) return;
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/llegue`, null, { headers });
      setYaLlegue(true);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo avisar la llegada'));
    }
  };

  const abrirEnMaps = () => {
    if (!trabajoActivo?.latitud_cliente || !trabajoActivo?.longitud_cliente) {
      avisar('Sin ubicación', 'No tenemos la ubicación exacta del cliente para esta solicitud');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${trabajoActivo.latitud_cliente},${trabajoActivo.longitud_cliente}`;
    Linking.openURL(url).catch(() => {});
  };

  const marcarTerminado = () => {
    if (!trabajoActivo) return;
    confirmarAccion('Marcar como terminado', '¿Confirmas que el trabajo ya está terminado? El cliente podrá pagar a partir de ahora.', async () => {
      try {
        await axios.put(`${API}/servicios/${trabajoActivo.id}/completar`, null, { headers });
        setCompletados(prev => [{
          id: trabajoActivo.id,
          cliente: trabajoActivo.cliente_nombre || trabajoActivo.cliente,
          servicio: trabajoActivo.tipo || trabajoActivo.servicio,
          zona: trabajoActivo.zona || '—',
          precio: trabajoActivo.precio,
          valoracion: 0,
          fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
          pendientePago: true,
        }, ...prev]);
        setTrabajoActivo(null);
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo marcar como terminado'));
      }
    }, { textoConfirmar: 'Sí, terminado' });
  };

  const confirmarCobroDirecto = async () => {
    if (!trabajoActivo) return;
    const esBizum = trabajoActivo.metodo_pago === 'bizum';
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/${esBizum ? 'confirmar_bizum' : 'confirmar_efectivo'}`, null, { headers });
      setCompletados(prev => [{
        id: trabajoActivo.id,
        cliente: trabajoActivo.cliente_nombre || trabajoActivo.cliente,
        servicio: trabajoActivo.tipo || trabajoActivo.servicio,
        zona: trabajoActivo.zona || '—',
        precio: trabajoActivo.precio,
        valoracion: 0,
        fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      }, ...prev]);
      setTrabajoActivo(null);
    } catch (e) {
      avisar('Error', `No se pudo confirmar el cobro por ${esBizum ? 'Bizum' : 'efectivo'}`);
    }
  };

  const confirmarReprogramar = async () => {
    if (!trabajoActivo || !horaReprog) return;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diaReprog);
    const [h, m] = horaReprog.split(':').map(Number);
    fecha.setHours(h, m, 0, 0);
    setReprogramando(true);
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/reprogramar`, { fecha: fecha.toISOString() }, { headers });
      setMostrarReprogramar(false);
      avisar('Cita reprogramada', 'Se ha avisado al cliente del nuevo horario');
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo reprogramar la cita'));
    } finally {
      setReprogramando(false);
    }
  };

  const asignarEmpleado = async (empleado) => {
    if (!trabajoActivo) return;
    setAsignando(true);
    try {
      await axios.put(`${API}/servicios/${trabajoActivo.id}/asignar-empleado`, { empleado_fontanero_id: empleado.id }, { headers });
      setMostrarAsignar(false);
      setTrabajoActivo(null);
      avisar('Trabajo asignado', `Se le ha asignado a ${empleado.nombre}`);
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo asignar el trabajo'));
    } finally {
      setAsignando(false);
    }
  };

  const cancelarTrabajo = () => {
    if (!trabajoActivo) return;
    confirmarAccion('Cancelar trabajo', '¿Seguro que quieres cancelar este trabajo?', async () => {
      try {
        await axios.put(`${API}/servicios/${trabajoActivo.id}/cancelar`, null, { headers });
        setTrabajoActivo(null);
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo cancelar el trabajo'));
      }
    }, { textoConfirmar: 'Sí, cancelar', textoCancelar: 'No' });
  };

  const equipoOrdenado = equipo.map(m => ({
    ...m,
    _distancia: trabajoActivo ? distanciaKm(m.latitud, m.longitud, trabajoActivo.latitud_cliente, trabajoActivo.longitud_cliente) : null,
  })).sort((a, b) => {
    if (a.disponible !== b.disponible) return a.disponible ? -1 : 1;
    if (a._distancia == null) return 1;
    if (b._distancia == null) return -1;
    return a._distancia - b._distancia;
  });
  const masCercanoId = equipoOrdenado.find(m => m.disponible && m._distancia != null)?.id;

  return (
    <View style={s.container}>
      <GradientBg />
      {mostrarPrecio && trabajoActivo && (
        <View style={s.modalOverlay}>
          <Glass strong style={s.modal}>
            <View style={s.modalIconWrap}>
              <Ionicons name="construct" size={22} color={colors.accent2} />
            </View>
            <Text style={s.modalTitulo}>Trabajo en curso</Text>
            <Text style={s.modalSub}>Cuando termines, indica el precio final al cliente</Text>
            <Text style={s.modalCliente}>
              {trabajoActivo.cliente_nombre || trabajoActivo.cliente} · {trabajoActivo.tipo || trabajoActivo.servicio}
            </Text>
            <Text style={s.modalSeccion}>Precio del servicio</Text>
            <View style={s.modalInput}>
              <TextInput
                style={s.modalInputText}
                placeholder="0"
                placeholderTextColor="#555"
                value={precioFinal}
                onChangeText={setPrecioFinal}
                keyboardType="numeric"
              />
              <Text style={s.modalEuro}>€</Text>
            </View>
            <Pressable haptic disabled={!precioFinal} onPress={enviarPrecio} style={!precioFinal && s.modalBtnDesactivado}>
              <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtn}>
                <Text style={s.modalBtnText}>Enviar precio al cliente</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text} />
              </LinearGradient>
            </Pressable>
            <TouchableOpacity onPress={() => setMostrarPrecio(false)} style={s.modalCancelar}>
              <Text style={s.modalCancelarText}>Seguir trabajando</Text>
            </TouchableOpacity>
          </Glass>
        </View>
      )}

      {mostrarReprogramar && trabajoActivo && (
        <View style={s.modalOverlay}>
          <Glass strong style={s.modal}>
            <View style={s.modalIconWrap}>
              <Ionicons name="calendar" size={22} color={colors.accent2} />
            </View>
            <Text style={s.modalTitulo}>Reprogramar cita</Text>
            <Text style={s.modalSub}>Elige el nuevo día y hora. Se avisará al cliente al momento.</Text>

            <Text style={s.reprogLabel}>Día</Text>
            <View style={s.reprogDiasWrap}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const f = new Date();
                f.setDate(f.getDate() + i);
                const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][f.getDay()];
                return (
                  <TouchableOpacity key={i} style={[s.reprogDiaBtn, diaReprog === i && s.reprogBtnActivo]}
                    onPress={() => setDiaReprog(i)}>
                    <Text style={[s.reprogDiaBtnText, diaReprog === i && s.reprogBtnTextActivo]}>{etiqueta}</Text>
                    <Text style={[s.reprogDiaBtnNum, diaReprog === i && s.reprogBtnTextActivo]}>{f.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.reprogLabel}>Hora</Text>
            <View style={s.reprogHorasWrap}>
              {HORAS_REPROGRAMAR.map(h => (
                <TouchableOpacity key={h} style={[s.reprogHoraBtn, horaReprog === h && s.reprogBtnActivo]}
                  onPress={() => setHoraReprog(h)}>
                  <Text style={[s.reprogHoraBtnText, horaReprog === h && s.reprogBtnTextActivo]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Pressable haptic disabled={!horaReprog || reprogramando} onPress={confirmarReprogramar} style={(!horaReprog || reprogramando) && s.modalBtnDesactivado}>
              <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.modalBtn, { marginTop: spacing.md }]}>
                <Text style={s.modalBtnText}>Confirmar nuevo horario</Text>
                <Ionicons name="checkmark" size={16} color={colors.text} />
              </LinearGradient>
            </Pressable>
            <TouchableOpacity onPress={() => setMostrarReprogramar(false)} style={s.modalCancelar}>
              <Text style={s.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </Glass>
        </View>
      )}

      {mostrarAsignar && trabajoActivo && (
        <View style={s.modalOverlay}>
          <Glass strong style={s.modal}>
            <View style={s.modalIconWrap}>
              <Ionicons name="people" size={22} color={colors.accent2} />
            </View>
            <Text style={s.modalTitulo}>Asignar a mi equipo</Text>
            <Text style={s.modalSub}>Elige quién de tu equipo se encargará de este trabajo</Text>
            {equipoOrdenado.map(m => (
              <Pressable key={m.id} haptic disabled={asignando} onPress={() => asignarEmpleado(m)} style={s.miembroEquipoRow}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.miembroEquipoNombre}>{m.nombre}</Text>
                    {m.id === masCercanoId && (
                      <View style={s.masCercanoPill}><Text style={s.masCercanoPillText}>Más cercano</Text></View>
                    )}
                  </View>
                  <Text style={s.miembroEquipoSub}>
                    {m.disponible ? '🟢 Disponible' : '⚪ No disponible'}
                    {m._distancia != null ? ` · ${m._distancia < 1 ? `${Math.round(m._distancia * 1000)} m` : `${m._distancia.toFixed(1)} km`}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
            <TouchableOpacity onPress={() => setMostrarAsignar(false)} style={s.modalCancelar}>
              <Text style={s.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </Glass>
        </View>
      )}

      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.saludo}>{getSaludo()} 👋</Text>
            <Text style={s.nombre} numberOfLines={1}>{nombre}</Text>
            <View style={s.metaRow}>
              {perfilPropio?.empresa_nombre && (
                <Pressable haptic onPress={() => navigation.navigate('Equipo')}>
                  <View style={s.teamChip}>
                    <Ionicons name="people" size={12} color={colors.textMuted} />
                    <Text style={s.teamChipText} numberOfLines={1}>{perfilPropio.empresa_nombre}</Text>
                  </View>
                </Pressable>
              )}
              <Text style={s.idText}>ID {userId}</Text>
            </View>
          </View>
          <Pressable haptic onPress={() => navigation.navigate('Notificaciones')}>
            <Glass style={s.iconBtn}>
              <Ionicons name="notifications-outline" size={17} color={colors.text} />
              {pendientes.length > 0 && <View style={s.notifDot} />}
            </Glass>
          </Pressable>
          <Pressable haptic onPress={() => navigation.navigate('PerfilFontanero', { nombre, userId })}>
            <LinearGradient colors={[colors.accent, colors.accent2]} style={s.iconBtn}>
              <Text style={s.perfilLetra}>{nombre[0]}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable haptic onPress={() => confirmarAccion('Cerrar sesión', '¿Seguro que quieres salir?', () => { logout(); navigation.replace('Login'); }, { textoConfirmar: 'Salir' })}>
            <Glass style={[s.iconBtn, s.iconBtnDanger]} colorTint={colors.redGlass}><Ionicons name="log-out-outline" size={17} color={colors.red} /></Glass>
          </Pressable>
        </View>
      </View>

      <Glass style={s.disponibilidadCard}>
        <View style={s.disponibilidadRow}>
          <View style={s.disponibilidadLeft}>
            <View style={[s.indicador, disponible ? s.indicadorVerde : s.indicadorRojo]} />
            <View>
              <Text style={s.disponibilidadTitulo}>{disponible ? 'Visible para clientes' : 'No disponible'}</Text>
              <Text style={s.disponibilidadSub}>{disponible ? 'Estás recibiendo solicitudes' : 'Activa para recibir trabajos'}</Text>
            </View>
          </View>
          <Switch value={disponible} onValueChange={toggleDisponible}
            trackColor={{ false: colors.glassStrong, true: colors.accent }} thumbColor={disponible ? colors.accent2 : colors.textFaint} />
        </View>
        <View style={[s.disponibilidadRow, s.disponibilidadRowDivider]}>
          <View style={s.disponibilidadLeft}>
            <View style={s.disponibilidadIconWrap}>
              <Ionicons name="flash" size={16} color={colors.purple} />
            </View>
            <View>
              <Text style={s.disponibilidadTitulo}>Servicio 24 horas</Text>
              <Text style={s.disponibilidadSub}>{disponible24h ? 'Aceptas urgencias nocturnas' : 'Solo horario normal'}</Text>
            </View>
          </View>
          <Switch value={disponible24h} onValueChange={toggle24h}
            trackColor={{ false: colors.glassStrong, true: colors.purple }} thumbColor={disponible24h ? '#fff' : colors.textFaint} />
        </View>
      </Glass>

      {checklist && checklist.email_verificado === false && (
        <Pressable haptic onPress={() => navigation.navigate('VerificarEmail', { email: usuario?.email, destino: 'PanelFontanero' })}>
          <Glass style={s.cobrosCard} colorTint={colors.amberGlass}>
            <Ionicons name="mail-unread-outline" size={18} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={s.cobrosTitulo}>Verifica tu email</Text>
              <Text style={s.cobrosSub}>No podrás recibir ni aceptar trabajos hasta confirmarlo</Text>
            </View>
            <View style={s.cobrosBtn}>
              <Text style={s.cobrosBtnText}>Verificar</Text>
            </View>
          </Glass>
        </Pressable>
      )}

      {checklist && checklist.porcentaje < 100 && (
        <Pressable haptic onPress={() => navigation.navigate('PerfilFontanero', { nombre, userId })}>
          <Glass style={s.progressRow}>
            <Svg width={34} height={34} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={17} cy={17} r={RADIO_ANILLO_PERFIL} stroke={colors.glassBorder} strokeWidth={3} fill="none" />
              <Circle
                cx={17} cy={17} r={RADIO_ANILLO_PERFIL} stroke={colors.accent} strokeWidth={3} fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUNFERENCIA_ANILLO_PERFIL}
                strokeDashoffset={CIRCUNFERENCIA_ANILLO_PERFIL * (1 - checklist.porcentaje / 100)}
              />
            </Svg>
            <View style={s.progressCopy}>
              <Text style={s.progressTitulo}>Perfil al {checklist.porcentaje}%</Text>
              <Text style={s.progressSub} numberOfLines={1}>
                {checklist.items.filter(i => !i.hecho).slice(0, 2).map(i => i.etiqueta).join(' · ')}
              </Text>
            </View>
            <Text style={s.progressCta}>Completar</Text>
          </Glass>
        </Pressable>
      )}

      <Glass style={s.statsStrip}>
        <View style={s.statItem}>
          <View style={s.statValueRow}>
            <Text style={s.statNum}>{stats?.valoracion_media ?? '—'}</Text>
            <Ionicons name="star" size={13} color={colors.amber} />
          </View>
          <Text style={s.statLabel}>Valoración</Text>
        </View>
        <View style={[s.statItem, s.statItemDivider]}>
          <Text style={s.statNum}>{stats?.trabajos_completados ?? 0}</Text>
          <Text style={s.statLabel}>Trabajos</Text>
        </View>
        <View style={[s.statItem, s.statItemDivider]}>
          <Text style={[s.statNum, s.statNumDinero]}>{stats?.ingresos_totales ?? 0}€</Text>
          <Text style={s.statLabel}>Ganado</Text>
        </View>
      </Glass>

      {comisionPendiente > 0 && (
        <Glass style={s.cobrosCard} colorTint={colors.amberGlass}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={s.cobrosTitulo}>Comisión pendiente: {comisionPendiente}€</Text>
            <Text style={s.cobrosSub}>De trabajos cobrados en efectivo/Bizum, fuera de la app</Text>
            {comisionNumServicios >= comisionLimite - 2 && (
              <Text style={s.cobrosAviso}>
                {comisionNumServicios >= comisionLimite
                  ? `Has llegado a ${comisionNumServicios}/${comisionLimite} trabajos sin liquidar: no podrás aceptar más hasta que pagues.`
                  : `${comisionNumServicios}/${comisionLimite} trabajos sin liquidar. A partir de ${comisionLimite} no podrás aceptar más.`}
              </Text>
            )}
          </View>
          <Pressable style={s.cobrosBtn} haptic onPress={() => setMostrarPagoComision(true)}>
            <Text style={s.cobrosBtnText}>Pagar</Text>
          </Pressable>
        </Glass>
      )}

      {mostrarPagoComision && (
        <View style={s.modalOverlay}>
          <Glass strong style={s.modal}>
            <View style={s.modalIconWrap}>
              <Ionicons name="cash-outline" size={22} color={colors.accent2} />
            </View>
            <Text style={s.modalTitulo}>Pagar comisión pendiente</Text>
            <Text style={s.modalSub}>Total: {comisionPendiente}€</Text>

            {!metodoComisionElegido && (
              <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
                <Pressable haptic onPress={() => elegirMetodoComision('bizum')}>
                  <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtn}>
                    <Text style={s.modalBtnText}>📱 Pagar por Bizum</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={s.metodoComisionBtn} haptic onPress={() => elegirMetodoComision('transferencia')}>
                  <Text style={s.metodoComisionBtnText}>🏦 Pagar por transferencia</Text>
                </Pressable>
              </View>
            )}

            {metodoComisionElegido && (
              <View style={{ width: '100%', marginTop: 8 }}>
                {cargandoInstrucciones ? (
                  <Text style={s.modalSub}>Cargando instrucciones…</Text>
                ) : instruccionesComision ? (
                  <View style={s.instruccionesBox}>
                    {instruccionesComision.instrucciones.map((linea, i) => (
                      <Text key={i} style={s.instruccionesTexto}>{linea}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            <TouchableOpacity onPress={cerrarModalComision} style={s.modalCancelar}>
              <Text style={s.modalCancelarText}>Cerrar</Text>
            </TouchableOpacity>
          </Glass>
        </View>
      )}

      {trabajoActivo && ['aceptado', 'precio_enviado', 'precio_aceptado', 'en_camino', 'pago_pendiente'].includes(trabajoActivo.estado) && (
        <Glass style={s.enCursoCard}>
          <View style={s.enCursoHeader}>
            <View style={s.enCursoTituloRow}>
              <Ionicons name="construct" size={15} color={colors.green} />
              <Text style={s.enCursoTitulo}>Trabajo en curso</Text>
            </View>
            <View style={s.enCursoPill}>
              <Ionicons name={ESTADO_PILL[trabajoActivo.estado]?.icon || 'car-outline'} size={11} color={colors.green} />
              <Text style={s.enCursoPillText}>{ESTADO_PILL[trabajoActivo.estado]?.label}</Text>
            </View>
          </View>
          <Text style={s.enCursoCliente}>{trabajoActivo.cliente_nombre} · {trabajoActivo.tipo}</Text>
          {trabajoActivo.estado === 'aceptado' && (
            <Pressable haptic onPress={() => setMostrarPrecio(true)}>
              <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.enCursoBtn}>
                <Text style={s.enCursoBtnText}>Enviar precio al cliente</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.text} />
              </LinearGradient>
            </Pressable>
          )}
          {trabajoActivo.estado === 'aceptado' && equipo.length > 0 && (
            <Pressable style={s.enCursoChatBtn} haptic onPress={() => setMostrarAsignar(true)}>
              <Ionicons name="people-outline" size={15} color={colors.textMuted} />
              <Text style={s.enCursoChatText}>Asignar a mi equipo</Text>
            </Pressable>
          )}
          {trabajoActivo.estado === 'precio_aceptado' && (
            <Pressable style={s.enCaminoBtn} haptic onPress={marcarEnCamino}>
              <Ionicons name="car-sport" size={16} color={colors.blue} />
              <Text style={s.enCaminoBtnText}>Voy en camino</Text>
            </Pressable>
          )}
          {trabajoActivo.estado === 'en_camino' && (
            <View style={s.enCaminoBanner}>
              <View style={s.enCaminoBannerHeader}>
                <Ionicons name="navigate" size={16} color={colors.green} />
                <Text style={s.enCaminoBannerTitulo}>
                  {trabajoActivo.eta_minutos ? `Llegas en ~${trabajoActivo.eta_minutos} min` : 'Vas en camino'}
                </Text>
              </View>
              <View style={s.enCaminoBannerRow}>
                <Pressable
                  style={[s.enCaminoBannerBtn, yaLlegue && s.enCaminoBannerBtnHecho]}
                  haptic
                  onPress={heLlegado}
                  disabled={yaLlegue}
                >
                  <Ionicons name={yaLlegue ? 'checkmark-circle' : 'flag'} size={15} color={yaLlegue ? colors.green : colors.text} />
                  <Text style={[s.enCaminoBannerBtnText, yaLlegue && { color: colors.green }]}>
                    {yaLlegue ? 'Avisado' : 'He llegado'}
                  </Text>
                </Pressable>
                <Pressable style={s.enCaminoBannerBtn} haptic onPress={abrirEnMaps}>
                  <Ionicons name="map" size={15} color={colors.text} />
                  <Text style={s.enCaminoBannerBtnText}>Abrir ruta</Text>
                </Pressable>
              </View>
            </View>
          )}
          {(trabajoActivo.estado === 'precio_aceptado' || trabajoActivo.estado === 'en_camino') && (
            <Pressable haptic onPress={marcarTerminado}>
              <LinearGradient colors={[colors.green, colors.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.enCursoBtn}>
                <Text style={s.enCursoBtnText}>Marcar trabajo terminado</Text>
                <Ionicons name="checkmark-done" size={15} color={colors.text} />
              </LinearGradient>
            </Pressable>
          )}
          {trabajoActivo.estado === 'pago_pendiente' && (
            <Pressable haptic onPress={confirmarCobroDirecto}>
              <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.enCursoBtn}>
                <Text style={s.enCursoBtnText}>
                  {trabajoActivo.metodo_pago === 'bizum' ? 'Confirmar Bizum recibido' : 'Confirmar cobro en efectivo'}
                </Text>
                <Ionicons name={trabajoActivo.metodo_pago === 'bizum' ? 'phone-portrait' : 'cash'} size={15} color={colors.text} />
              </LinearGradient>
            </Pressable>
          )}
          <Pressable style={s.enCursoChatBtn} haptic onPress={() => navigation.navigate('Chat', { servicioId: trabajoActivo.id, otroNombre: trabajoActivo.cliente_nombre || 'Cliente' })}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.textMuted} />
            <Text style={s.enCursoChatText}>Chat con cliente</Text>
          </Pressable>
          {ESTADOS_REPROGRAMABLES.has(trabajoActivo.estado) && (
            <Pressable style={s.enCursoChatBtn} haptic onPress={() => { setDiaReprog(0); setHoraReprog(null); setMostrarReprogramar(true); }}>
              <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
              <Text style={s.enCursoChatText}>Reprogramar cita</Text>
            </Pressable>
          )}
          <Pressable style={s.enCursoCancelarBtn} haptic onPress={cancelarTrabajo}>
            <Text style={s.enCursoCancelarText}>Cancelar trabajo</Text>
          </Pressable>
        </Glass>
      )}

      <View style={s.tabs}>
        <Pressable haptic onPress={() => setTab('pendientes')} style={{ flex: 1 }}>
          <Glass style={[s.tab, tab === 'pendientes' && s.tabActivo]}>
            <Text style={[s.tabText, tab === 'pendientes' && s.tabTextActivo]}>Pendientes</Text>
            {pendientes.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{pendientes.length}</Text></View>}
          </Glass>
        </Pressable>
        <Pressable haptic onPress={() => setTab('completados')} style={{ flex: 1 }}>
          <Glass style={[s.tab, tab === 'completados' && s.tabActivo]}>
            <Text style={[s.tabText, tab === 'completados' && s.tabTextActivo]}>Completados</Text>
          </Glass>
        </Pressable>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === 'pendientes' ? (
          cargando ? (
            <View style={s.vacio}>
              <Text style={s.vacioTitulo}>Cargando...</Text>
            </View>
          ) : pendientes.length === 0 ? (
            <View style={s.vacio}>
              <View style={s.vacioIconWrap}>
                <Ionicons name="checkmark-done" size={24} color={colors.green} />
              </View>
              <Text style={s.vacioTitulo}>Al día</Text>
              <Text style={s.vacioSub}>No tienes solicitudes pendientes</Text>
            </View>
          ) : (
            pendientes.map((t, i) => (
              <FadeInUp key={t.id} index={i}>
                <Glass style={[s.trabajoCard, t.urgente && s.trabajoCardUrgente]}>
                  <View style={s.trabajoFlagRow}>
                    <View style={s.trabajoFlagDot} />
                    <Text style={s.trabajoFlagText}>Nueva solicitud</Text>
                  </View>
                  <View style={s.trabajoHeader}>
                    <LinearGradient colors={[colors.accent, colors.accent2]} style={s.avatar}>
                      <Text style={s.avatarText}>{(t.cliente_nombre || t.cliente || '?')[0]}</Text>
                    </LinearGradient>
                    <View style={s.trabajoInfo}>
                      <Text style={s.trabajoCliente}>{t.cliente_nombre || t.cliente}</Text>
                      <View style={s.trabajoZonaRow}>
                        <Ionicons name="location" size={11} color={colors.textMuted} />
                        <Text style={s.trabajoZona}>{t.zona || '—'}</Text>
                        {t.urgente && (
                          <>
                            <Text style={s.cardStatDot}>·</Text>
                            <Text style={s.trabajoZona}>Ahora</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {t.urgente && (
                      <View style={s.urgenteBadge}>
                        <Ionicons name="flash" size={11} color={colors.red} />
                        <Text style={s.urgenteText}>URGENTE</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.trabajoDetalle}>
                    <View style={s.servicioRow}>
                      <Ionicons name="construct-outline" size={14} color={colors.textMuted} />
                      <Text style={s.trabajoServicio}>{t.tipo || t.servicio}</Text>
                    </View>
                    {t.descripcion ? <Text style={s.descripcion}>{t.descripcion}</Text> : null}
                  </View>
                  <View style={s.botonesRow}>
                    <Pressable style={s.btnRechazar} haptic onPress={() => rechazar(t.id)}>
                      <Ionicons name="close" size={16} color={colors.red} />
                      <Text style={s.btnRechazarText}>Rechazar</Text>
                    </Pressable>
                    <Pressable style={s.btnAceptar} haptic onPress={() => aceptar(t)}>
                      <Ionicons name="checkmark" size={16} color={colors.green} />
                      <Text style={s.btnAceptarText}>Aceptar</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={s.btnChat}
                    haptic
                    onPress={() => navigation.navigate('Chat', { servicioId: t.id, otroNombre: t.cliente_nombre || t.cliente || 'Cliente' })}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color={colors.blue} />
                    <Text style={s.btnChatText}>Chatear con el cliente</Text>
                  </Pressable>
                </Glass>
              </FadeInUp>
            ))
          )
        ) : (
          completados.length === 0 ? (
            <View style={s.vacio}>
              <View style={s.vacioIconWrap}>
                <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={s.vacioTitulo}>Sin trabajos completados</Text>
              <Text style={s.vacioSub}>Aquí aparecerán tus trabajos finalizados</Text>
            </View>
          ) : (
            completados.map((t, i) => (
              <FadeInUp key={t.id} index={i}>
                <Glass style={s.completadoCard}>
                  <View style={s.trabajoHeader}>
                    <View style={s.avatarCompletado}>
                      <Text style={s.avatarText}>{(t.cliente_nombre || t.cliente || '?')[0]}</Text>
                    </View>
                    <View style={s.trabajoInfo}>
                      <Text style={s.trabajoCliente}>{t.cliente_nombre || t.cliente}</Text>
                      <View style={s.trabajoZonaRow}>
                        <Ionicons name="location" size={11} color={colors.textMuted} />
                        <Text style={s.trabajoZona}>{t.zona || '—'}</Text>
                        <Text style={s.cardStatDot}>·</Text>
                        <Text style={s.trabajoZona}>{t.fecha}</Text>
                      </View>
                    </View>
                    <Text style={s.completadoPrecio}>+{t.precio}€</Text>
                  </View>
                  <View style={s.valoracionRow}>
                    <Text style={s.trabajoServicio}>{t.tipo || t.servicio}</Text>
                    {t.pendientePago && (
                      <View style={s.pendienteBadge}>
                        <Ionicons name="hourglass-outline" size={10} color={colors.blue} />
                        <Text style={s.pendienteText}>Pendiente pago</Text>
                      </View>
                    )}
                    <View style={s.estrellasRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Ionicons key={i} name={i <= (t.valoracion || 0) ? 'star' : 'star-outline'} size={12} color={colors.amber} />
                      ))}
                    </View>
                  </View>
                  {!t.pendientePago && (
                    <Pressable
                      style={s.btnResenarCliente}
                      haptic
                      onPress={() => navigation.navigate('ResenaCliente', { cliente: { nombre: t.cliente_nombre || t.cliente }, servicioId: t.id })}
                    >
                      <Ionicons name="star-outline" size={13} color={colors.accent2} />
                      <Text style={s.btnResenarClienteText}>Reseñar cliente</Text>
                    </Pressable>
                  )}
                </Glass>
              </FadeInUp>
            ))
          )
        )}
      </ScrollView>

      <View style={s.tabBar}>
        <View style={s.tabBarItem}>
          <View style={s.tabBarIconWrapActivo}>
            <Ionicons name="home" size={20} color={colors.text} />
          </View>
          <Text style={s.tabBarLabelActivo}>Inicio</Text>
        </View>
        <Pressable haptic style={s.tabBarItem} onPress={() => navigation.navigate('Calendario', { userId })}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={s.tabBarLabel}>Agenda</Text>
        </Pressable>
        <Pressable haptic style={s.tabBarItem} onPress={() => navigation.navigate('Ofertas')}>
          <Ionicons name="briefcase-outline" size={20} color={colors.textMuted} />
          <Text style={s.tabBarLabel}>Mercado</Text>
        </Pressable>
        <Pressable haptic style={s.tabBarItem} onPress={() => navigation.navigate('ChatsRecientes')}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.textMuted} />
          <Text style={s.tabBarLabel}>Chats</Text>
        </Pressable>
        <Pressable haptic style={s.tabBarItem} onPress={() => navigation.navigate('Estadisticas', { userId })}>
          <Ionicons name="stats-chart-outline" size={20} color={colors.textMuted} />
          <Text style={s.tabBarLabel}>Estadísticas</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  enCursoCard: { backgroundColor: colors.greenLight, borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  enCursoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  enCursoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  enCursoTitulo: { color: colors.green, fontWeight: 'bold', fontSize: 15 },
  enCursoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,140,0.12)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  enCursoPillText: { color: colors.green, fontSize: 11, fontWeight: '600' },
  enCursoCliente: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  enCursoBtn: { flexDirection: 'row', gap: 6, backgroundColor: colors.blue, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, ...shadow.glow(colors.blue) },
  enCursoBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  enCursoChatBtn: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgCard2, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  enCursoChatText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  enCursoCancelarBtn: { marginTop: spacing.sm, alignItems: 'center', paddingVertical: 6 },
  enCursoCancelarText: { color: colors.red, fontSize: 12.5, fontWeight: '600' },
  enCaminoBtn: { flexDirection: 'row', gap: 6, backgroundColor: colors.blueLight, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.blue },
  enCaminoBtnText: { color: colors.blue, fontWeight: '700', fontSize: 14 },
  enCaminoBanner: { backgroundColor: 'rgba(0,196,140,0.10)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.green, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  enCaminoBannerHeader: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  enCaminoBannerTitulo: { color: colors.green, fontSize: 15, fontWeight: '800' },
  enCaminoBannerRow: { flexDirection: 'row', gap: 8 },
  enCaminoBannerBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md, paddingVertical: 9, borderWidth: 1, borderColor: colors.border2 },
  enCaminoBannerBtnHecho: { backgroundColor: colors.greenLight, borderColor: colors.green },
  enCaminoBannerBtnText: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, margin: spacing.xl, width: '90%', ...shadow.lg },
  modalIconWrap: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.blueLight, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md },
  modalTitulo: { color: colors.text, ...type.h2, marginBottom: spacing.sm, textAlign: 'center' },
  modalSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
  modalCliente: { color: colors.blue, fontSize: 13, textAlign: 'center', marginBottom: spacing.lg, fontWeight: '600' },
  modalSeccion: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  modalInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  modalInputText: { flex: 1, color: colors.text, paddingVertical: spacing.md, fontSize: 26, fontWeight: 'bold' },
  modalEuro: { color: colors.green, fontSize: 24, fontWeight: 'bold' },
  modalBtn: { flexDirection: 'row', gap: 6, backgroundColor: colors.blue, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', ...shadow.glow(colors.blue) },
  modalBtnDesactivado: { opacity: 0.4 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalCancelar: { marginTop: spacing.md, alignItems: 'center' },
  modalCancelarText: { color: colors.textMuted, fontSize: 14 },
  reprogLabel: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: spacing.sm },
  reprogDiasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
  reprogDiaBtn: { backgroundColor: colors.bgCard2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border2, minWidth: 50 },
  reprogDiaBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  reprogDiaBtnNum: { color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  reprogHorasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reprogHoraBtn: { backgroundColor: colors.bgCard2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2 },
  reprogHoraBtnText: { color: colors.textMuted, fontSize: 13 },
  reprogBtnActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  reprogBtnTextActivo: { color: colors.text },
  miembroEquipoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border2 },
  miembroEquipoNombre: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  miembroEquipoSub: { color: colors.textMuted, fontSize: 12 },
  masCercanoPill: { backgroundColor: colors.greenGlass, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.green },
  masCercanoPillText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  header: { paddingHorizontal: spacing.xl, paddingTop: 50, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4, maxWidth: 160 },
  teamChipText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600' },
  iconBtn: { width: 38, height: 38, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iconBtnDanger: { backgroundColor: colors.redLight },
  notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.bg },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, paddingBottom: 26, paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  tabBarItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabBarIconWrapActivo: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 1 },
  tabBarLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  tabBarLabelActivo: { color: colors.text, fontSize: 11, fontWeight: '700' },
  saludo: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  nombre: { color: colors.text, ...type.h1 },
  idText: { color: colors.textFaint, fontSize: 11.5, fontWeight: '600' },
  perfilLetra: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  disponibilidadCard: { backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm },
  disponibilidadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  disponibilidadRowDivider: { borderTopWidth: 1, borderTopColor: colors.glassBorder },
  disponibilidadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disponibilidadIconWrap: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  indicador: { width: 10, height: 10, borderRadius: 5 },
  indicadorVerde: { backgroundColor: colors.green },
  indicadorRojo: { backgroundColor: colors.red },
  disponibilidadTitulo: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  disponibilidadSub: { color: colors.textMuted, fontSize: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  progressCopy: { flex: 1 },
  progressTitulo: { color: colors.text, fontWeight: '700', fontSize: 13.5 },
  progressSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  progressCta: { color: colors.accent, fontWeight: '700', fontSize: 12.5 },
  statsStrip: { flexDirection: 'row', marginHorizontal: spacing.xl, borderRadius: radius.lg, marginVertical: spacing.lg, overflow: 'hidden', ...shadow.sm },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 3 },
  statItemDivider: { borderLeftWidth: 1, borderLeftColor: colors.glassBorder },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statNumDinero: { color: colors.green },
  cobrosCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, marginHorizontal: spacing.xl },
  cobrosTitulo: { color: colors.text, fontWeight: '700', fontSize: 13 },
  cobrosSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  cobrosBtn: { backgroundColor: colors.glass, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cobrosBtnText: { color: colors.accent2, fontWeight: '700', fontSize: 12 },
  cobrosAviso: { color: colors.amber, fontSize: 11, fontWeight: '700', marginTop: 4 },
  metodoComisionBtn: { borderWidth: 1.5, borderColor: colors.border2, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  metodoComisionBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  instruccionesBox: { backgroundColor: colors.bgCard2, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  instruccionesTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  statNum: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, marginBottom: spacing.md, gap: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bgCard, gap: 6 },
  tabActivo: { backgroundColor: colors.blueLight },
  tabText: { color: colors.textMuted, fontWeight: '500', fontSize: 14 },
  tabTextActivo: { color: colors.blue, fontWeight: '700' },
  badge: { backgroundColor: colors.red, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  lista: { flex: 1, paddingHorizontal: spacing.xl },
  vacio: { alignItems: 'center', paddingTop: 36 },
  vacioIconWrap: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.greenGlass, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  vacioTitulo: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  vacioSub: { color: colors.textMuted, fontSize: 13.5 },
  trabajoCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadow.md },
  trabajoCardUrgente: { borderWidth: 1, borderColor: colors.red },
  trabajoFlagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  trabajoFlagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  trabajoFlagText: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  trabajoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarCompletado: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blueLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  trabajoInfo: { flex: 1 },
  trabajoCliente: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  trabajoZonaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trabajoZona: { color: colors.textMuted, fontSize: 12 },
  cardStatDot: { color: colors.textFaint, fontSize: 12 },
  urgenteBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.redLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  urgenteText: { color: colors.red, fontSize: 10, fontWeight: 'bold' },
  trabajoDetalle: { paddingVertical: spacing.sm, marginBottom: spacing.md },
  servicioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trabajoServicio: { color: colors.textMuted, fontSize: 13 },
  descripcion: { color: colors.textFaint, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  botonesRow: { flexDirection: 'row', gap: spacing.md },
  btnChat: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, backgroundColor: colors.blueLight, borderRadius: radius.md, padding: 11, alignItems: 'center', justifyContent: 'center' },
  btnChatText: { color: colors.blue, fontWeight: '600', fontSize: 13 },
  btnRechazar: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: colors.redLight, borderRadius: radius.md, padding: 13, alignItems: 'center', justifyContent: 'center' },
  btnRechazarText: { color: colors.red, fontWeight: 'bold', fontSize: 14 },
  btnAceptar: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: colors.greenLight, borderRadius: radius.md, padding: 13, alignItems: 'center', justifyContent: 'center' },
  btnAceptarText: { color: colors.green, fontWeight: 'bold', fontSize: 14 },
  completadoCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadow.md },
  btnResenarCliente: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: spacing.sm },
  btnResenarClienteText: { color: colors.accent2, fontSize: 12, fontWeight: '600' },
  completadoPrecio: { color: colors.green, fontWeight: 'bold', fontSize: 15 },
  valoracionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 0.5, borderTopColor: colors.border },
  pendienteBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.blueLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  pendienteText: { color: colors.blue, fontSize: 11, fontWeight: '600' },
  estrellasRow: { flexDirection: 'row', gap: 1 },
});
