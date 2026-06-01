import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme';
import axios from 'axios';

const API = 'https://fontap-backend-production.up.railway.app';

const ESTADOS = {
  pendiente: { emoji: '🔍', titulo: 'Buscando fontanero...', sub: 'Tu solicitud ha sido enviada', color: '#FFC043', paso: 1 },
  aceptado: { emoji: '✅', titulo: '¡Fontanero en camino!', sub: 'El fontanero ha aceptado tu solicitud', color: '#05A357', paso: 2 },
  precio_enviado: { emoji: '💰', titulo: 'Precio recibido', sub: 'Revisa el precio y acepta para pagar', color: '#276EF1', paso: 3 },
  pago_pendiente: { emoji: '💵', titulo: 'Pendiente de pago', sub: 'El fontanero espera confirmación', color: '#7356BF', paso: 3 },
  pagado: { emoji: '🎉', titulo: '¡Servicio completado!', sub: 'Gracias por usar FonTap', color: '#05A357', paso: 4 },
};

export default function ConfirmacionScreen({ navigation, route }) {
  const { fontanero, tipo, urgente, servicioId, precio: precioProp, clienteId } = route.params || {};
  const [estado, setEstado] = useState('pendiente');
  const [precio, setPrecio] = useState(precioProp || null);
  const [fontaneroNombre, setFontaneroNombre] = useState(fontanero?.nombre || null);

  useEffect(() => {
    if (!servicioId) return;
    const intervalo = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/servicios/${servicioId}`);
        setEstado(res.data.estado || 'pendiente');
        if (res.data.precio) setPrecio(res.data.precio);
        if (res.data.fontanero_nombre) setFontaneroNombre(res.data.fontanero_nombre);
      } catch (e) {}
    }, 4000);
    return () => clearInterval(intervalo);
  }, [servicioId]);

  const estadoActual = ESTADOS[estado] || ESTADOS.pendiente;
  const esActivo = ['aceptado', 'precio_enviado', 'pago_pendiente'].includes(estado);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.contenido} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={[s.estadoCirculo, { borderColor: estadoActual.color }]}>
          <Text style={s.estadoEmoji}>{estadoActual.emoji}</Text>
        </View>
        <Text style={[s.estadoTitulo, { color: estadoActual.color }]}>{estadoActual.titulo}</Text>
        <Text style={s.estadoSub}>{estadoActual.sub}</Text>

        <View style={s.progresoWrap}>
          {[1,2,3,4].map(p => (
            <View key={p} style={s.progresoItem}>
              <View style={[s.progresoPunto, estadoActual.paso >= p && { backgroundColor: estadoActual.color }]}>
                <Text style={s.progresoPuntoText}>{p}</Text>
              </View>
              {p < 4 && <View style={[s.progresoLinea, estadoActual.paso > p && { backgroundColor: estadoActual.color }]} />}
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.fila}>
            <Text style={s.label}>Servicio</Text>
            <Text style={s.valor}>{tipo?.nombre || tipo}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Fontanero</Text>
            <Text style={s.valor}>{fontaneroNombre || 'Asignando...'}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.label}>Tipo</Text>
            <Text style={s.valor}>{urgente ? '⚡ Urgente' : '📅 Cita'}</Text>
          </View>
          <View style={[s.fila, { borderBottomWidth: 0 }]}>
            <Text style={s.label}>Precio</Text>
            {precio ? <Text style={s.precioValor}>{precio}€</Text> : <Text style={s.precioEspera}>Pendiente</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        {estado === 'precio_enviado' && precio && (
          <>
            <View style={s.precioCard}>
              <Text style={s.precioCardTitulo}>💰 Precio del fontanero</Text>
              <Text style={s.precioCardValor}>{precio}€</Text>
            </View>
            <TouchableOpacity style={s.btnPago}
              onPress={() => navigation.navigate('Pago', { fontanero, servicio: tipo, precio, servicioId })}>
              <Text style={s.btnPagoText}>💳 Aceptar y pagar {precio}€</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnRechazar} onPress={() => navigation.goBack()}>
              <Text style={s.btnRechazarText}>✕ Rechazar precio</Text>
            </TouchableOpacity>
          </>
        )}

        {esActivo && servicioId && (
          <TouchableOpacity
            style={[s.btnChat]}
            onPress={() => navigation.navigate('Chat', { servicioId, otroNombre: fontaneroNombre || 'Fontanero' })}>
            <Text style={s.btnChatText}>💬 Chatear con el fontanero</Text>
          </TouchableOpacity>
        )}

        {estado === 'pagado' && (
          <TouchableOpacity style={s.btnResena}
            onPress={() => navigation.navigate('Resena', { servicioId, fontanero, servicio: tipo })}>
            <Text style={s.btnResenaText}>⭐ Dejar reseña</Text>
          </TouchableOpacity>
        )}

        {estado !== 'pagado' && (
          <TouchableOpacity style={[s.btnPrimario, { marginTop: 10 }]} onPress={() => navigation.navigate('Mapa')}>
            <Text style={s.btnPrimarioText}>Volver al inicio</Text>
          </TouchableOpacity>
        )}

        {estado === 'pagado' && (
          <TouchableOpacity style={[s.btnPrimario, { marginTop: 10 }]} onPress={() => navigation.navigate('Mapa')}>
            <Text style={s.btnPrimarioText}>Volver al inicio</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.btnPrimario, { marginTop: 10, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => navigation.navigate('MisServicios', { clienteId })}>
          <Text style={[s.btnPrimarioText, { color: colors.textMuted }]}>📋 Ver todos mis servicios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 8 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  contenido: { flex: 1 },
  estadoCirculo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: colors.bgCard },
  estadoEmoji: { fontSize: 44 },
  estadoTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  estadoSub: { fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center' },
  progresoWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  progresoItem: { flexDirection: 'row', alignItems: 'center' },
  progresoPunto: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCard3, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  progresoPuntoText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progresoLinea: { width: 40, height: 2, backgroundColor: colors.border },
  card: { width: '100%', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontSize: 14 },
  valor: { color: colors.text, fontSize: 14, fontWeight: '500' },
  precioValor: { color: colors.green, fontSize: 18, fontWeight: 'bold' },
  precioEspera: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  footer: { padding: 20, paddingBottom: 36 },
  precioCard: { backgroundColor: colors.greenLight, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.green },
  precioCardTitulo: { color: colors.green, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  precioCardValor: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  btnPago: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  btnPagoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnRechazar: { backgroundColor: colors.redLight, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.red },
  btnRechazarText: { color: colors.red, fontWeight: 'bold', fontSize: 16 },
  btnChat: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.blue },
  btnChatText: { color: colors.blue, fontWeight: 'bold', fontSize: 16 },
  btnResena: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.amber },
  btnResenaText: { color: colors.amber, fontWeight: 'bold', fontSize: 16 },
  btnPrimario: { backgroundColor: colors.blue, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnPrimarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
