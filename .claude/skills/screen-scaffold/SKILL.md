---
name: screen-scaffold
description: Genera el esqueleto de una pantalla nueva de fontap-app (screens/NuevaScreen.js) con header, estados de carga/vacío/error y navegación básica, SIN lógica de datos todavía. Usar cuando se pide una pantalla nueva desde cero antes de conectarla a la API. NO usar si la pantalla ya necesita traer/enviar datos reales desde el primer momento (usa frontend-data-screen-scaffold) ni si es una secuencia de varios pasos (usa wizard-flow-scaffold) ni para un modal de confirmación puntual (usa confirm-modal-generator).
---

# Plantilla de pantalla nueva

## Antes de generar

Pregunta (o infiere del contexto) dos cosas si no están claras:
1. ¿La pantalla usa el sistema "cristal" (Glass/Pressable) o estilos planos?
   Mira las pantallas vecinas del mismo flujo — si tenés dudas, usa la skill
   `visual-consistency-audit` o simplemente el estilo plano (es el más común
   en el proyecto salvo en el flujo de perfil/panel del profesional).
2. ¿Necesita parámetros de navegación (`route.params`)?

## Esqueleto — variante plana (la más común)

```jsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

export default function NuevaScreen({ navigation, route }) {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // cargar datos aquí si hace falta
    setCargando(false);
  }, []);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Título de la pantalla</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView style={s.lista} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* contenido aquí */}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '500' },
  titulo: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { flex: 1 },
});
```

Para el estado vacío (cuando cargó pero no hay datos), sigue el patrón
repetido en el proyecto: emoji grande + título + subtítulo, ej.

```jsx
<View style={s.vacio}>
  <Text style={s.vacioEmoji}>📋</Text>
  <Text style={s.vacioTitulo}>Sin nada todavía</Text>
  <Text style={s.vacioSub}>Descripción de qué aparecerá aquí</Text>
</View>
```
con estilos `vacio: { alignItems: 'center', paddingTop: 60 }`, `vacioEmoji: { fontSize: 48, marginBottom: 12 }`, etc.

## Registrar la pantalla

Después de crear el archivo, agrégala a `App.js` como
`<Stack.Screen name="NombreQueUsaráNavigate" component={NuevaScreen} options={{ headerShown: false }} />`.

## Qué NO hacer

No agregues llamadas a `axios` "por si acaso" — esta skill es solo el
esqueleto. Si la pantalla necesita datos reales desde ya, usa
`frontend-data-screen-scaffold` en su lugar.
