import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme';

const SECCIONES = [
  {
    titulo: '1. Qué es Multiservicios Provenza',
    texto:
      'Multiservicios Provenza es una plataforma de intermediación que conecta a clientes que necesitan un servicio ' +
      'para el hogar (fontanería, electricidad, cerrajería y otros oficios) con profesionales independientes que ofrecen esos servicios. ' +
      'Multiservicios Provenza no presta directamente estos servicios: actúa como intermediario entre ambas partes.',
  },
  {
    titulo: '2. Registro y cuenta',
    texto:
      'Debes ser mayor de 18 años para registrarte y contratar o prestar servicios a través de Multiservicios Provenza. ' +
      'Para usar Multiservicios Provenza debes registrarte con datos reales y mantener actualizada tu información de ' +
      'contacto. Eres responsable de la actividad realizada desde tu cuenta y de la confidencialidad de ' +
      'tu contraseña. Los profesionales declaran contar con la cualificación y, en su caso, los seguros ' +
      'necesarios para ejercer su actividad.',
  },
  {
    titulo: '3. Precios y pagos',
    texto:
      'El precio de cada servicio lo fija libremente el profesional y se muestra al cliente antes de ' +
      'confirmar el pago. Multiservicios Provenza aplica una comisión sobre el importe cobrado por servicios pagados a ' +
      'través de la plataforma. Los pagos en efectivo se acuerdan directamente entre cliente y profesional; ' +
      'Multiservicios Provenza no es responsable de disputas sobre pagos realizados fuera de la app.',
  },
  {
    titulo: '4. Cancelaciones',
    texto:
      'Tanto el cliente como el profesional pueden cancelar una solicitud antes de que el servicio se ' +
      'marque como pagado. Cancelaciones repetidas o de mala fe pueden dar lugar a la suspensión de la cuenta.',
  },
  {
    titulo: '5. Reseñas',
    texto:
      'Al finalizar un servicio pagado, cliente y profesional pueden valorarse mutuamente. Las reseñas deben ' +
      'reflejar experiencias reales; Multiservicios Provenza puede retirar reseñas falsas, ofensivas o que infrinjan estos términos.',
  },
  {
    titulo: '6. Responsabilidad',
    texto:
      'Multiservicios Provenza no es parte del contrato de servicio entre cliente y profesional y no responde por la calidad, ' +
      'seguridad o resultado del trabajo realizado. Cualquier incidencia relativa a la ejecución del servicio ' +
      'debe resolverse entre las partes; Multiservicios Provenza puede mediar de buena fe pero no garantiza el resultado.',
  },
  {
    titulo: '7. Protección de datos',
    texto:
      'Tratamos tus datos personales (nombre, contacto, ubicación aproximada, historial de servicios) ' +
      'únicamente para prestar el servicio de intermediación: mostrar tu solicitud a profesionales cercanos, ' +
      'gestionar pagos y comunicarte con la otra parte. No vendemos tus datos a terceros. Puedes solicitar ' +
      'la eliminación de tu cuenta y datos asociados en cualquier momento escribiendo a soporte.',
  },
  {
    titulo: '8. Cambios en estos términos',
    texto:
      'Podemos actualizar estos términos para reflejar cambios en el servicio o en la normativa aplicable. ' +
      'Si los cambios son sustanciales, te avisaremos dentro de la app antes de que entren en vigor.',
  },
];

export default function TerminosScreen({ navigation }) {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.titulo}>Términos y condiciones</Text>
      <Text style={s.sub}>Última actualización: julio de 2026</Text>

      {SECCIONES.map((sec, i) => (
        <View key={i} style={s.seccion}>
          <Text style={s.seccionTitulo}>{sec.titulo}</Text>
          <Text style={s.seccionTexto}>{sec.texto}</Text>
        </View>
      ))}

      <View style={s.contacto}>
        <Text style={s.contactoTexto}>
          ¿Dudas sobre estos términos o tus datos? Escríbenos a soporte@fontap.app
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 52, paddingBottom: 48 },
  backBtn: { marginBottom: 20 },
  backText: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textFaint, marginBottom: 28 },
  seccion: { marginBottom: 22 },
  seccionTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  seccionTexto: { color: colors.textMuted, fontSize: 13.5, lineHeight: 21 },
  contacto: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  contactoTexto: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
