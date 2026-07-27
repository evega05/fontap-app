import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Switch, Modal } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';
import { GREMIOS } from '../gremios';

const API = 'https://fontap-backend-production.up.railway.app';

// ── utilidades de fecha (sin librerías externas) ──
function pad(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISODate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseISODate(s); d.setDate(d.getDate() + n); return toISODate(d); }
function todayISO() { return toISODate(new Date()); }
function longLabel(s) {
  const d = parseISODate(s);
  const t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function weekDaysOf(s) {
  const d = parseISODate(s);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return toISODate(x); });
}
function dayLabel(s) {
  const d = parseISODate(s);
  const t = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function dayNum(s) { return parseISODate(s).getDate(); }
function monthKey(s) { return s.slice(0, 7); }
function fmt(n) { return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const TABS = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'clientes', label: 'Clientes' },
  { valor: 'obras', label: 'Obras' },
  { valor: 'presupuestos', label: 'Presup.' },
  { valor: 'equipo', label: 'Equipo' },
];

const FRECUENCIAS_PRESUPUESTO = ['Borrador', 'Enviado', 'Aceptado', 'Rechazado'];
const UNIDADES = ['ud', 'm²', 'm', 'h', 'global'];
const TIPO_PAGO_LABEL = { hora: '€ / hora', dia: '€ / día', fijo: '€ / mes' };

export default function PanelGestionScreen({ navigation }) {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState('hoy');
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState({ leads_nuevos: 0, empleados_sin_pagar: 0, obras_con_pendientes: 0 });

  // Hoy
  const [fecha, setFecha] = useState(todayISO());
  const [visitas, setVisitas] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [mostrarAdd, setMostrarAdd] = useState(false);
  const [addPaso, setAddPaso] = useState(null);
  const [addForm, setAddForm] = useState({});
  const [enviandoAdd, setEnviandoAdd] = useState(false);

  // Clientes / leads
  const [subTabClientes, setSubTabClientes] = useState('clientes');
  const [clientes, setClientes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [clienteForm, setClienteForm] = useState({});
  const [mostrarLead, setMostrarLead] = useState(false);
  const [leadForm, setLeadForm] = useState({});

  // Obras
  const [obras, setObras] = useState([]);
  const [mostrarObra, setMostrarObra] = useState(false);
  const [obraEditando, setObraEditando] = useState(null);
  const [obraForm, setObraForm] = useState({});
  const [obraAbiertaId, setObraAbiertaId] = useState(null);
  const [itemForm, setItemForm] = useState({});
  const [asignForm, setAsignForm] = useState({});

  // Presupuestos
  const [presupuestos, setPresupuestos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(null); // null | 'new' | presupuesto obj
  const [presForm, setPresForm] = useState({});
  const [presLineasNuevas, setPresLineasNuevas] = useState([]);
  const [lineaForm, setLineaForm] = useState({ concepto: '', gremio: '', cantidad: '1', unidad: 'ud', precio_unitario: '' });

  // Equipo
  const [empleados, setEmpleados] = useState([]);
  const [mostrarEmpleado, setMostrarEmpleado] = useState(false);
  const [empleadoForm, setEmpleadoForm] = useState({ tipo_pago: 'hora' });
  const [empleadoAbiertoId, setEmpleadoAbiertoId] = useState(null);
  const [semanaFecha, setSemanaFecha] = useState(todayISO());
  const [jornadasEmpleado, setJornadasEmpleado] = useState([]);
  const [pagosEmpleado, setPagosEmpleado] = useState([]);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [pagoForm, setPagoForm] = useState({});
  const [ofertasEmpleoGestion, setOfertasEmpleoGestion] = useState([]);
  const [mostrarOfertaEmpleo, setMostrarOfertaEmpleo] = useState(false);
  const [ofertaEmpleoForm, setOfertaEmpleoForm] = useState({ tipo_pago: 'servicio' });
  const [postulantesOfertaId, setPostulantesOfertaId] = useState(null);
  const [postulantesOferta, setPostulantesOferta] = useState([]);

  const cargarResumen = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gestion/resumen`, { headers });
      setResumen(res.data);
    } catch (e) {}
  }, [token]);

  const cargarHoy = useCallback(async () => {
    try {
      const [rv, rc, rt] = await Promise.all([
        axios.get(`${API}/gestion/visitas`, { headers, params: { fecha } }),
        axios.get(`${API}/gestion/cobros`, { headers, params: { fecha } }),
        axios.get(`${API}/gestion/tareas`, { headers, params: { fecha } }),
      ]);
      setVisitas(rv.data || []);
      setCobros(rc.data || []);
      setTareas(rt.data || []);
    } catch (e) {}
  }, [token, fecha]);

  const cargarClientes = useCallback(async () => {
    try {
      const [rc, rl] = await Promise.all([
        axios.get(`${API}/gestion/clientes`, { headers }),
        axios.get(`${API}/gestion/leads`, { headers }),
      ]);
      setClientes(rc.data || []);
      setLeads(rl.data || []);
    } catch (e) {}
  }, [token]);

  const cargarObras = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gestion/obras`, { headers });
      setObras(res.data || []);
    } catch (e) {}
  }, [token]);

  const cargarPresupuestos = useCallback(async () => {
    try {
      const [rp, rc] = await Promise.all([
        axios.get(`${API}/gestion/presupuestos`, { headers }),
        axios.get(`${API}/gestion/presupuestos/catalogo`, { headers }),
      ]);
      setPresupuestos(rp.data || []);
      setCatalogo(rc.data || []);
    } catch (e) {}
  }, [token]);

  const cargarEmpleados = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gestion/empleados`, { headers });
      setEmpleados(res.data || []);
    } catch (e) {}
  }, [token]);

  const cargarOfertasEmpleoGestion = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ofertas-empleo/mias`, { headers });
      setOfertasEmpleoGestion(res.data || []);
    } catch (e) {}
  }, [token]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  useEffect(() => {
    setCargando(true);
    const cargas = {
      hoy: cargarHoy, clientes: cargarClientes, obras: cargarObras,
      presupuestos: cargarPresupuestos,
      equipo: () => Promise.all([cargarEmpleados(), cargarOfertasEmpleoGestion()]),
    };
    (cargas[tab] ? cargas[tab]() : Promise.resolve()).finally(() => setCargando(false));
  }, [tab, cargarHoy, cargarClientes, cargarObras, cargarPresupuestos, cargarEmpleados, cargarOfertasEmpleoGestion]);

  // ── Hoy: crear visita/cobro/tarea ──
  const abrirAdd = () => { setAddPaso(null); setAddForm({ fecha, hora: '09:00' }); setMostrarAdd(true); };
  const crearAdd = async () => {
    setEnviandoAdd(true);
    try {
      if (addPaso === 'tarea') {
        if (!addForm.descripcion?.trim()) return;
        await axios.post(`${API}/gestion/tareas`, { descripcion: addForm.descripcion.trim(), fecha: addForm.fecha || fecha }, { headers });
      } else if (addPaso === 'visita') {
        if (!addForm.cliente?.trim()) return;
        await axios.post(`${API}/gestion/visitas`, {
          cliente_nombre: addForm.cliente.trim(), fecha: addForm.fecha || fecha, hora: addForm.hora || '',
          tipo: addForm.tipo || 'Presupuesto', direccion: addForm.direccion || '', notas: addForm.notas || '',
        }, { headers });
      } else if (addPaso === 'cobro') {
        if (!addForm.cliente?.trim() || !addForm.importe) return;
        await axios.post(`${API}/gestion/cobros`, {
          cliente_nombre: addForm.cliente.trim(), fecha: addForm.fecha || fecha, hora: addForm.hora || '',
          importe: parseFloat(addForm.importe) || 0, metodo: addForm.metodo || 'Efectivo',
        }, { headers });
      }
      setMostrarAdd(false);
      cargarHoy(); cargarResumen();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar'));
    } finally {
      setEnviandoAdd(false);
    }
  };

  const toggleVisita = async (v) => {
    setVisitas(prev => prev.map(x => x.id === v.id ? { ...x, estado: x.estado === 'realizado' ? 'pendiente' : 'realizado' } : x));
    try { await axios.put(`${API}/gestion/visitas/${v.id}/toggle`, null, { headers }); } catch (e) { cargarHoy(); }
  };
  const toggleCobro = async (c) => {
    setCobros(prev => prev.map(x => x.id === c.id ? { ...x, estado: x.estado === 'cobrado' ? 'pendiente' : 'cobrado' } : x));
    try { await axios.put(`${API}/gestion/cobros/${c.id}/toggle`, null, { headers }); } catch (e) { cargarHoy(); }
  };
  const toggleTarea = async (t) => {
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, completada: !x.completada } : x));
    try { await axios.put(`${API}/gestion/tareas/${t.id}/toggle`, null, { headers }); } catch (e) { cargarHoy(); }
  };
  const eliminarVisita = (id) => confirmarAccion('Eliminar visita', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/visitas/${id}`, { headers }); cargarHoy(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });
  const eliminarCobro = (id) => confirmarAccion('Eliminar cobro', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/cobros/${id}`, { headers }); cargarHoy(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });
  const eliminarTarea = (id) => confirmarAccion('Eliminar tarea', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/tareas/${id}`, { headers }); cargarHoy(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });

  // ── Clientes ──
  const abrirNuevoCliente = () => { setClienteForm({}); setClienteEditando(null); setMostrarCliente(true); };
  const abrirEditarCliente = (c) => { setClienteForm(c); setClienteEditando(c.id); setMostrarCliente(true); };
  const guardarCliente = async () => {
    if (!clienteForm.nombre?.trim()) return;
    try {
      const body = { nombre: clienteForm.nombre.trim(), telefono: clienteForm.telefono || null, direccion: clienteForm.direccion || null, notas: clienteForm.notas || null, frecuencia: clienteForm.frecuencia ? parseFloat(clienteForm.frecuencia) : null };
      if (clienteEditando) await axios.put(`${API}/gestion/clientes/${clienteEditando}`, body, { headers });
      else await axios.post(`${API}/gestion/clientes`, body, { headers });
      setMostrarCliente(false);
      cargarClientes();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el cliente'));
    }
  };
  const eliminarCliente = () => {
    confirmarAccion('Eliminar cliente', '¿Seguro que quieres eliminar este cliente?', async () => {
      try { await axios.delete(`${API}/gestion/clientes/${clienteEditando}`, { headers }); setMostrarCliente(false); cargarClientes(); } catch (e) {}
    }, { textoConfirmar: 'Eliminar' });
  };

  const abrirNuevoLead = () => { setLeadForm({}); setMostrarLead(true); };
  const guardarLead = async () => {
    if (!leadForm.nombre?.trim()) return;
    try {
      await axios.post(`${API}/gestion/leads`, { nombre: leadForm.nombre.trim(), telefono: leadForm.telefono || null, gremio: leadForm.gremio || null, mensaje: leadForm.mensaje || null }, { headers });
      setMostrarLead(false);
      cargarClientes(); cargarResumen();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el lead'));
    }
  };
  const cambiarEstadoLead = async (lead, estado) => {
    try { await axios.put(`${API}/gestion/leads/${lead.id}`, { estado }, { headers }); cargarClientes(); cargarResumen(); } catch (e) {}
  };
  const convertirLead = async (lead) => {
    try { await axios.post(`${API}/gestion/leads/${lead.id}/convertir`, {}, { headers }); avisar('Convertido', `${lead.nombre} ya es un cliente`); cargarClientes(); cargarResumen(); } catch (e) {}
  };
  const eliminarLead = (id) => confirmarAccion('Eliminar lead', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/leads/${id}`, { headers }); cargarClientes(); cargarResumen(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });

  // ── Obras ──
  const abrirNuevaObra = () => { setObraForm({ estado: 'En curso', fecha_inicio: todayISO() }); setObraEditando(null); setMostrarObra(true); };
  const abrirEditarObra = (o) => { setObraForm(o); setObraEditando(o.id); setMostrarObra(true); };
  const guardarObra = async () => {
    if (!obraForm.nombre?.trim()) return;
    try {
      const body = { nombre: obraForm.nombre.trim(), cliente_nombre: obraForm.cliente_nombre || null, direccion: obraForm.direccion || null, estado: obraForm.estado || 'En curso', fecha_inicio: obraForm.fecha_inicio || null, notas: obraForm.notas || null };
      if (obraEditando) await axios.put(`${API}/gestion/obras/${obraEditando}`, body, { headers });
      else await axios.post(`${API}/gestion/obras`, body, { headers });
      setMostrarObra(false);
      cargarObras(); cargarResumen();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar la obra'));
    }
  };
  const eliminarObra = () => confirmarAccion('Eliminar obra', '¿Seguro que quieres eliminarla?', async () => {
    try { await axios.delete(`${API}/gestion/obras/${obraEditando}`, { headers }); setMostrarObra(false); cargarObras(); cargarResumen(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });

  const agregarItemObra = async (obraId) => {
    if (!itemForm.descripcion?.trim()) return;
    try {
      await axios.post(`${API}/gestion/obras/${obraId}/items`, { descripcion: itemForm.descripcion.trim(), gremio: itemForm.gremio || null }, { headers });
      setItemForm({});
      cargarObras(); cargarResumen();
    } catch (e) {}
  };
  const toggleItemObra = async (itemId) => {
    try { await axios.put(`${API}/gestion/obras/items/${itemId}/toggle`, null, { headers }); cargarObras(); cargarResumen(); } catch (e) {}
  };
  const eliminarItemObra = (itemId) => confirmarAccion('Eliminar pendiente', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/obras/items/${itemId}`, { headers }); cargarObras(); cargarResumen(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });

  const asignarEmpleadoObra = async (obraId) => {
    if (!asignForm.empleado_id) return;
    try {
      await axios.post(`${API}/gestion/obras/${obraId}/asignaciones`, { empleado_id: asignForm.empleado_id, fecha: asignForm.fecha || null, notas: asignForm.notas || null }, { headers });
      setAsignForm({});
      cargarObras();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo asignar'));
    }
  };
  const eliminarAsignacion = (id) => confirmarAccion('Quitar asignación', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/obras/asignaciones/${id}`, { headers }); cargarObras(); } catch (e) {}
  }, { textoConfirmar: 'Quitar' });

  // ── Presupuestos ──
  const abrirNuevoPresupuesto = () => {
    setPresForm({ nombre: '', cliente_nombre: '', estado: 'Borrador', fecha: todayISO(), notas: '', iva: false });
    setPresLineasNuevas([]);
    setLineaForm({ concepto: '', gremio: '', cantidad: '1', unidad: 'ud', precio_unitario: '' });
    setEditandoPresupuesto('new');
  };
  const abrirPresupuesto = (p) => {
    setPresForm({ nombre: p.nombre, estado: p.estado, fecha: p.fecha, notas: p.notas || '', iva: p.iva });
    setEditandoPresupuesto(p);
  };
  const cerrarPresupuesto = () => setEditandoPresupuesto(null);

  const onConceptoChange = (val) => {
    setLineaForm(f => {
      const match = catalogo.find(c => c.concepto.toLowerCase() === val.trim().toLowerCase());
      if (match) {
        return { ...f, concepto: val, precio_unitario: f.precio_unitario || String(match.ultimo_precio), gremio: f.gremio || match.gremio || '', unidad: match.unidad || f.unidad };
      }
      return { ...f, concepto: val };
    });
  };

  const añadirLineaPresupuesto = async () => {
    if (!lineaForm.concepto?.trim() || !lineaForm.precio_unitario) return;
    const linea = { concepto: lineaForm.concepto.trim(), gremio: lineaForm.gremio || null, cantidad: parseFloat(lineaForm.cantidad) || 1, unidad: lineaForm.unidad || 'ud', precio_unitario: parseFloat(lineaForm.precio_unitario) || 0 };
    if (editandoPresupuesto === 'new') {
      setPresLineasNuevas(prev => [...prev, linea]);
    } else {
      try {
        await axios.post(`${API}/gestion/presupuestos/${editandoPresupuesto.id}/lineas`, linea, { headers });
        const res = await axios.get(`${API}/gestion/presupuestos`, { headers });
        setPresupuestos(res.data || []);
        setEditandoPresupuesto(res.data.find(p => p.id === editandoPresupuesto.id));
      } catch (e) {}
    }
    setLineaForm({ concepto: '', gremio: lineaForm.gremio, cantidad: '1', unidad: lineaForm.unidad, precio_unitario: '' });
  };
  const eliminarLineaPresupuesto = async (id) => {
    if (editandoPresupuesto === 'new') {
      setPresLineasNuevas(prev => prev.filter((_, i) => i !== id));
      return;
    }
    try {
      await axios.delete(`${API}/gestion/presupuestos/lineas/${id}`, { headers });
      const res = await axios.get(`${API}/gestion/presupuestos`, { headers });
      setPresupuestos(res.data || []);
      setEditandoPresupuesto(res.data.find(p => p.id === editandoPresupuesto.id));
    } catch (e) {}
  };

  const guardarPresupuesto = async () => {
    if (!presForm.nombre?.trim()) return;
    try {
      if (editandoPresupuesto === 'new') {
        if (!presForm.cliente_nombre?.trim()) return;
        await axios.post(`${API}/gestion/presupuestos`, {
          nombre: presForm.nombre.trim(), cliente_nombre: presForm.cliente_nombre.trim(), estado: presForm.estado,
          fecha: presForm.fecha, notas: presForm.notas || null, iva: presForm.iva, lineas: presLineasNuevas,
        }, { headers });
        setEditandoPresupuesto(null);
      } else {
        await axios.put(`${API}/gestion/presupuestos/${editandoPresupuesto.id}`, {
          nombre: presForm.nombre.trim(), estado: presForm.estado, fecha: presForm.fecha, notas: presForm.notas || null, iva: presForm.iva,
        }, { headers });
        setEditandoPresupuesto(null);
      }
      cargarPresupuestos();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el presupuesto'));
    }
  };
  const eliminarPresupuesto = (id) => confirmarAccion('Eliminar presupuesto', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/presupuestos/${id}`, { headers }); cargarPresupuestos(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });
  const convertirPresupuestoObra = async (p) => {
    try {
      await axios.post(`${API}/gestion/presupuestos/${p.id}/convertir-obra`, {}, { headers });
      avisar('Convertido en obra', 'Ya la tienes en la pestaña Obras');
      cargarResumen();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo convertir'));
    }
  };

  // ── Equipo ──
  const guardarEmpleado = async () => {
    if (!empleadoForm.nombre?.trim()) return;
    try {
      await axios.post(`${API}/gestion/empleados`, {
        nombre: empleadoForm.nombre.trim(), telefono: empleadoForm.telefono || null,
        tipo_pago: empleadoForm.tipo_pago || 'hora', tarifa: parseFloat(empleadoForm.tarifa) || 0,
      }, { headers });
      setMostrarEmpleado(false);
      setEmpleadoForm({ tipo_pago: 'hora' });
      cargarEmpleados();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo guardar el empleado'));
    }
  };
  const eliminarEmpleado = (id) => confirmarAccion('Eliminar empleado', '¿Seguro?', async () => {
    try { await axios.delete(`${API}/gestion/empleados/${id}`, { headers }); cargarEmpleados(); cargarResumen(); } catch (e) {}
  }, { textoConfirmar: 'Eliminar' });

  const abrirEmpleado = async (emp) => {
    if (empleadoAbiertoId === emp.id) { setEmpleadoAbiertoId(null); return; }
    setEmpleadoAbiertoId(emp.id);
    setSemanaFecha(todayISO());
    await cargarJornadasYPagos(emp.id, todayISO());
  };
  const cargarJornadasYPagos = async (empId, semFecha) => {
    try {
      const semana = weekDaysOf(semFecha);
      const [rj, rp] = await Promise.all([
        axios.get(`${API}/gestion/empleados/${empId}/jornadas`, { headers, params: { desde: semana[0], hasta: semana[6] } }),
        axios.get(`${API}/gestion/empleados/${empId}/pagos`, { headers }),
      ]);
      setJornadasEmpleado(rj.data || []);
      setPagosEmpleado(rp.data || []);
    } catch (e) {}
  };
  const cambiarSemana = async (delta) => {
    const nueva = addDays(semanaFecha, delta * 7);
    setSemanaFecha(nueva);
    if (empleadoAbiertoId) await cargarJornadasYPagos(empleadoAbiertoId, nueva);
  };
  const ciclarJornada = async (empId, fechaDia) => {
    try {
      await axios.put(`${API}/gestion/empleados/${empId}/jornada`, null, { headers, params: { fecha: fechaDia } });
      await cargarJornadasYPagos(empId, semanaFecha);
      cargarEmpleados(); cargarResumen();
    } catch (e) {}
  };
  const marcarTodoPagado = async (empId) => {
    try {
      await axios.put(`${API}/gestion/empleados/${empId}/marcar-todo-pagado`, null, { headers });
      await cargarJornadasYPagos(empId, semanaFecha);
      cargarEmpleados(); cargarResumen();
    } catch (e) {}
  };
  const guardarPago = async (empId) => {
    if (!pagoForm.importe) return;
    try {
      await axios.post(`${API}/gestion/empleados/${empId}/pagos`, { fecha: pagoForm.fecha || todayISO(), importe: parseFloat(pagoForm.importe) || 0, concepto: pagoForm.concepto || null }, { headers });
      setMostrarPago(false); setPagoForm({});
      await cargarJornadasYPagos(empId, semanaFecha);
      cargarEmpleados();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo registrar el pago'));
    }
  };

  // ── Equipo: ofertas de trabajo a profesionales (por servicio o por hora) ──
  const guardarOfertaEmpleo = async () => {
    if (!ofertaEmpleoForm.titulo?.trim()) return;
    try {
      await axios.post(`${API}/ofertas-empleo`, {
        titulo: ofertaEmpleoForm.titulo.trim(),
        descripcion: ofertaEmpleoForm.descripcion || null,
        zona: ofertaEmpleoForm.zona || null,
        tipo_pago: ofertaEmpleoForm.tipo_pago || 'servicio',
        tarifa: ofertaEmpleoForm.tarifa ? parseFloat(ofertaEmpleoForm.tarifa) : null,
      }, { headers });
      setMostrarOfertaEmpleo(false);
      setOfertaEmpleoForm({ tipo_pago: 'servicio' });
      cargarOfertasEmpleoGestion();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo publicar la oferta'));
    }
  };
  const cerrarOfertaEmpleoGestion = async (o) => {
    setOfertasEmpleoGestion(prev => prev.map(x => x.id === o.id ? { ...x, activa: false } : x));
    try { await axios.put(`${API}/ofertas-empleo/${o.id}`, { activa: false }, { headers }); } catch (e) { cargarOfertasEmpleoGestion(); }
  };
  const verPostulantesOferta = async (o) => {
    if (postulantesOfertaId === o.id) { setPostulantesOfertaId(null); return; }
    setPostulantesOfertaId(o.id);
    try {
      const res = await axios.get(`${API}/ofertas-empleo/${o.id}/postulantes`, { headers });
      setPostulantesOferta(res.data || []);
    } catch (e) { setPostulantesOferta([]); }
  };

  const semana = weekDaysOf(semanaFecha);
  const jornadaDe = (fechaDia) => jornadasEmpleado.find(j => j.fecha === fechaDia);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Panel de gestión</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {TABS.map(t => (
          <TouchableOpacity key={t.valor} style={[s.tab, tab === t.valor && s.tabActivo]} onPress={() => setTab(t.valor)}>
            <Text style={[s.tabText, tab === t.valor && s.tabTextActivo]}>{t.label}</Text>
            {t.valor === 'clientes' && resumen.leads_nuevos > 0 && <View style={s.badge}><Text style={s.badgeText}>{resumen.leads_nuevos}</Text></View>}
            {t.valor === 'obras' && resumen.obras_con_pendientes > 0 && <View style={s.badge}><Text style={s.badgeText}>{resumen.obras_con_pendientes}</Text></View>}
            {t.valor === 'equipo' && resumen.empleados_sin_pagar > 0 && <View style={s.badge}><Text style={s.badgeText}>{resumen.empleados_sin_pagar}</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

          {tab === 'hoy' && (
            <>
              <View style={s.dateNav}>
                <TouchableOpacity onPress={() => setFecha(addDays(fecha, -1))}><Text style={s.dateNavArrow}>‹</Text></TouchableOpacity>
                <Text style={s.dateNavLabel}>{longLabel(fecha)}</Text>
                <TouchableOpacity onPress={() => setFecha(addDays(fecha, 1))}><Text style={s.dateNavArrow}>›</Text></TouchableOpacity>
              </View>
              {fecha !== todayISO() && (
                <TouchableOpacity style={s.hoyBtn} onPress={() => setFecha(todayISO())}><Text style={s.hoyBtnText}>Ir a hoy</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={s.btnPublicarEmpleo} onPress={abrirAdd}>
                <Text style={s.btnPublicarEmpleoText}>+ Apuntar visita, cobro o tarea</Text>
              </TouchableOpacity>

              {tareas.length === 0 && visitas.length === 0 && cobros.length === 0 ? (
                <View style={s.vacio}><Text style={s.vacioEmoji}>🗓️</Text><Text style={s.vacioTitulo}>Nada agendado</Text></View>
              ) : (
                <>
                  {tareas.map(t => (
                    <View key={`t${t.id}`} style={s.taskRow}>
                      <TouchableOpacity style={[s.checkbox, t.completada && s.checkboxDone]} onPress={() => toggleTarea(t)}>
                        {t.completada && <Text style={s.checkboxCheck}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={[s.taskText, t.completada && s.taskTextDone]}>{t.descripcion}</Text>
                      <TouchableOpacity onPress={() => eliminarTarea(t.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                    </View>
                  ))}
                  {visitas.map(v => (
                    <View key={`v${v.id}`} style={[s.ticket, v.estado === 'realizado' && s.ticketDone]}>
                      <View style={s.ticketStamp}><Text style={s.ticketStampText}>{v.hora || '--:--'}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ticketCliente}>🔨 {v.cliente_nombre}</Text>
                        <Text style={s.ticketSub}>{v.tipo}{v.direccion ? ` · ${v.direccion}` : ''}</Text>
                      </View>
                      <TouchableOpacity style={s.ticketOk} onPress={() => toggleVisita(v)}><Text style={s.ticketOkText}>✓</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminarVisita(v.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                    </View>
                  ))}
                  {cobros.map(c => (
                    <View key={`c${c.id}`} style={[s.ticket, c.estado === 'cobrado' && s.ticketDone]}>
                      <View style={[s.ticketStamp, s.ticketStampMoney]}><Text style={s.ticketStampText}>{c.hora || '--:--'}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ticketCliente}>💶 {c.cliente_nombre}</Text>
                        <Text style={s.ticketSub}>{fmt(c.importe)}€ · {c.metodo}</Text>
                      </View>
                      <TouchableOpacity style={s.ticketOk} onPress={() => toggleCobro(c)}><Text style={s.ticketOkText}>✓</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminarCobro(c.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {tab === 'clientes' && (
            <>
              <View style={s.subtabs}>
                <TouchableOpacity style={[s.subtab, subTabClientes === 'clientes' && s.subtabActivo]} onPress={() => setSubTabClientes('clientes')}>
                  <Text style={[s.subtabText, subTabClientes === 'clientes' && s.subtabTextActivo]}>Clientes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.subtab, subTabClientes === 'leads' && s.subtabActivo]} onPress={() => setSubTabClientes('leads')}>
                  <Text style={[s.subtabText, subTabClientes === 'leads' && s.subtabTextActivo]}>Leads{resumen.leads_nuevos > 0 ? ` (${resumen.leads_nuevos})` : ''}</Text>
                </TouchableOpacity>
              </View>

              {subTabClientes === 'clientes' ? (
                <>
                  <TouchableOpacity style={s.btnPublicarEmpleo} onPress={abrirNuevoCliente}><Text style={s.btnPublicarEmpleoText}>+ Nuevo cliente</Text></TouchableOpacity>
                  {clientes.length === 0 ? <View style={s.vacio}><Text style={s.vacioEmoji}>👤</Text><Text style={s.vacioTitulo}>Sin clientes todavía</Text></View> : (
                    clientes.map(c => (
                      <TouchableOpacity key={c.id} style={s.card} onPress={() => abrirEditarCliente(c)}>
                        <View style={s.cardTop}>
                          <Text style={s.cardTitulo}>{c.nombre}</Text>
                          {c.usuario_id ? <View style={s.estadoPill}><Text style={s.estadoPillText}>Cliente de la app</Text></View> : null}
                        </View>
                        <Text style={s.cardDesc}>{c.telefono ? `📞 ${c.telefono}` : ''}{c.frecuencia ? ` · ${c.frecuencia}x/semana` : ''}</Text>
                        <Text style={s.cardSub}>{c.ultima_visita ? `Última visita: ${c.ultima_visita}` : 'Sin visitas todavía'}</Text>
                        {c.usuario_id && c.servicio_id ? (
                          <TouchableOpacity
                            style={[s.leadBtn, { alignSelf: 'flex-start', marginTop: 10 }]}
                            onPress={() => navigation.navigate('Chat', { servicioId: c.servicio_id, otroNombre: c.nombre })}
                          >
                            <Text style={s.leadBtnText}>💬 Abrir chat</Text>
                          </TouchableOpacity>
                        ) : null}
                      </TouchableOpacity>
                    ))
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.btnPublicarEmpleo} onPress={abrirNuevoLead}><Text style={s.btnPublicarEmpleoText}>+ Nuevo lead</Text></TouchableOpacity>
                  {leads.length === 0 ? <View style={s.vacio}><Text style={s.vacioEmoji}>📥</Text><Text style={s.vacioTitulo}>Sin solicitudes todavía</Text></View> : (
                    leads.map(l => (
                      <View key={l.id} style={s.card}>
                        <View style={s.cardTop}>
                          <Text style={s.cardTitulo}>{l.nombre}</Text>
                          <View style={s.estadoPill}><Text style={s.estadoPillText}>{l.estado}</Text></View>
                        </View>
                        <Text style={s.cardDesc}>{l.telefono ? `📞 ${l.telefono}` : ''}{l.gremio ? ` · ${l.gremio}` : ''}</Text>
                        {l.mensaje ? <Text style={s.cardSub}>{l.mensaje}</Text> : null}
                        <View style={s.leadActions}>
                          {l.estado === 'nuevo' && (
                            <TouchableOpacity style={s.leadBtn} onPress={() => cambiarEstadoLead(l, 'contactado')}><Text style={s.leadBtnText}>Contactado</Text></TouchableOpacity>
                          )}
                          {l.estado !== 'convertido' && (
                            <TouchableOpacity style={[s.leadBtn, s.leadBtnBrass]} onPress={() => convertirLead(l)}><Text style={s.leadBtnBrassText}>Convertir en cliente</Text></TouchableOpacity>
                          )}
                          {l.estado !== 'descartado' && l.estado !== 'convertido' && (
                            <TouchableOpacity style={s.leadBtn} onPress={() => cambiarEstadoLead(l, 'descartado')}><Text style={s.leadBtnText}>Descartar</Text></TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => eliminarLead(l.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}

          {tab === 'obras' && (
            <>
              <TouchableOpacity style={s.btnPublicarEmpleo} onPress={abrirNuevaObra}><Text style={s.btnPublicarEmpleoText}>+ Nueva obra</Text></TouchableOpacity>
              {obras.length === 0 ? <View style={s.vacio}><Text style={s.vacioEmoji}>🏗️</Text><Text style={s.vacioTitulo}>Sin obras todavía</Text></View> : (
                obras.map(o => {
                  const abierta = obraAbiertaId === o.id;
                  const pendientesItems = o.items.filter(i => !i.completado);
                  return (
                    <View key={o.id} style={s.card}>
                      <TouchableOpacity onPress={() => setObraAbiertaId(abierta ? null : o.id)}>
                        <View style={s.cardTop}>
                          <Text style={s.cardTitulo}>{o.nombre}</Text>
                          <View style={[s.estadoPill, o.estado === 'En curso' && s.estadoPillVerde]}><Text style={s.estadoPillText}>{o.estado}</Text></View>
                        </View>
                        <Text style={s.cardDesc}>{o.cliente_nombre || ''}{o.direccion ? ` · ${o.direccion}` : ''}</Text>
                        <Text style={s.cardSub}>{o.items.length === 0 ? 'Sin pendientes registrados' : `${pendientesItems.length} de ${o.items.length} pendiente${o.items.length !== 1 ? 's' : ''}`}{o.asignaciones.length > 0 ? ` · ${o.asignaciones.length} asignado${o.asignaciones.length !== 1 ? 's' : ''}` : ''}</Text>
                      </TouchableOpacity>

                      {abierta && (
                        <View style={s.expand}>
                          <TouchableOpacity style={s.leadBtn} onPress={() => abrirEditarObra(o)}><Text style={s.leadBtnText}>✏️ Editar obra</Text></TouchableOpacity>

                          <Text style={s.expandTitulo}>Qué falta</Text>
                          {o.items.map(it => (
                            <View key={it.id} style={s.taskRow}>
                              <TouchableOpacity style={[s.checkbox, it.completado && s.checkboxDone]} onPress={() => toggleItemObra(it.id)}>
                                {it.completado && <Text style={s.checkboxCheck}>✓</Text>}
                              </TouchableOpacity>
                              <Text style={[s.taskText, it.completado && s.taskTextDone]}>{it.gremio ? `[${it.gremio}] ` : ''}{it.descripcion}</Text>
                              <TouchableOpacity onPress={() => eliminarItemObra(it.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                            </View>
                          ))}
                          <TextInput style={s.inputSmall} placeholder="Qué falta por hacer" placeholderTextColor={colors.textFaint}
                            value={itemForm.descripcion || ''} onChangeText={v => setItemForm({ ...itemForm, descripcion: v })} />
                          <TextInput style={s.inputSmall} placeholder="Gremio (opcional)" placeholderTextColor={colors.textFaint}
                            value={itemForm.gremio || ''} onChangeText={v => setItemForm({ ...itemForm, gremio: v })} />
                          <TouchableOpacity style={s.leadBtn} onPress={() => agregarItemObra(o.id)}><Text style={s.leadBtnText}>+ Añadir pendiente</Text></TouchableOpacity>

                          <Text style={s.expandTitulo}>Quién va</Text>
                          {o.asignaciones.length === 0 ? <Text style={s.emptyTight}>Nadie asignado todavía.</Text> : (
                            o.asignaciones.map(a => (
                              <View key={a.id} style={s.payRow}>
                                <Text style={s.payRowText}>{a.empleado_nombre}{a.notas ? ` · ${a.notas}` : ''}</Text>
                                <Text style={s.payRowDate}>{a.fecha || 'sin fecha'}</Text>
                                <TouchableOpacity onPress={() => eliminarAsignacion(a.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                              </View>
                            ))
                          )}
                          {empleados.length === 0 ? <Text style={s.emptyTight}>Añade empleados en la pestaña Equipo para poder asignarlos.</Text> : (
                            <>
                              <View style={s.chipsWrap}>
                                {empleados.map(e => (
                                  <TouchableOpacity key={e.id} style={[s.chip, asignForm.empleado_id === e.id && s.chipActivo]} onPress={() => setAsignForm({ ...asignForm, empleado_id: e.id })}>
                                    <Text style={[s.chipText, asignForm.empleado_id === e.id && s.chipTextActivo]}>{e.nombre}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                              <TextInput style={s.inputSmall} placeholder="Para qué (opcional)" placeholderTextColor={colors.textFaint}
                                value={asignForm.notas || ''} onChangeText={v => setAsignForm({ ...asignForm, notas: v })} />
                              <TouchableOpacity style={s.leadBtn} onPress={() => asignarEmpleadoObra(o.id)}><Text style={s.leadBtnText}>+ Asignar</Text></TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}

          {tab === 'presupuestos' && editandoPresupuesto === null && (
            <>
              <TouchableOpacity style={s.btnPublicarEmpleo} onPress={abrirNuevoPresupuesto}><Text style={s.btnPublicarEmpleoText}>+ Nuevo presupuesto</Text></TouchableOpacity>
              {presupuestos.length === 0 ? <View style={s.vacio}><Text style={s.vacioEmoji}>📄</Text><Text style={s.vacioTitulo}>Sin presupuestos todavía</Text></View> : (
                presupuestos.map(p => (
                  <TouchableOpacity key={p.id} style={s.card} onPress={() => abrirPresupuesto(p)}>
                    <View style={s.cardTop}>
                      <Text style={s.cardTitulo}>{p.nombre}</Text>
                      <View style={s.estadoPill}><Text style={s.estadoPillText}>{p.estado}</Text></View>
                    </View>
                    <Text style={s.cardDesc}>{p.cliente_nombre} · {p.fecha}</Text>
                    <Text style={s.cardSub}><Text style={{ fontWeight: '700', color: colors.text }}>{fmt(p.total)}€</Text>{p.iva ? ' IVA inc.' : ''} · {p.lineas.length} partida{p.lineas.length !== 1 ? 's' : ''}</Text>
                    {p.estado === 'Aceptado' && (
                      <TouchableOpacity style={[s.leadBtn, s.leadBtnBrass, { marginTop: 8, alignSelf: 'flex-start' }]} onPress={(e) => { convertirPresupuestoObra(p); }}>
                        <Text style={s.leadBtnBrassText}>→ Convertir en obra</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => eliminarPresupuesto(p.id)} style={{ marginTop: 6 }}><Text style={s.trash}>🗑 Eliminar</Text></TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {tab === 'presupuestos' && editandoPresupuesto !== null && (
            <View>
              <View style={s.editorHeader}>
                <TouchableOpacity onPress={cerrarPresupuesto}><Text style={s.back}>← Cerrar</Text></TouchableOpacity>
                <TouchableOpacity style={s.leadBtnBrass} onPress={guardarPresupuesto}><Text style={s.leadBtnBrassText}>✓ Guardar</Text></TouchableOpacity>
              </View>

              <View style={s.card}>
                <Text style={s.expandTitulo}>Datos del presupuesto</Text>
                <TextInput style={s.inputSmall} placeholder="Nombre / título" placeholderTextColor={colors.textFaint}
                  value={presForm.nombre || ''} onChangeText={v => setPresForm({ ...presForm, nombre: v })} />
                {editandoPresupuesto === 'new' ? (
                  <TextInput style={s.inputSmall} placeholder="Nombre del cliente" placeholderTextColor={colors.textFaint}
                    value={presForm.cliente_nombre || ''} onChangeText={v => setPresForm({ ...presForm, cliente_nombre: v })} />
                ) : (
                  <Text style={s.cardDesc}>Cliente: {editandoPresupuesto.cliente_nombre}</Text>
                )}
                <View style={s.chipsWrap}>
                  {FRECUENCIAS_PRESUPUESTO.map(estado => (
                    <TouchableOpacity key={estado} style={[s.chip, presForm.estado === estado && s.chipActivo]} onPress={() => setPresForm({ ...presForm, estado })}>
                      <Text style={[s.chipText, presForm.estado === estado && s.chipTextActivo]}>{estado}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={s.inputSmall} placeholder="Fecha (AAAA-MM-DD)" placeholderTextColor={colors.textFaint}
                  value={presForm.fecha || ''} onChangeText={v => setPresForm({ ...presForm, fecha: v })} />
                <TextInput style={[s.inputSmall, s.textArea]} placeholder="Notas / condiciones" multiline placeholderTextColor={colors.textFaint}
                  value={presForm.notas || ''} onChangeText={v => setPresForm({ ...presForm, notas: v })} />
              </View>

              <View style={s.card}>
                <Text style={s.expandTitulo}>Partidas</Text>
                {(() => {
                  const lineas = editandoPresupuesto === 'new' ? presLineasNuevas.map((l, i) => ({ ...l, id: i })) : editandoPresupuesto.lineas;
                  const porGremio = {};
                  lineas.forEach(l => { const k = l.gremio || 'Sin gremio'; if (!porGremio[k]) porGremio[k] = []; porGremio[k].push(l); });
                  return Object.entries(porGremio).map(([gremio, ls]) => (
                    <View key={gremio} style={s.gremioBlock}>
                      <View style={s.gremioBlockHeader}>
                        <View style={s.estadoPill}><Text style={s.estadoPillText}>{gremio}</Text></View>
                        <Text style={s.gremioTotal}>{fmt(ls.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0))}€</Text>
                      </View>
                      {ls.map(l => (
                        <View key={l.id} style={s.lineaRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.lineaConcepto}>{l.concepto}</Text>
                            <Text style={s.lineaQty}>{l.cantidad} {l.unidad} × {fmt(l.precio_unitario)}€</Text>
                          </View>
                          <Text style={s.lineaTotal}>{fmt(l.cantidad * l.precio_unitario)}€</Text>
                          <TouchableOpacity onPress={() => eliminarLineaPresupuesto(l.id)}><Text style={s.trash}>🗑</Text></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ));
                })()}

                <Text style={[s.expandTitulo, { marginTop: 14 }]}>Añadir partida</Text>
                <TextInput style={s.inputSmall} placeholder="Concepto" placeholderTextColor={colors.textFaint}
                  value={lineaForm.concepto} onChangeText={onConceptoChange} />
                <TextInput style={s.inputSmall} placeholder="Gremio (opcional)" placeholderTextColor={colors.textFaint}
                  value={lineaForm.gremio} onChangeText={v => setLineaForm({ ...lineaForm, gremio: v })} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[s.inputSmall, { flex: 1 }]} placeholder="Cant." keyboardType="numeric" placeholderTextColor={colors.textFaint}
                    value={lineaForm.cantidad} onChangeText={v => setLineaForm({ ...lineaForm, cantidad: v })} />
                  <View style={[s.chipsWrap, { flex: 2 }]}>
                    {UNIDADES.map(u => (
                      <TouchableOpacity key={u} style={[s.chip, lineaForm.unidad === u && s.chipActivo]} onPress={() => setLineaForm({ ...lineaForm, unidad: u })}>
                        <Text style={[s.chipText, lineaForm.unidad === u && s.chipTextActivo]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput style={s.inputSmall} placeholder="Precio por unidad (€)" keyboardType="numeric" placeholderTextColor={colors.textFaint}
                  value={lineaForm.precio_unitario} onChangeText={v => setLineaForm({ ...lineaForm, precio_unitario: v })} />
                <TouchableOpacity style={s.leadBtn} onPress={añadirLineaPresupuesto}><Text style={s.leadBtnText}>+ Añadir partida</Text></TouchableOpacity>
              </View>

              {(() => {
                const lineas = editandoPresupuesto === 'new' ? presLineasNuevas : (editandoPresupuesto.lineas || []);
                if (lineas.length === 0) return null;
                const subtotal = lineas.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0);
                const ivaAmt = presForm.iva ? subtotal * 0.21 : 0;
                return (
                  <View style={s.card}>
                    <Text style={s.expandTitulo}>Resumen económico</Text>
                    <View style={s.payRow}><Text style={s.payRowText}>Subtotal</Text><Text style={s.payRowText}>{fmt(subtotal)}€</Text></View>
                    <View style={s.payRow}>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setPresForm({ ...presForm, iva: !presForm.iva })}>
                        <Switch value={!!presForm.iva} onValueChange={v => setPresForm({ ...presForm, iva: v })} trackColor={{ true: colors.blue }} />
                        <Text style={s.payRowText}>Aplicar IVA 21%</Text>
                      </TouchableOpacity>
                      <Text style={s.payRowText}>{fmt(ivaAmt)}€</Text>
                    </View>
                    <View style={[s.payRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
                      <Text style={s.totalLabel}>TOTAL</Text>
                      <Text style={s.totalValor}>{fmt(subtotal + ivaAmt)}€</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {tab === 'equipo' && (
            <>
              <TouchableOpacity style={s.btnPublicarEmpleo} onPress={() => setMostrarEmpleado(true)}><Text style={s.btnPublicarEmpleoText}>+ Nuevo empleado</Text></TouchableOpacity>
              {empleados.length === 0 ? <View style={s.vacio}><Text style={s.vacioEmoji}>👷</Text><Text style={s.vacioTitulo}>Sin empleados todavía</Text></View> : (
                empleados.map(e => {
                  const abierto = empleadoAbiertoId === e.id;
                  return (
                    <View key={e.id} style={s.card}>
                      <TouchableOpacity onPress={() => abrirEmpleado(e)}>
                        <View style={s.cardTop}>
                          <Text style={s.cardTitulo}>{e.nombre}</Text>
                          <View style={s.estadoPill}><Text style={s.estadoPillText}>{e.tarifa} {TIPO_PAGO_LABEL[e.tipo_pago]}</Text></View>
                        </View>
                        {e.dias_pendientes > 0 && <Text style={[s.cardSub, { color: '#FFC043' }]}>⚠️ {e.dias_pendientes} sin pagar</Text>}
                        <Text style={s.cardSub}>Pagado este mes: {fmt(e.pagado_este_mes)}€</Text>
                      </TouchableOpacity>

                      {abierto && (
                        <View style={s.expand}>
                          <View style={s.dateNav}>
                            <TouchableOpacity onPress={() => cambiarSemana(-1)}><Text style={s.dateNavArrow}>‹</Text></TouchableOpacity>
                            <Text style={s.dateNavLabel}>Semana del {dayNum(semana[0])} al {dayNum(semana[6])}</Text>
                            <TouchableOpacity onPress={() => cambiarSemana(1)}><Text style={s.dateNavArrow}>›</Text></TouchableOpacity>
                          </View>
                          <View style={s.jornadasRow}>
                            {semana.map(dia => {
                              const j = jornadaDe(dia);
                              const estado = !j ? 'empty' : j.pagado ? 'paid' : 'pending';
                              return (
                                <TouchableOpacity key={dia} style={[s.jDayBtn, estado === 'pending' && s.jDayBtnPending, estado === 'paid' && s.jDayBtnPaid]} onPress={() => ciclarJornada(e.id, dia)}>
                                  <Text style={s.jDayWd}>{dayLabel(dia)}</Text>
                                  <Text style={s.jDayNum}>{dayNum(dia)}</Text>
                                  {estado === 'paid' && <Text style={s.jDayIcon}>✓</Text>}
                                  {estado === 'pending' && <Text style={s.jDayIcon}>●</Text>}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <Text style={s.emptyTight}>Toca un día: sin marcar → asistió → pagado → sin marcar</Text>

                          {e.dias_pendientes > 0 && (
                            <TouchableOpacity style={[s.leadBtn, s.leadBtnBrass, { marginTop: 10 }]} onPress={() => marcarTodoPagado(e.id)}>
                              <Text style={s.leadBtnBrassText}>Marcar {e.dias_pendientes} día{e.dias_pendientes !== 1 ? 's' : ''} como pagado{e.dias_pendientes !== 1 ? 's' : ''}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={s.leadBtn} onPress={() => { setPagoForm({}); setMostrarPago(true); }}><Text style={s.leadBtnText}>+ Registrar pago</Text></TouchableOpacity>
                          {pagosEmpleado.length === 0 ? <Text style={s.emptyTight}>Sin pagos registrados.</Text> : (
                            pagosEmpleado.slice(0, 8).map(p => (
                              <View key={p.id} style={s.payRow}>
                                <Text style={s.payRowDate}>{p.fecha}</Text>
                                <Text style={s.payRowText}>{p.concepto || 'Pago'}</Text>
                                <Text style={s.payRowImporte}>{fmt(p.importe)}€</Text>
                              </View>
                            ))
                          )}
                          <TouchableOpacity onPress={() => eliminarEmpleado(e.id)} style={{ marginTop: 10 }}><Text style={s.trash}>🗑 Eliminar empleado</Text></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              <Text style={s.seccionTitulo}>Ofertas de trabajo a profesionales</Text>
              <Text style={s.emptyTight}>Publica una promoción por servicio o por hora: solo la verán profesionales de tu mismo gremio.</Text>
              <TouchableOpacity style={[s.btnPublicarEmpleo, { marginTop: 10 }]} onPress={() => { setOfertaEmpleoForm({ tipo_pago: 'servicio' }); setMostrarOfertaEmpleo(true); }}>
                <Text style={s.btnPublicarEmpleoText}>+ Publicar oferta de trabajo</Text>
              </TouchableOpacity>
              {ofertasEmpleoGestion.length === 0 ? (
                <View style={s.vacio}><Text style={s.vacioEmoji}>📣</Text><Text style={s.vacioTitulo}>Sin ofertas publicadas</Text></View>
              ) : (
                ofertasEmpleoGestion.map(o => (
                  <View key={o.id} style={s.card}>
                    <View style={s.cardTop}>
                      <Text style={s.cardTitulo}>{o.titulo}</Text>
                      <View style={s.estadoPill}><Text style={s.estadoPillText}>{o.activa ? 'Activa' : 'Cerrada'}</Text></View>
                    </View>
                    {o.tarifa ? <Text style={s.cardSub}>💰 {o.tarifa}€{o.tipo_pago === 'hora' ? '/hora' : ' por servicio'}</Text> : null}
                    {o.descripcion ? <Text style={s.cardSub}>{o.descripcion}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity style={[s.leadBtn, { flex: 1 }]} onPress={() => verPostulantesOferta(o)}>
                        <Text style={s.leadBtnText}>👷 {o.num_postulantes} postulante{o.num_postulantes !== 1 ? 's' : ''}</Text>
                      </TouchableOpacity>
                      {o.activa && (
                        <TouchableOpacity style={[s.leadBtn, { backgroundColor: colors.redLight, borderColor: colors.red }]} onPress={() => cerrarOfertaEmpleoGestion(o)}>
                          <Text style={[s.leadBtnText, { color: colors.red }]}>Cerrar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {postulantesOfertaId === o.id && (
                      postulantesOferta.length === 0 ? <Text style={s.emptyTight}>Nadie se ha postulado todavía</Text> : (
                        postulantesOferta.map(p => (
                          <View key={p.id} style={s.payRow}>
                            <Text style={s.payRowText}>{p.fontanero_nombre || 'Profesional'}{p.fontanero_telefono ? ` · 📞 ${p.fontanero_telefono}` : ''}</Text>
                          </View>
                        ))
                      )
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal: Hoy → visita/cobro/tarea */}
      <Modal visible={mostrarAdd} transparent animationType="fade" onRequestClose={() => setMostrarAdd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            {!addPaso ? (
              <>
                <Text style={s.modalTitulo}>¿Qué quieres apuntar?</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={s.choiceBtn} onPress={() => setAddPaso('visita')}><Text style={s.choiceEmoji}>🔨</Text><Text style={s.choiceText}>Visita</Text></TouchableOpacity>
                  <TouchableOpacity style={s.choiceBtn} onPress={() => setAddPaso('cobro')}><Text style={s.choiceEmoji}>💶</Text><Text style={s.choiceText}>Cobro</Text></TouchableOpacity>
                  <TouchableOpacity style={s.choiceBtn} onPress={() => setAddPaso('tarea')}><Text style={s.choiceEmoji}>✅</Text><Text style={s.choiceText}>Tarea</Text></TouchableOpacity>
                </View>
              </>
            ) : addPaso === 'tarea' ? (
              <>
                <Text style={s.modalTitulo}>Nueva tarea</Text>
                <TextInput style={s.inputSmall} placeholder="Descripción" placeholderTextColor={colors.textFaint}
                  value={addForm.descripcion || ''} onChangeText={v => setAddForm({ ...addForm, descripcion: v })} />
                <TouchableOpacity style={[s.leadBtnBrass, enviandoAdd && { opacity: 0.5 }]} onPress={crearAdd} disabled={enviandoAdd}><Text style={s.leadBtnBrassText}>Guardar tarea</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.modalTitulo}>{addPaso === 'visita' ? 'Nueva visita' : 'Nuevo cobro'}</Text>
                <TextInput style={s.inputSmall} placeholder="Nombre del cliente" placeholderTextColor={colors.textFaint}
                  value={addForm.cliente || ''} onChangeText={v => setAddForm({ ...addForm, cliente: v })} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[s.inputSmall, { flex: 1 }]} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textFaint}
                    value={addForm.fecha || fecha} onChangeText={v => setAddForm({ ...addForm, fecha: v })} />
                  <TextInput style={[s.inputSmall, { flex: 1 }]} placeholder="HH:MM" placeholderTextColor={colors.textFaint}
                    value={addForm.hora || ''} onChangeText={v => setAddForm({ ...addForm, hora: v })} />
                </View>
                {addPaso === 'visita' ? (
                  <>
                    <TextInput style={s.inputSmall} placeholder="Tipo (Presupuesto, Reparación...)" placeholderTextColor={colors.textFaint}
                      value={addForm.tipo || ''} onChangeText={v => setAddForm({ ...addForm, tipo: v })} />
                    <TextInput style={s.inputSmall} placeholder="Dirección (opcional)" placeholderTextColor={colors.textFaint}
                      value={addForm.direccion || ''} onChangeText={v => setAddForm({ ...addForm, direccion: v })} />
                  </>
                ) : (
                  <TextInput style={s.inputSmall} placeholder="Importe (€)" keyboardType="numeric" placeholderTextColor={colors.textFaint}
                    value={addForm.importe || ''} onChangeText={v => setAddForm({ ...addForm, importe: v })} />
                )}
                <TouchableOpacity style={[s.leadBtnBrass, enviandoAdd && { opacity: 0.5 }]} onPress={crearAdd} disabled={enviandoAdd}>
                  <Text style={s.leadBtnBrassText}>{enviandoAdd ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarAdd(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: cliente */}
      <Modal visible={mostrarCliente} transparent animationType="fade" onRequestClose={() => setMostrarCliente(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>{clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}</Text>
            <TextInput style={s.inputSmall} placeholder="Nombre" placeholderTextColor={colors.textFaint} value={clienteForm.nombre || ''} onChangeText={v => setClienteForm({ ...clienteForm, nombre: v })} />
            <TextInput style={s.inputSmall} placeholder="Teléfono" placeholderTextColor={colors.textFaint} value={clienteForm.telefono || ''} onChangeText={v => setClienteForm({ ...clienteForm, telefono: v })} />
            <TextInput style={s.inputSmall} placeholder="Dirección" placeholderTextColor={colors.textFaint} value={clienteForm.direccion || ''} onChangeText={v => setClienteForm({ ...clienteForm, direccion: v })} />
            <TextInput style={s.inputSmall} placeholder="Frecuencia (veces/semana)" keyboardType="numeric" placeholderTextColor={colors.textFaint} value={String(clienteForm.frecuencia || '')} onChangeText={v => setClienteForm({ ...clienteForm, frecuencia: v })} />
            <TextInput style={[s.inputSmall, s.textArea]} placeholder="Notas" multiline placeholderTextColor={colors.textFaint} value={clienteForm.notas || ''} onChangeText={v => setClienteForm({ ...clienteForm, notas: v })} />
            <TouchableOpacity style={s.leadBtnBrass} onPress={guardarCliente}><Text style={s.leadBtnBrassText}>Guardar</Text></TouchableOpacity>
            {clienteEditando && <TouchableOpacity style={[s.leadBtnBrass, { backgroundColor: colors.redLight, borderColor: colors.red, marginTop: 8 }]} onPress={eliminarCliente}><Text style={[s.leadBtnBrassText, { color: colors.red }]}>Eliminar cliente</Text></TouchableOpacity>}
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarCliente(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: lead */}
      <Modal visible={mostrarLead} transparent animationType="fade" onRequestClose={() => setMostrarLead(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Nuevo lead</Text>
            <TextInput style={s.inputSmall} placeholder="Nombre" placeholderTextColor={colors.textFaint} value={leadForm.nombre || ''} onChangeText={v => setLeadForm({ ...leadForm, nombre: v })} />
            <TextInput style={s.inputSmall} placeholder="Teléfono" placeholderTextColor={colors.textFaint} value={leadForm.telefono || ''} onChangeText={v => setLeadForm({ ...leadForm, telefono: v })} />
            <View style={s.chipsWrap}>
              {GREMIOS.map(g => (
                <TouchableOpacity key={g.valor} style={[s.chip, leadForm.gremio === g.valor && s.chipActivo]} onPress={() => setLeadForm({ ...leadForm, gremio: g.valor })}>
                  <Text style={[s.chipText, leadForm.gremio === g.valor && s.chipTextActivo]}>{g.emoji} {g.valor}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[s.inputSmall, s.textArea]} placeholder="Mensaje / qué pide" multiline placeholderTextColor={colors.textFaint} value={leadForm.mensaje || ''} onChangeText={v => setLeadForm({ ...leadForm, mensaje: v })} />
            <TouchableOpacity style={s.leadBtnBrass} onPress={guardarLead}><Text style={s.leadBtnBrassText}>Guardar lead</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarLead(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: obra */}
      <Modal visible={mostrarObra} transparent animationType="fade" onRequestClose={() => setMostrarObra(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>{obraEditando ? 'Editar obra' : 'Nueva obra'}</Text>
            <TextInput style={s.inputSmall} placeholder="Nombre de la obra" placeholderTextColor={colors.textFaint} value={obraForm.nombre || ''} onChangeText={v => setObraForm({ ...obraForm, nombre: v })} />
            <TextInput style={s.inputSmall} placeholder="Cliente" placeholderTextColor={colors.textFaint} value={obraForm.cliente_nombre || ''} onChangeText={v => setObraForm({ ...obraForm, cliente_nombre: v })} />
            <TextInput style={s.inputSmall} placeholder="Dirección" placeholderTextColor={colors.textFaint} value={obraForm.direccion || ''} onChangeText={v => setObraForm({ ...obraForm, direccion: v })} />
            <View style={s.chipsWrap}>
              {['En curso', 'Pausada', 'Terminada'].map(estado => (
                <TouchableOpacity key={estado} style={[s.chip, obraForm.estado === estado && s.chipActivo]} onPress={() => setObraForm({ ...obraForm, estado })}>
                  <Text style={[s.chipText, obraForm.estado === estado && s.chipTextActivo]}>{estado}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[s.inputSmall, s.textArea]} placeholder="Notas" multiline placeholderTextColor={colors.textFaint} value={obraForm.notas || ''} onChangeText={v => setObraForm({ ...obraForm, notas: v })} />
            <TouchableOpacity style={s.leadBtnBrass} onPress={guardarObra}><Text style={s.leadBtnBrassText}>Guardar</Text></TouchableOpacity>
            {obraEditando && <TouchableOpacity style={[s.leadBtnBrass, { backgroundColor: colors.redLight, borderColor: colors.red, marginTop: 8 }]} onPress={eliminarObra}><Text style={[s.leadBtnBrassText, { color: colors.red }]}>Eliminar obra</Text></TouchableOpacity>}
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarObra(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: nuevo empleado */}
      <Modal visible={mostrarEmpleado} transparent animationType="fade" onRequestClose={() => setMostrarEmpleado(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Nuevo empleado</Text>
            <TextInput style={s.inputSmall} placeholder="Nombre" placeholderTextColor={colors.textFaint} value={empleadoForm.nombre || ''} onChangeText={v => setEmpleadoForm({ ...empleadoForm, nombre: v })} />
            <TextInput style={s.inputSmall} placeholder="Teléfono" placeholderTextColor={colors.textFaint} value={empleadoForm.telefono || ''} onChangeText={v => setEmpleadoForm({ ...empleadoForm, telefono: v })} />
            <View style={s.chipsWrap}>
              {[{ v: 'hora', l: 'Por hora' }, { v: 'dia', l: 'Por día' }, { v: 'fijo', l: 'Fijo mensual' }].map(o => (
                <TouchableOpacity key={o.v} style={[s.chip, empleadoForm.tipo_pago === o.v && s.chipActivo]} onPress={() => setEmpleadoForm({ ...empleadoForm, tipo_pago: o.v })}>
                  <Text style={[s.chipText, empleadoForm.tipo_pago === o.v && s.chipTextActivo]}>{o.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.inputSmall} placeholder="Tarifa (€)" keyboardType="numeric" placeholderTextColor={colors.textFaint} value={empleadoForm.tarifa || ''} onChangeText={v => setEmpleadoForm({ ...empleadoForm, tarifa: v })} />
            <TouchableOpacity style={s.leadBtnBrass} onPress={guardarEmpleado}><Text style={s.leadBtnBrassText}>Guardar empleado</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarEmpleado(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: pago a empleado */}
      <Modal visible={mostrarPago} transparent animationType="fade" onRequestClose={() => setMostrarPago(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Registrar pago</Text>
            <TextInput style={s.inputSmall} placeholder="Fecha (AAAA-MM-DD)" placeholderTextColor={colors.textFaint} value={pagoForm.fecha || todayISO()} onChangeText={v => setPagoForm({ ...pagoForm, fecha: v })} />
            <TextInput style={s.inputSmall} placeholder="Importe (€)" keyboardType="numeric" placeholderTextColor={colors.textFaint} value={pagoForm.importe || ''} onChangeText={v => setPagoForm({ ...pagoForm, importe: v })} />
            <TextInput style={s.inputSmall} placeholder="Concepto (opcional)" placeholderTextColor={colors.textFaint} value={pagoForm.concepto || ''} onChangeText={v => setPagoForm({ ...pagoForm, concepto: v })} />
            <TouchableOpacity style={s.leadBtnBrass} onPress={() => guardarPago(empleadoAbiertoId)}><Text style={s.leadBtnBrassText}>Guardar pago</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarPago(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: oferta de trabajo a profesionales */}
      <Modal visible={mostrarOfertaEmpleo} transparent animationType="fade" onRequestClose={() => setMostrarOfertaEmpleo(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Nueva oferta de trabajo</Text>
            <TextInput style={s.inputSmall} placeholder="Título (ej. Instalador para obra en Getxo)" placeholderTextColor={colors.textFaint} value={ofertaEmpleoForm.titulo || ''} onChangeText={v => setOfertaEmpleoForm({ ...ofertaEmpleoForm, titulo: v })} />
            <TextInput style={[s.inputSmall, s.textArea]} placeholder="Descripción (opcional)" multiline placeholderTextColor={colors.textFaint} value={ofertaEmpleoForm.descripcion || ''} onChangeText={v => setOfertaEmpleoForm({ ...ofertaEmpleoForm, descripcion: v })} />
            <TextInput style={s.inputSmall} placeholder="Zona (opcional, por defecto la tuya)" placeholderTextColor={colors.textFaint} value={ofertaEmpleoForm.zona || ''} onChangeText={v => setOfertaEmpleoForm({ ...ofertaEmpleoForm, zona: v })} />
            <View style={s.chipsWrap}>
              <TouchableOpacity style={[s.chip, ofertaEmpleoForm.tipo_pago === 'servicio' && s.chipActivo]} onPress={() => setOfertaEmpleoForm({ ...ofertaEmpleoForm, tipo_pago: 'servicio' })}>
                <Text style={[s.chipText, ofertaEmpleoForm.tipo_pago === 'servicio' && s.chipTextActivo]}>Por servicio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, ofertaEmpleoForm.tipo_pago === 'hora' && s.chipActivo]} onPress={() => setOfertaEmpleoForm({ ...ofertaEmpleoForm, tipo_pago: 'hora' })}>
                <Text style={[s.chipText, ofertaEmpleoForm.tipo_pago === 'hora' && s.chipTextActivo]}>Por hora</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={s.inputSmall} placeholder={ofertaEmpleoForm.tipo_pago === 'hora' ? 'Tarifa por hora (€, opcional)' : 'Precio por servicio (€, opcional)'} keyboardType="numeric" placeholderTextColor={colors.textFaint} value={ofertaEmpleoForm.tarifa || ''} onChangeText={v => setOfertaEmpleoForm({ ...ofertaEmpleoForm, tarifa: v })} />
            <TouchableOpacity style={[s.leadBtnBrass, !ofertaEmpleoForm.titulo?.trim() && { opacity: 0.5 }]} onPress={guardarOfertaEmpleo} disabled={!ofertaEmpleoForm.titulo?.trim()}><Text style={s.leadBtnBrassText}>Publicar oferta</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostrarOfertaEmpleo(false)}><Text style={s.modalCerrar}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 20, marginBottom: 6 },
  tabsScroll: { maxHeight: 46, marginBottom: 4 },
  tabsContent: { paddingHorizontal: 20, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  tabActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActivo: { color: colors.blue },
  badge: { backgroundColor: colors.red, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
  vacio: { alignItems: 'center', paddingTop: 50 },
  vacioEmoji: { fontSize: 48, marginBottom: 10 },
  vacioTitulo: { color: colors.text, fontSize: 16, fontWeight: 'bold' },

  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateNavArrow: { color: colors.blue, fontSize: 24, fontWeight: 'bold', paddingHorizontal: 10 },
  dateNavLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  hoyBtn: { alignSelf: 'center', marginBottom: 10 },
  hoyBtnText: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  btnPublicarEmpleo: { backgroundColor: colors.blueLight, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.blue },
  btnPublicarEmpleoText: { color: colors.blue, fontWeight: 'bold', fontSize: 14 },

  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border2, justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: colors.green, borderColor: colors.green },
  checkboxCheck: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  taskText: { color: colors.text, fontSize: 14, flex: 1 },
  taskTextDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  trash: { fontSize: 15, marginLeft: 6 },

  ticket: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  ticketDone: { opacity: 0.5 },
  ticketStamp: { backgroundColor: colors.blueLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  ticketStampMoney: { backgroundColor: colors.greenGlass },
  ticketStampText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  ticketCliente: { color: colors.text, fontWeight: '600', fontSize: 14 },
  ticketSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  ticketOk: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenGlass, justifyContent: 'center', alignItems: 'center' },
  ticketOkText: { color: colors.green, fontWeight: 'bold' },

  subtabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  subtab: { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  subtabActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  subtabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  subtabTextActivo: { color: colors.blue },

  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 8 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  cardSub: { color: colors.textMuted, fontSize: 12 },
  estadoPill: { backgroundColor: colors.bgCard2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border2 },
  estadoPillVerde: { backgroundColor: colors.greenGlass, borderColor: colors.green },
  estadoPillText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  leadActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  leadBtn: { backgroundColor: colors.bgCard2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2, marginBottom: 8 },
  leadBtnText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600' },
  leadBtnBrass: { backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  leadBtnBrassText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  expand: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 8 },
  expandTitulo: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6, marginBottom: 2 },
  emptyTight: { color: colors.textFaint, fontSize: 12, fontStyle: 'italic' },

  inputSmall: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border2 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { backgroundColor: colors.bgCard2, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border2 },
  chipActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  chipTextActivo: { color: colors.blue, fontWeight: '700' },

  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: 10, padding: 10, marginBottom: 6 },
  payRowText: { color: colors.text, fontSize: 12.5 },
  payRowDate: { color: colors.textMuted, fontSize: 12 },
  payRowImporte: { color: colors.green, fontWeight: '700', fontSize: 13 },
  totalLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  totalValor: { color: colors.green, fontWeight: 'bold', fontSize: 18 },

  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  gremioBlock: { marginBottom: 12 },
  gremioBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gremioTotal: { color: colors.text, fontWeight: '700', fontSize: 13 },
  lineaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  lineaConcepto: { color: colors.text, fontSize: 13, fontWeight: '600' },
  lineaQty: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  lineaTotal: { color: colors.text, fontWeight: '700', fontSize: 13 },

  jornadasRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jDayBtn: { width: 40, height: 52, borderRadius: 10, backgroundColor: colors.bgCard2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border2 },
  jDayBtnPending: { backgroundColor: '#3A2E12', borderColor: '#FFC043' },
  jDayBtnPaid: { backgroundColor: colors.greenGlass, borderColor: colors.green },
  jDayWd: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },
  jDayNum: { color: colors.text, fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  jDayIcon: { fontSize: 9, marginTop: 2, color: colors.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, maxHeight: '85%' },
  modalTitulo: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  modalCerrar: { color: colors.textMuted, fontSize: 13 },
  choiceBtn: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 14, paddingVertical: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border2 },
  choiceEmoji: { fontSize: 26 },
  choiceText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
