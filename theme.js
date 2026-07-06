// Dirección visual "Cristal": vidrio esmerilado sobre un degradado profundo,
// acentos periwinkle + menta. Ver /components/Glass.js para las superficies.

export const colors = {
  // Fondo — degradado profundo (usar bgGradient con expo-linear-gradient)
  bg: '#0A1A2A',
  bgGradient: ['#2C3E6B', '#123044', '#0A1A2A'],

  // Vidrio — superficies translúcidas
  glass: 'rgba(255,255,255,0.08)',
  glassStrong: 'rgba(255,255,255,0.14)',
  glassSoft: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassBorderStrong: 'rgba(255,255,255,0.28)',

  // Acentos — periwinkle + menta (degradado en botones/CTAs)
  accent: '#7C9CFF',
  accent2: '#4CE0D2',

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
  text: '#F5F7FF',
  textMuted: 'rgba(245,247,255,0.6)',
  textFaint: 'rgba(245,247,255,0.35)',

  // Alias heredados — para pantallas aún no migradas al vidrio, mantiene coherencia visual
  bgCard: 'rgba(255,255,255,0.08)',
  bgCard2: 'rgba(255,255,255,0.06)',
  bgCard3: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.16)',
  border2: 'rgba(255,255,255,0.2)',
  blue: '#7C9CFF',
  blueLight: 'rgba(124,156,255,0.16)',
  blueBright: '#9DB4FF',
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
