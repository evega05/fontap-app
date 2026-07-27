import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { confirmarAccion, avisar } from '../confirmar';
import { mensajeError } from '../errores';
import { CIUDADES } from './MapaScreen';

const API = 'https://fontap-backend-production.up.railway.app';

export default function InmueblesScreen({ navigation }) {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [inmuebles, setInmuebles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState(CIUDADES[0].valor);
  const [numViviendas, setNumViviendas] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/inmuebles`, { headers });
      setInmuebles(res.data || []);
    } catch (e) {}
    finally { setCargando(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!nombre.trim() || !direccion.trim()) return;
    setEnviando(true);
    try {
      await axios.post(`${API}/inmuebles`, {
        nombre: nombre.trim(), direccion: direccion.trim(), ciudad,
        num_viviendas: numViviendas ? parseInt(numViviendas, 10) : null,
      }, { headers });
      setCreando(false);
      setNombre(''); setDireccion(''); setNumViviendas(''); setCiudad(CIUDADES[0].valor);
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo registrar el inmueble'));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = (inmueble) => {
    confirmarAccion('Eliminar inmueble', `¿Seguro que quieres eliminar "${inmueble.nombre}"?`, async () => {
      setInmuebles(prev => prev.filter(i => i.id !== inmueble.id));
      try { await axios.delete(`${API}/inmuebles/${inmueble.id}`, { headers }); } catch (e) { cargar(); }
    }, { textoConfirmar: 'Sí, eliminar', textoCancelar: 'No' });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>🏢 Comunidades</Text>
        <TouchableOpacity onPress={() => setCreando(true)}>
          <Text style={s.btnNuevoHeader}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {creando && (
          <View style={s.formCard}>
            <Text style={s.formTitulo}>Nueva comunidad / inmueble</Text>
            <TextInput style={s.input} placeholder="Nombre (ej. Comunidad Zabalburu 5)"
              placeholderTextColor={colors.textFaint} value={nombre} onChangeText={setNombre} />
            <TextInput style={s.input} placeholder="Dirección"
              placeholderTextColor={colors.textFaint} value={direccion} onChangeText={setDireccion} />
            <TextInput style={s.input} placeholder="Número de viviendas (opcional)"
              placeholderTextColor={colors.textFaint} value={numViviendas} onChangeText={setNumViviendas} keyboardType="numeric" />
            <Text style={s.formLabel}>Ciudad</Text>
            <View style={s.chipsWrap}>
              {CIUDADES.map(c => (
                <TouchableOpacity
                  key={c.valor}
                  style={[s.chip, ciudad === c.valor && s.chipActivo]}
                  onPress={() => setCiudad(c.valor)}
                >
                  <Text style={[s.chipText, ciudad === c.valor && s.chipTextActivo]}>📍 {c.valor}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setCreando(false)}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnCrear, (!nombre.trim() || !direccion.trim() || enviando) && s.btnOff]}
                onPress={crear}
                disabled={!nombre.trim() || !direccion.trim() || enviando}
              >
                <Text style={s.btnCrearText}>{enviando ? 'Guardando...' : 'Guardar →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {cargando ? (
          <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
        ) : inmuebles.length === 0 && !creando ? (
          <View style={s.vacio}>
            <Text style={s.vacioEmoji}>🏢</Text>
            <Text style={s.vacioTitulo}>Sin comunidades aún</Text>
            <Text style={s.vacioSub}>Registra un inmueble para programar el mantenimiento de sus zonas comunes</Text>
          </View>
        ) : (
          inmuebles.map(i => (
            <View key={i.id} style={s.card}>
              <Text style={s.cardTitulo}>{i.nombre}</Text>
              <Text style={s.cardDesc}>📍 {i.direccion}, {i.ciudad}</Text>
              {i.num_viviendas ? <Text style={s.cardViviendas}>🏠 {i.num_viviendas} viviendas</Text> : null}
              <View style={s.cardFooter}>
                <TouchableOpacity
                  style={s.btnAccion}
                  onPress={() => navigation.navigate('ServiciosRecurrentes', { inmuebleId: i.id, inmuebleNombre: i.nombre })}
                >
                  <Text style={s.btnAccionText}>🔁 Programar mantenimiento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnEliminar} onPress={() => eliminar(i)}>
                  <Text style={s.btnEliminarText}>🗑</Text>
                </TouchableOpacity>
              </View>
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
  vacioSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  formCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  formTitulo: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  input: { backgroundColor: colors.bgCard2, color: colors.text, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
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
  cardTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  cardViviendas: { color: colors.blue, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 },
  btnAccion: { flex: 1, backgroundColor: colors.bgCard2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' },
  btnAccionText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  btnEliminar: { backgroundColor: colors.redLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  btnEliminarText: { fontSize: 14 },
});
