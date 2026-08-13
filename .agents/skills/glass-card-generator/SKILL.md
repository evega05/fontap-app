---
name: glass-card-generator
description: Genera una tarjeta destacada estilo "cristal" (Glass + LinearGradient) para promocionar o dar acceso a UNA sección concreta dentro de una pantalla ya existente, como las tarjetas "Administración" o "Panel de gestión" de este proyecto. Usar cuando el pedido es agregar un banner/tarjeta con ícono, título y subtítulo que navegue a otra pantalla. NO usar si el pedido es una pantalla completa nueva (usa screen-scaffold o frontend-data-screen-scaffold en su lugar) — esta skill genera solo el bloque de la tarjeta, no una screen entera.
---

# Generador de tarjeta destacada "cristal"

Este proyecto usa un sistema de diseño "cristal" (frosted glass) para destacar
accesos importantes dentro de una pantalla, en vez de un link de texto plano.
Los dos ejemplos de referencia ya en el código son la tarjeta "Administración"
en `screens/PerfilFontaneroScreen.js` y la tarjeta "Panel de gestión" en
`screens/EquipoScreen.js`.

## Cuándo usar esta skill

El usuario pide algo como "agrega una tarjeta que lleve a X pantalla" o
"destaca el acceso a Y como hicimos con Administración". Es para UN elemento
dentro de una pantalla, no para la pantalla completa.

## Patrón exacto a seguir

```jsx
<Pressable haptic onPress={() => navigation.navigate('NombrePantalla')}>
  <Glass style={s.miTarjetaCard}>
    <LinearGradient colors={[colors.accent, colors.accent2]} style={s.miTarjetaIconWrap}>
      <Ionicons name="nombre-del-icono" size={22} color="#fff" />
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={s.miTarjetaTitulo}>Título corto</Text>
      <Text style={s.miTarjetaSub}>Subtítulo de una línea explicando qué hace</Text>
    </View>
    <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
  </Glass>
</Pressable>
```

Estilos correspondientes (adaptar nombres al prefijo de la tarjeta):

```js
miTarjetaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.md },
miTarjetaIconWrap: { width: 48, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
miTarjetaTitulo: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
miTarjetaSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
```

Si la pantalla usa `StyleSheet` plano en vez del sistema "cristal" (revisa si
importa `Glass`/`Pressable`/`FadeInUp`/`GradientBg` — ver skill
`visual-consistency-audit` si hay duda), usa la variante sin Glass, con
`View` + `TouchableOpacity` y colores de `theme.js` directamente, siguiendo
el mismo patrón visto en `EquipoScreen.js` para la tarjeta de "Panel de
gestión" (que usa `colors.blueLight`/`colors.blue` en vez de gradiente).

## Imports necesarios

```js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Glass from '../components/Glass'; // solo si la pantalla usa el sistema cristal
import Pressable from '../components/Pressable'; // solo si la pantalla usa el sistema cristal
```

## Elegir el ícono y el color

- Usa un ícono de Ionicons que represente la sección (ej. `business` para
  temas de empresa, `document-text` para presupuestos, `people` para equipo).
- El degradado por defecto es `[colors.accent, colors.accent2]` (azul).
  Si la tarjeta necesita destacar una urgencia o aviso, usa
  `colorTint={colors.amberGlass}` en el `Glass` en vez del gradiente en el
  ícono.

## Después de generar

Verifica que la ruta pasada a `navigation.navigate` exista en `App.js` como
`<Stack.Screen name="...">`. Si no existe, avisa al usuario en vez de
inventar una ruta.
