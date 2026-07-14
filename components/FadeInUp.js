import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Entrada animada tipo "stagger": cada elemento aparece con fade + deslizamiento hacia arriba,
// con un pequeño retraso según su posición en la lista (index) para dar sensación de fluidez.
export default function FadeInUp({ children, index = 0, delay = 0, distance = 16, style }) {
  const opacidad = useRef(new Animated.Value(0)).current;
  const traslado = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const retraso = delay + Math.min(index, 8) * 45;
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 380, delay: retraso, useNativeDriver: true }),
      Animated.spring(traslado, { toValue: 0, delay: retraso, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: opacidad, transform: [{ translateY: traslado }] }]}>
      {children}
    </Animated.View>
  );
}
