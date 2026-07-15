import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { GREMIOS, serviciosDe } from '../gremios';
import { confirmarAccion, avisar } from '../confirmar';

const API = 'https://fontap-backend-production.up.railway.app';

const FRECUENCIAS = [
  { valor: 'semanal', label: 'Cada semana' },
  { valor: 'quincenal', label: 'Cada 2 semanas' },
  { valor: 'mensual', label: 'Cada mes' },
];

export default function ServiciosRecurrentesScreen({ navigation }) {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [recurrentes, setRecurrentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [gremio, setGremio] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [frecuencia, setFrecuencia] = useState('semanal');

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/servicios-recurrentes`, { headers });
      setRecurrentes(res.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!gremio || !tipo) return;
    setEnviando(true);
    try {
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      await axios.post(`${API}/servicios-recurrentes`, {
        gremio, tipo, frecuencia, proxima_ejecucion: mañana.toISOString(),
      }, { headers });
      setCreando(false);
      setGremio(null);
      setTipo(null);
      setFrecuencia('semanal');
      cargar();
    } catch (e) {
      avisar('Error', 'No se pudo crear el servicio recurrente');
    } finally {
      setEnviando(false);
    }
  };

  const toggleActivo = async (r) => {
    setRecurrentes(prev => prev.map(x => x.id === r.id ? { ...x, activo: !x.activo } : x));
    try {
      await axios.put(`${API}/servicios-recurrentes/${r.id}`, { activo: !r.activo }, { headers });
    } catch (e) { cargar(); }
  };

  const eliminar = (r) => {
    confirmarAccion('¿Cancelar servicio recurrente?', `Ya no se creará "${r.tipo}" automáticamente.`, async () => {
      setRecurrentes(prev => prev.filter(x => x.id !== r.id));
      try { await axios.delete(`${API}/servicios-recurrentes/${r.id}`, { headers }); } catch (e) { cargar(); }
    }, { textoConfirmar: 'Cancelar servicio', textoCancelar: 'Volver' });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Servicios recurrentes</Text>
        <TouchableOpacity onPress={() => setCreando(true)}>
          <Text style={s.btnNuevoHeader}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {creando && (
          <View style={s.formCard}>
            <Text style={s.formTitulo}>🔁 Nuevo servicio recurrente</Text>
            <Text style={s.formLabel}>Tipo de profesional</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {GREMIOS.map(g => (
                <TouchableOpacity
                  key={g.valor}
                  style={[s.chip, gremio === g.valor && s.chipActivo]}
                  onPress={() => { setGremio(g.valor); setTipo(null); }}
                >
                  <Text style={[s.chipText, gremio === g.valor && s.chipTextActivo]}>{g.emoji} {g.valor}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {gremio && (
              <>
                <Text style={s.formLabel}>Servicio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {serviciosDe(gremio).map(sv => (
                    <TouchableOpacity
                      key={sv.nombre}
                      style={[s.chip, tipo === sv.nombre && s.chipActivo]}
                      onPress={() => setTipo(sv.nombre)}
                    >
                      <Text style={[s.chipText, tipo === sv.nombre && s.chipTextActivo]}>{sv.emoji} {sv.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={s.formLabel}>Frecuencia</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FRECUENCIAS.map(f => (
                <TouchableOpacity
                  key={f.valor}
                  style={[s.chip, frecuencia === f.valor && s.chipActivo]}
                  onPress={() => setFrecuencia(f.valor)}
                >
                  <Text style={[s.chipText, frecuencia === f.valor && s.chipTextActivo]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setCreando(false)}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnCrear, (!gremio || !tipo || enviando) && s.btnOff]}
                onPress={crear}
                disabled={!gremio || !tipo || enviando}
              >
                <Text style={s.btnCrearText}>{enviando ? 'Creando...' : 'Crear →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {cargando ? (
          <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
        ) : recurrentes.length === 0 && !creando ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>🔁</Text>
            <Text style={s.vacioTitulo}>Sin servicios recurrentes</Text>
            <Text style={s.vacioSub}>Programa limpiezas, mantenimientos o revisiones periódicas</Text>
          </View>
        ) : (
          recurrentes.map(r => (
            <View key={r.id} style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.cardTipo}>{r.tipo}</Text>
                  <Text style={s.cardSub}>{FRECUENCIAS.find(f => f.valor === r.frecuencia)?.label || r.frecuencia}</Text>
                  <Text style={s.cardFecha}>Próxima: {new Date(r.proxima_ejecucion).toLocaleDateString('es-ES')}</Text>
                </View>
                <Switch value={r.activo} onValueChange={() => toggleActivo(r)} trackColor={{ true: colors.blue }} />
              </View>
              <TouchableOpacity style={s.btnEliminar} onPress={() => eliminar(r)}>
                <Text style={s.btnEliminarText}>Cancelar servicio</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  btnNuevoHeader: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  lista: { flex: 1 },
  centro: { paddingTop: 60, alignItems: 'center' },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  formCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  formTitulo: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  formLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  chip: { backgroundColor: colors.bgCard2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border2 },
  chipActivo: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActivo: { color: colors.blue, fontWeight: '700' },
  btnCancelar: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border2 },
  btnCancelarText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnCrear: { flex: 1, backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center' },
  btnOff: { opacity: 0.4 },
  btnCrearText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTipo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  cardSub: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  cardFecha: { color: colors.textMuted, fontSize: 12 },
  btnEliminar: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border, alignItems: 'center' },
  btnEliminarText: { color: colors.red, fontSize: 13, fontWeight: '600' },
});
