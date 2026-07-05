export const colors = {
  // Fondos — azul noche profundo estilo fintech
  bg: '#070B14',
  bgCard: '#0D1424',
  bgCard2: '#111A2E',
  bgCard3: '#172038',

  // Bordes sutiles
  border: '#1E2D4A',
  border2: '#253350',

  // Azul eléctrico — acento principal
  blue: '#3D7EFF',
  blueLight: '#0A1836',
  blueBright: '#5B96FF',

  // Semánticos
  green: '#00C48C',
  greenLight: '#001F16',
  red: '#FF4D4D',
  redLight: '#1F0909',
  amber: '#FFB830',
  purple: '#8B5CF6',

  // Tipografía
  text: '#E8EDF5',
  textMuted: '#7A8BA8',
  textFaint: '#2A3A56',
};

// Escala de espaciado — ritmo consistente en toda la app
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// Radios de borde — todo redondeado de forma consistente
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

// Escala tipográfica — jerarquía clara, tipo Apple/Uber (bold + grande arriba, calmo abajo)
export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '500' },
  small: { fontSize: 12, fontWeight: '500' },
  tiny: { fontSize: 11, fontWeight: '600' },
};

// Sombras suaves en vez de bordes duros — dan profundidad sin recargar
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  }),
};
