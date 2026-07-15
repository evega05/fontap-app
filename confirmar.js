import { Alert, Platform } from 'react-native';

// Alert.alert de react-native-web es un no-op (static alert() {}), así que en web
// cualquier diálogo de confirmación con botones nunca ejecuta su onPress: el botón
// que lo dispara parece "no hacer nada". Estas dos funciones dan una alternativa
// que sí funciona en web (via window.confirm/window.alert) y se comportan igual
// que antes en iOS/Android (via el Alert nativo).

export function confirmarAccion(titulo, mensaje, onConfirmar, opciones = {}) {
  const { textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', destructivo = true } = opciones;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${titulo}\n\n${mensaje}`)) {
      onConfirmar();
    }
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: textoCancelar, style: 'cancel' },
    { text: textoConfirmar, style: destructivo ? 'destructive' : 'default', onPress: onConfirmar },
  ]);
}

export function avisar(titulo, mensaje) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    return;
  }
  Alert.alert(titulo, mensaje);
}
