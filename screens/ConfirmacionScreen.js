import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function ConfirmacionScreen({ navigation, route }) {
  const { fontanero, tipo, urgente } = route.params || {};

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <Text style={s.emoji}>✅</Text>
        <Text style={s.titulo}>¡Solicitud enviada!</Text>
        <Text style={s.sub}>
          {urgente ? 'El fontanero llegará en 30-60 minutos' : 'Te confirmaremos la cita en breve'}
        </Text>

        <View style={s.card}>
          <View style={s.fila}>
            <Text style={s.label}>Servicio</Text>
            <Text style={s.valor}>{tipo?.emoji} {tipo?.nombre}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Fontanero</Text>
            <Text style={s.valor}>{fontanero?.nombre || 'Más cercano'}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Tipo</Text>
            <Text style={s.valor}>{urgente ? '⚡ Urgente' : '📅 Cita'}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Estado</Text>
            <Text style={s.estadoActivo}>🟡 Buscando fontanero...</Text>
          </View>
        </View>

        <View style={s.pasos}>
          <Text style={s.pasosTitle}>¿Qué pasa ahora?</Text>
          <View style={s.paso}>
            <Text style={s.pasoNum}>1</Text>
            <Text style={s.pasoText}>El fontanero recibe tu solicitud</Text>
          </View>
          <View style={s.paso}>
            <Text style={s.pasoNum}>2</Text>
            <Text style={s.pasoText}>Acepta y ves su ubicación en tiempo real</Text>
          </View>
          <View style={s.paso}>
            <Text style={s.pasoNum}>3</Text>
            <Text style={s.pasoText}>Llega, repara y pagas desde la app</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.btnPago} onPress={() => navigation.navigate('Pago', { fontanero, servicio: tipo, servicioId: route.params?.servicioId })}>
          <Text style={s.btnPagoText}>💳 Pagar el servicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnResena} onPress={() => navigation.navigate('Resena', { fontanero, tipo })}>
          <Text style={s.btnResenaText}>⭐ Dejar reseña</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimario} onPress={() => navigation.navigate('Mapa')}>
          <Text style={s.btnPrimarioText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#4f8ef7', fontSize: 15 },
  contenido: { flex: 1 },
  emoji: { fontSize: 64, marginBottom: 16 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 32 },
  card: { width: '100%', backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#2a2a3e' },
  label: { color: '#aaa', fontSize: 14 },
  valor: { color: '#fff', fontSize: 14, fontWeight: '500' },
  estadoActivo: { color: '#fbbf24', fontSize: 14, fontWeight: '500' },
  pasos: { width: '100%', backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24 },
  pasosTitle: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 16 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pasoNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },
  pasoText: { color: '#aaa', fontSize: 13, flex: 1 },
  footer: { padding: 20, paddingBottom: 36 },
  btnResena: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f59e0b' },
  btnResenaText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 },
  btnPrimario: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnPago: { backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnPagoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});