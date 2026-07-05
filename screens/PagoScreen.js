import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API = 'https://fontap-backend-production.up.railway.app';

export default function PagoScreen({ navigation, route }) {
  const { token } = useAuth();
  const { fontanero, servicio, servicioId } = route.params || {};

  // ✅ FIX: precio viene del backend, no de params (empieza en null = no enviado aún)
  const [precio, setPrecio] = useState(route.params?.precio || null);
  const [esperandoPrecio, setEsperandoPrecio] = useState(!route.params?.precio);

  const [cargando, setCargando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState('');
  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [tarjeta, setTarjeta] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nombre, setNombre] = useState('');

  const pollingRef = useRef(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // ✅ FIX: Polling para detectar cuando el fontanero envía el precio
  useEffect(() => {
    if (!servicioId || precio !== null) return;

    const verificarPrecio = async () => {
      try {
        const res = await axios.get(`${API}/servicios/${servicioId}`, { headers });
        if (res.data?.precio && res.data.precio > 0) {
          setPrecio(res.data.precio);
          setEsperandoPrecio(false);
          clearInterval(pollingRef.current);
        }
      } catch (e) {}
    };

    verificarPrecio();
    pollingRef.current = setInterval(verificarPrecio, 4000);
    return () => clearInterval(pollingRef.current);
  }, [servicioId]);

  const pagar = async () => {
    // ✅ FIX: Nunca permitir pagar sin precio
    if (!precio) return;

    if (metodoPago === 'tarjeta') {
      if (!tarjeta || !expiry || !cvv || !nombre) {
        setError('Rellena todos los campos de la tarjeta');
        return;
      }
      if (tarjeta.replace(/\s/g, '').length < 16) {
        setError('Número de tarjeta inválido');
        return;
      }
    }
    setCargando(true);
    setError('');
    try {
      if (servicioId) {
        await axios.put(`${API}/servicios/${servicioId}/pagar`,
          { metodo: metodoPago },
          { headers }
        );
      }
      setTimeout(() => {
        setCargando(false);
        setPagado(true);
        setTimeout(() => navigation.navigate('Resena', { fontanero, tipo: servicio, servicioId }), 2000);
      }, 1500);
    } catch (e) {
      setCargando(false);
      setError('Error al procesar el pago. Inténtalo de nuevo.');
    }
  };

  const formatTarjeta = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  if (pagado) {
    return (
      <View style={s.container}>
        <View style={s.centro}>
          <Text style={s.emoji}>{metodoPago === 'efectivo' ? '💵' : '💳'}✅</Text>
          <Text style={s.titulo}>¡Pago completado!</Text>
          <Text style={s.sub}>
            {metodoPago === 'efectivo'
              ? 'Recuerda pagar en efectivo al fontanero'
              : 'Pago procesado correctamente'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={s.contenido}>
        <Text style={s.emoji}>💳</Text>
        <Text style={s.titulo}>Pagar el servicio</Text>

        {/* ✅ FIX: Mostrar estado de espera si el fontanero no envió precio */}
        {esperandoPrecio ? (
          <View style={s.esperandoBox}>
            <ActivityIndicator color="#3b82f6" style={{ marginBottom: 12 }} />
            <Text style={s.esperandoTitulo}>⏳ Esperando precio del fontanero</Text>
            <Text style={s.esperandoSub}>
              El fontanero aún no ha enviado el precio final. Esta pantalla se actualizará automáticamente cuando lo haga.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.fila}>
                <Text style={s.label}>Servicio</Text>
                <Text style={s.valor}>{servicio?.nombre || 'Fontanería'}</Text>
              </View>
              <View style={s.fila}>
                <Text style={s.label}>Fontanero</Text>
                <Text style={s.valor}>{fontanero?.nombre || 'Profesional'}</Text>
              </View>
              <View style={[s.fila, { borderBottomWidth: 0 }]}>
                <Text style={s.label}>Total</Text>
                <Text style={s.precio}>{precio}€</Text>
              </View>
            </View>

            <Text style={s.seccionTitulo}>Método de pago</Text>

            <View style={s.metodosRow}>
              {[
                { id: 'tarjeta', emoji: '💳', label: 'Tarjeta' },
                { id: 'efectivo', emoji: '💵', label: 'Efectivo' },
                { id: 'bizum', emoji: '📱', label: 'Bizum' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.metodoBtn, metodoPago === m.id && s.metodoBtnActivo]}
                  onPress={() => setMetodoPago(m.id)}>
                  <Text style={s.metodoEmoji}>{m.emoji}</Text>
                  <Text style={[s.metodoText, metodoPago === m.id && s.metodoTextActivo]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {metodoPago === 'tarjeta' && (
              <>
                <View style={s.inputWrap}>
                  <Text style={s.inputIcon}>👤</Text>
                  <TextInput style={s.input} placeholder="Nombre en la tarjeta"
                    placeholderTextColor="#555" value={nombre} onChangeText={setNombre} />
                </View>
                <View style={s.inputWrap}>
                  <Text style={s.inputIcon}>💳</Text>
                  <TextInput style={s.input} placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#555" value={tarjeta}
                    onChangeText={t => setTarjeta(formatTarjeta(t))}
                    keyboardType="numeric" maxLength={19} />
                </View>
                <View style={s.dobleInput}>
                  <View style={[s.inputWrap, { flex: 1 }]}>
                    <TextInput style={s.input} placeholder="MM/AA"
                      placeholderTextColor="#555" value={expiry}
                      onChangeText={setExpiry} keyboardType="numeric" maxLength={5} />
                  </View>
                  <View style={[s.inputWrap, { flex: 1 }]}>
                    <TextInput style={s.input} placeholder="CVV"
                      placeholderTextColor="#555" value={cvv}
                      onChangeText={setCvv} keyboardType="numeric" maxLength={3} secureTextEntry />
                  </View>
                </View>
              </>
            )}

            {metodoPago === 'efectivo' && (
              <View style={s.infoBox}>
                <Text style={s.infoText}>💵 Pago en efectivo</Text>
                <Text style={s.infoSub}>Acuerda el pago directamente con el fontanero al finalizar el servicio. Importe: {precio}€</Text>
              </View>
            )}

            {metodoPago === 'bizum' && (
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>📱</Text>
                <TextInput style={s.input} placeholder="Número de teléfono Bizum"
                  placeholderTextColor="#555" keyboardType="phone-pad" maxLength={9} />
              </View>
            )}

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.btnPagar, cargando && s.btnDesactivado]}
              onPress={pagar}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnPagarText}>
                  {metodoPago === 'efectivo' ? 'Confirmar pago en efectivo' : `Pagar ${precio}€ →`}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={s.seguro}>🔒 Transacción segura</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 8 },
  back: { color: '#4f8ef7', fontSize: 15 },
  contenido: { padding: 24 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  emoji: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 32 },
  esperandoBox: { backgroundColor: '#1a2340', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6', marginVertical: 20 },
  esperandoTitulo: { color: '#3b82f6', fontWeight: '700', fontSize: 15, marginBottom: 10, textAlign: 'center' },
  esperandoSub: { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3e' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#2a2a3e' },
  label: { color: '#aaa', fontSize: 14 },
  valor: { color: '#fff', fontSize: 14, fontWeight: '500' },
  precio: { color: '#4ade80', fontSize: 20, fontWeight: 'bold' },
  seccionTitulo: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 },
  metodosRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metodoBtn: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  metodoBtnActivo: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  metodoEmoji: { fontSize: 24, marginBottom: 6 },
  metodoText: { color: '#aaa', fontSize: 12, fontWeight: '500' },
  metodoTextActivo: { color: '#3b82f6' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 12, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e' },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: '#fff', paddingVertical: 13, fontSize: 14 },
  dobleInput: { flexDirection: 'row', gap: 10 },
  infoBox: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#22c55e' },
  infoText: { color: '#4ade80', fontWeight: '600', fontSize: 14, marginBottom: 6 },
  infoSub: { color: '#aaa', fontSize: 13 },
  errorBox: { backgroundColor: '#2d1515', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13 },
  btnPagar: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 8 },
  btnDesactivado: { opacity: 0.6 },
  btnPagarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  seguro: { color: '#aaa', fontSize: 12, textAlign: 'center' },
});