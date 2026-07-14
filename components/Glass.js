import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme';

// Superficie de vidrio esmerilado: blur real + velo translúcido + borde de luz.
// `strong` para superficies más opacas (hojas, modales); por defecto, tarjetas sutiles.
export default function Glass({ style, strong = false, intensity, tint = 'dark', colorTint, children, ...rest }) {
  return (
    <View style={[s.wrap, style]} {...rest}>
      <BlurView
        intensity={intensity ?? (strong ? 55 : 35)}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colorTint ?? (strong ? colors.glassStrong : colors.glass) },
        ]}
      />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
});
