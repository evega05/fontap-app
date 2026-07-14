// Dirección visual "Cristal": vidrio esmerilado sobre un degradado casi negro,
// acento en azul. Ver /components/Glass.js para las superficies.

export const colors = {
  // Fondo — degradado oscuro, casi negro (usar bgGradient con expo-linear-gradient)
  bg: '#07080E',
  bgGradient: ['#1D2A4E', '#0F1526', '#07080E'],

  // Vidrio — superficies translúcidas
  glass: 'rgba(255,255,255,0.09)',
  glassStrong: 'rgba(28,31,42,0.82)',
  glassSoft: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.17)',
  glassBorderStrong: 'rgba(255,255,255,0.22)',

  // Acentos — azul como color principal (degradado en botones/CTAs)
  accent: '#4C7CFF',
  accent2: '#2F5CE8',

  // Semánticos — distintos del acento, para estado
  green: '#3DDC97',
  greenGlass: 'rgba(61,220,151,0.16)',
  red: '#FF6B81',
  redGlass: 'rgba(255,107,129,0.16)',
  amber: '#FFC85C',
  amberGlass: 'rgba(255,200,92,0.16)',
  purple: '#B49CFF',
  purpleGlass: 'rgba(180,156,255,0.16)',

  // Tipografía
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.35)',

  // Alias heredados — para pantallas aún no migradas al vidrio, mantiene coherencia visual
  bgCard: 'rgba(255,255,255,0.09)',
  bgCard2: 'rgba(255,255,255,0.06)',
  bgCard3: 'rgba(255,255,255,0.11)',
  border: 'rgba(255,255,255,0.17)',
  border2: 'rgba(255,255,255,0.22)',
  blue: '#4C7CFF',
  blueLight: 'rgba(76,124,255,0.18)',
  blueBright: '#6E96FF',
  greenLight: 'rgba(61,220,151,0.14)',
  redLight: 'rgba(255,107,129,0.14)',
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

// Radios de borde — vidrio = todo bien redondeado
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  full: 999,
};

// Escala tipográfica
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

// Sombras — más difusas y frías, propias del vidrio flotando sobre el degradado
export const shadow = {
  sm: {
    shadowColor: '#04101C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  md: {
    shadowColor: '#04101C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 9,
  },
  lg: {
    shadowColor: '#04101C',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 18,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  }),
};
