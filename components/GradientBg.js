import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// Fondo de degradado profundo compartido por toda la app en la dirección "Cristal".
export default function GradientBg({ style, children }) {
  return (
    <LinearGradient
      colors={colors.bgGradient}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </LinearGradient>
  );
}
