import { Pressable as RNPressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Botón/tarjeta presionable con feedback visual (escala + opacidad) y háptico.
// Envuelve el Pressable nativo de RN — cero dependencias nuevas, funciona igual en web y nativo.
export default function Pressable({ style, onPress, haptic = true, scaleTo = 0.96, children, ...rest }) {
  const manejarPress = (e) => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  return (
    <RNPressable
      onPress={manejarPress}
      style={({ pressed }) => [
        style,
        pressed && { opacity: 0.85, transform: [{ scale: scaleTo }] },
      ]}
      {...rest}
    >
      {children}
    </RNPressable>
  );
}
