import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { avisar } from '../confirmar';
import { GREMIOS } from '../gremios';

const API = 'https://fontap-backend-production.up.railway.app';

export default function ProyectosScreen({ navigation }) {
  const { usuario, token, logout } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [gremiosElegidos, setGremiosElegidos] = useState([]);
  const [interesadosDe, setInteresadosDe] = useState(null);
  const [interesados, setInteresados] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/proyectos/mios`, { headers });
      setProyectos(res.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleGremio = (valor) => {
    setGremiosElegidos(prev => prev.includes(valor) ? prev.filter(g => g !== valor) : [...prev, valor]);
  };

  const crear = async () => {
    if (!titulo.trim() || gremiosElegidos.length === 0) return;
    setEnviando(true);
    try {
      await axios.post(`${API}/proyectos`, {
        titulo: titulo.trim(), descripcion: descripcion.trim() || null, gremios: gremiosElegidos,
      }, { headers });
      setCreando(false);
      setTitulo(''); setDescripcion(''); setGremiosElegidos([]);
      cargar();
    } catch (e) {
      avisar('Error', e.response?.data?.detail || 'No se pudo crear el proyecto');
    } finally {
      setEnviando(false);
    }
  };

  const cerrarProyecto = async (p) => {
    setProyectos(prev => prev.map(x => x.id === p.id ? { ...x, estado: 'cerrado' } : x));
    try { await axios.put(`${API}/proyectos/${p.id}`, { estado: 'cerrado' }, { headers }); } catch (e) { cargar(); }
  };

  const verInteresados = async (p) => {
    setInteresadosDe(p);
    try {
      const res = await axios.get(`${API}/proyectos/${p.id}/interesados`, { headers });
      setInteresados(res.data || []);
    } catch (e) { setInteresados([]); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.titulo}>🏢 Proyectos</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity onPress={() => setCreando(true)}>
            <Text style={s.btnNuevoHeader}>+ Nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={s.btnSalir}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {creando && (
          <View style={s.formCard}>
            <Text style={s.formTitulo}>Nuevo proyecto</Text>
            <TextInput style={s.input} placeholder="Título (ej. Reforma comunidad Zabalburu)"
              placeholderTextColor={colors.textFaint} value={titulo} onChangeText={setTitulo} />
            <TextInput style={[s.input, s.textArea]} placeholder="Descripción (opcional)" multiline
              placeholderTextColor={colors.textFaint} value={descripcion} onChangeText={setDescripcion} />
            <Text style={s.formLabel}>Gremios que necesitas</Text>
            <View style={s.chipsWrap}>
              {GREMIOS.map(g => (
                <TouchableOpacity
                  key={g.valor}
                  style={[s.chip, gremiosElegidos.includes(g.valor) && s.chipActivo]}
                  onPress={() => toggleGremio(g.valor)}
                >
                  <Text style={[s.chipText, gremiosElegidos.includes(g.valor) && s.chipTextActivo]}>{g.emoji} {g.valor}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setCreando(false)}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnCrear, (!titulo.trim() || gremiosElegidos.length === 0 || enviando) && s.btnOff]}
                onPress={crear}
                disabled={!titulo.trim() || gremiosElegidos.length === 0 || enviando}
              >
                <Text style={s.btnCrearText}>{enviando ? 'Publicando...' : 'Publicar →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {cargando ? (
          <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
        ) : proyectos.length === 0 && !creando ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>🏢</Text>
            <Text style={s.vacioTitulo}>Sin proyectos aún</Text>
            <Text style={s.vacioSub}>Publica un proyecto para que varios profesionales se interesen</Text>
          </View>
        ) : (
          proyectos.map(p => (
            <View key={p.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardTitulo}>{p.titulo}</Text>
                <View style={[s.estadoPill, p.estado === 'abierto' ? s.estadoAbierto : s.estadoCerrado]}>
                  <Text style={[s.estadoText, p.estado === 'abierto' ? s.estadoTextAbierto : s.estadoTextCerrado]}>
                    {p.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              </View>
              {p.descripcion ? <Text style={s.cardDesc}>{p.descripcion}</Text> : null}
              <Text style={s.cardGremios}>{p.gremios.split(',').join(' · ')}</Text>
              <View style={s.cardFooter}>
                <TouchableOpacity style={s.btnAccion} onPress={() => verInteresados(p)}>
                  <Text style={s.btnAccionText}>👷 {p.num_interesados} interesado{p.num_interesados !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
                {p.estado === 'abierto' && (
                  <TouchableOpacity style={s.btnCerrar} onPress={() => cerrarProyecto(p)}>
                    <Text style={s.btnCerrarText}>Cerrar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {interesadosDe?.id === p.id && (
                <View style={s.interesadosWrap}>
                  {interesados.length === 0 ? (
                    <Text style={s.interesadoVacio}>Nadie se ha interesado todavía</Text>
                  ) : (
                    interesados.map(i => (
                      <View key={i.id} style={s.interesadoRow}>
                        <Text style={s.interesadoNombre}>{i.fontanero_nombre || 'Profesional'}</Text>
                        {i.fontanero_valoracion ? <Text style={s.interesadoVal}>⭐ {i.fontanero_valoracion}</Text> : null}
                        {i.mensaje ? <Text style={s.interesadoMsg}>"{i.mensaje}"</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}
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
  titulo: { color: colors.text, fontSize: 19, fontWeight: 'bold' },
  btnNuevoHeader: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  btnSalir: { color: colors.red, fontSize: 15, fontWeight: '600' },
  lista: { flex: 1 },
  centro: { paddingTop: 60, alignItems: 'center' },
  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioEmoji: { fontSize: 56, marginBottom: 16 },
  vacioTitulo: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  formCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  formTitulo: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  input: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  formLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 8 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  cardGremios: { color: colors.blue, fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'capitalize' },
  estadoPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  estadoAbierto: { backgroundColor: colors.greenGlass, borderColor: colors.green },
  estadoCerrado: { backgroundColor: colors.glass, borderColor: colors.border },
  estadoText: { fontSize: 11, fontWeight: '700' },
  estadoTextAbierto: { color: colors.green },
  estadoTextCerrado: { color: colors.textMuted },
  cardFooter: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border },
  btnAccion: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' },
  btnAccionText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  btnCerrar: { backgroundColor: colors.redLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.red },
  btnCerrarText: { color: colors.red, fontWeight: '600', fontSize: 13 },
  interesadosWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 8 },
  interesadoVacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  interesadoRow: { backgroundColor: colors.bgCard2, borderRadius: 12, padding: 10 },
  interesadoNombre: { color: colors.text, fontWeight: '600', fontSize: 13 },
  interesadoVal: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  interesadoMsg: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
});
