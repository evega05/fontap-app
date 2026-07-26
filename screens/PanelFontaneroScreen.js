import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
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

function getSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

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
  const [cargando, setCargando] = useState(true);
  const [stats, setStats] = useState(null);
  const [stripeEstado, setStripeEstado] = useState(null);
  const [comisionPendiente, setComisionPendiente] = useState(0);
  const [comisionNumServicios, setComisionNumServicios] = useState(0);
  const [comisionLimite, setComisionLimite] = useState(10);
  const [conectandoStripe, setConectandoStripe] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [pagandoComision, setPagandoComision] = useState(false);
  const [mostrarPagoComision, setMostrarPagoComision] = useState(false);
  const [metodoComisionElegido, setMetodoComisionElegido] = useState(null);
  const [instruccionesComision, setInstruccionesComision] = useState(null);
  const [cargandoInstrucciones, setCargandoInstrucciones] = useState(false);

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
      const [resEstado, resComision] = await Promise.all([
        axios.get(`${API}/fontaneros/${userId}/stripe/estado`, { headers }),
        axios.get(`${API}/fontaneros/${userId}/comision-pendiente`, { headers }),
      ]);
      setStripeEstado(resEstado.data);
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

  const conectarStripe = async () => {
    setConectandoStripe(true);
    try {
      const res = await axios.post(`${API}/fontaneros/${userId}/stripe/conectar`, {}, { headers });
      await WebBrowser.openBrowserAsync(res.data.onboarding_url);
      cargarCobros();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo conectar con Stripe'));
    } finally {
      setConectandoStripe(false);
    }
  };

  const pagarComisionPendiente = async () => {
    setPagandoComision(true);
    try {
      const res = await axios.post(`${API}/fontaneros/${userId}/comision-pendiente/pagar`, {}, { headers });
      await WebBrowser.openBrowserAsync(res.data.checkout_url);
      const verif = await axios.post(`${API}/fontaneros/${userId}/comision-pendiente/verificar`, {}, { headers });
      if (verif.data.liquidada) {
        setComisionPendiente(0);
        avisar('Listo', 'Comisión pendiente liquidada');
      }
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo procesar el pago'));
    } finally {
      setPagandoComision(false);
    }
  };

  const cerrarModalComision = () => {
    setMostrarPagoComision(false);
    setMetodoComisionElegido(null);
    setInstruccionesComision(null);
  };

  const elegirMetodoComision = async (metodo) => {
    if (metodo === 'tarjeta') {
      cerrarModalComision();
      pagarComisionPendiente();
      return;
    }
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
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo actualizar el estado'));
    }
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

      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.saludo}>{getSaludo()} 👋</Text>
            <Text style={s.nombre} numberOfLines={1}>{nombre}</Text>
            <Text style={s.idText}>ID: {userId}</Text>
          </View>
          <Pressable haptic onPress={() => navigation.navigate('PerfilFontanero', { nombre, userId })}>
            <LinearGradient colors={[colors.accent, colors.accent2]} style={s.perfilBtn}>
              <Text style={s.perfilLetra}>{nombre[0]}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable haptic onPress={() => confirmarAccion('Cerrar sesión', '¿Seguro que quieres salir?', () => { logout(); navigation.replace('Login'); }, { textoConfirmar: 'Salir' })}>
            <Glass style={s.logoutBtn} colorTint={colors.redGlass}><Ionicons name="log-out-outline" size={18} color={colors.red} /></Glass>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>
          <Pressable haptic onPress={() => navigation.navigate('Notificaciones')}>
            <Glass style={s.iconBtn}><Ionicons name="notifications-outline" size={18} color={colors.text} /></Glass>
          </Pressable>
          <Pressable haptic onPress={() => navigation.navigate('Calendario', { userId })}>
            <Glass style={s.iconBtn}><Ionicons name="calendar-outline" size={18} color={colors.text} /></Glass>
          </Pressable>
          <Pressable haptic onPress={() => navigation.navigate('Ofertas')}>
            <Glass style={s.iconBtn}><Ionicons name="briefcase-outline" size={18} color={colors.text} /></Glass>
          </Pressable>
          <Pressable haptic onPress={() => navigation.navigate('ChatsRecientes')}>
            <Glass style={s.iconBtn}><Ionicons name="chatbubbles-outline" size={18} color={colors.text} /></Glass>
          </Pressable>
          <Pressable haptic onPress={() => navigation.navigate('Estadisticas', { userId })}>
            <Glass style={s.iconBtn}><Ionicons name="stats-chart-outline" size={18} color={colors.text} /></Glass>
          </Pressable>
        </ScrollView>
      </View>

      <Glass style={s.disponibilidadCard}>
        <View style={s.disponibilidadLeft}>
          <View style={[s.indicador, disponible ? s.indicadorVerde : s.indicadorRojo]} />
          <View>
            <Text style={s.disponibilidadTitulo}>{disponible ? 'Visible para clientes' : 'No disponible'}</Text>
            <Text style={s.disponibilidadSub}>{disponible ? 'Estás recibiendo solicitudes' : 'Activa para recibir trabajos'}</Text>
          </View>
        </View>
        <Switch value={disponible} onValueChange={toggleDisponible}
          trackColor={{ false: colors.glassStrong, true: colors.accent }} thumbColor={disponible ? colors.accent2 : colors.textFaint} />
      </Glass>

      <Glass style={[s.disponibilidadCard, { marginTop: -4 }]}>
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
          <Glass style={s.checklistCard}>
            <View style={s.checklistHeader}>
              <Text style={s.checklistTitulo}>Completa tu perfil</Text>
              <Text style={s.checklistPct}>{checklist.porcentaje}%</Text>
            </View>
            <View style={s.checklistBarraFondo}>
              <View style={[s.checklistBarraRelleno, { width: `${checklist.porcentaje}%` }]} />
            </View>
            <Text style={s.checklistSub}>
              {checklist.items.filter(i => !i.hecho).slice(0, 2).map(i => i.etiqueta).join(' · ')}
            </Text>
          </Glass>
        </Pressable>
      )}

      <View style={s.statsRow}>
        <Glass style={s.statCard}>
          <Ionicons name="star" size={18} color={colors.amber} />
          <Text style={s.statNum}>{stats?.valoracion_media ?? '—'}</Text>
          <Text style={s.statLabel}>Valoración</Text>
        </Glass>
        <Glass style={s.statCard}>
          <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          <Text style={s.statNum}>{stats?.trabajos_completados ?? 0}</Text>
          <Text style={s.statLabel}>Trabajos</Text>
        </Glass>
        <Glass style={s.statCard}>
          <Ionicons name="cash" size={18} color={colors.accent2} />
          <Text style={s.statNum}>{stats?.ingresos_totales ?? 0}€</Text>
          <Text style={s.statLabel}>Total ganado</Text>
        </Glass>
      </View>

      {stripeEstado && !stripeEstado.cobros_activos && (
        <Glass style={s.cobrosCard}>
          <Ionicons name="card-outline" size={18} color={colors.accent2} />
          <View style={{ flex: 1 }}>
            <Text style={s.cobrosTitulo}>Cobra directo a tu cuenta</Text>
            <Text style={s.cobrosSub}>Conecta tu cuenta bancaria para recibir los pagos con tarjeta automáticamente</Text>
          </View>
          <Pressable style={s.cobrosBtn} haptic onPress={conectarStripe} disabled={conectandoStripe}>
            <Text style={s.cobrosBtnText}>{conectandoStripe ? '...' : 'Conectar'}</Text>
          </Pressable>
        </Glass>
      )}

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
          <Pressable style={s.cobrosBtn} haptic onPress={() => setMostrarPagoComision(true)} disabled={pagandoComision}>
            <Text style={s.cobrosBtnText}>{pagandoComision ? '...' : 'Pagar'}</Text>
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
                <Pressable haptic onPress={() => elegirMetodoComision('tarjeta')}>
                  <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtn}>
                    <Text style={s.modalBtnText}>💳 Pagar con tarjeta</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={s.metodoComisionBtn} haptic onPress={() => elegirMetodoComision('bizum')}>
                  <Text style={s.metodoComisionBtnText}>📱 Pagar por Bizum</Text>
                </Pressable>
                <Pressable style={s.metodoComisionBtn} haptic onPress={() => elegirMetodoComision('transferencia')}>
                  <Text style={s.metodoComisionBtnText}>🏦 Pagar por transferencia</Text>
                </Pressable>
              </View>
            )}

            {metodoComisionElegido && metodoComisionElegido !== 'tarjeta' && (
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
          {trabajoActivo.estado === 'precio_aceptado' && (
            <Pressable style={s.enCaminoBtn} haptic onPress={marcarEnCamino}>
              <Ionicons name="car-sport" size={16} color={colors.blue} />
              <Text style={s.enCaminoBtnText}>Voy en camino</Text>
            </Pressable>
          )}
          {trabajoActivo.estado === 'en_camino' && (
            <View style={s.enCaminoActivo}>
              <Ionicons name="navigate" size={15} color={colors.green} />
              <Text style={s.enCaminoActivoText}>Marcado en camino · el cliente puede seguirte</Text>
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

      <ScrollView style={s.lista} contentContainerStyle={{ paddingBottom: 30 }}>
        {tab === 'pendientes' ? (
          cargando ? (
            <View style={s.vacio}>
              <Text style={s.vacioTitulo}>Cargando...</Text>
            </View>
          ) : pendientes.length === 0 ? (
            <View style={s.vacio}>
              <View style={s.vacioIconWrap}>
                <Ionicons name="checkmark-done" size={36} color={colors.green} />
              </View>
              <Text style={s.vacioTitulo}>¡Al día!</Text>
              <Text style={s.vacioSub}>No tienes solicitudes pendientes</Text>
            </View>
          ) : (
            pendientes.map((t, i) => (
              <FadeInUp key={t.id} index={i}>
                <Glass style={s.trabajoCard}>
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
  enCaminoActivo: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, paddingVertical: 8 },
  enCaminoActivoText: { color: colors.green, fontSize: 12.5, fontWeight: '600' },
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
  header: { paddingHorizontal: spacing.xl, paddingTop: 50, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.xl },
  iconBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', ...shadow.sm },
  saludo: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  nombre: { color: colors.text, ...type.h1 },
  idText: { color: colors.blue, fontSize: 11, marginTop: 2 },
  perfilBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', ...shadow.glow(colors.blue) },
  perfilLetra: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  logoutBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.redLight, justifyContent: 'center', alignItems: 'center' },
  disponibilidadCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.sm },
  disponibilidadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disponibilidadIconWrap: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  indicador: { width: 10, height: 10, borderRadius: 5 },
  indicadorVerde: { backgroundColor: colors.green },
  indicadorRojo: { backgroundColor: colors.red },
  disponibilidadTitulo: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  disponibilidadSub: { color: colors.textMuted, fontSize: 12 },
  checklistCard: { backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.sm },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistTitulo: { color: colors.text, fontWeight: '600', fontSize: 14 },
  checklistPct: { color: colors.accent2, fontWeight: '700', fontSize: 14 },
  checklistBarraFondo: { height: 6, borderRadius: 3, backgroundColor: colors.glassStrong, overflow: 'hidden', marginBottom: 8 },
  checklistBarraRelleno: { height: 6, borderRadius: 3, backgroundColor: colors.accent2 },
  checklistSub: { color: colors.textMuted, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginVertical: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 6, ...shadow.sm },
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
  vacio: { alignItems: 'center', paddingTop: 50 },
  vacioIconWrap: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadow.sm },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: spacing.sm },
  vacioSub: { color: colors.textMuted, fontSize: 14 },
  trabajoCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadow.md },
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
