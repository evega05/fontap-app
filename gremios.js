// Fuente única de gremios y de los tipos de servicio propios de cada oficio.
// Se usa en el registro (elegir gremio + servicios base), en la solicitud del
// cliente (qué necesita) y en el filtro del mapa.

export const GREMIOS = [
  { valor: 'fontanero', emoji: '🔧', clave: 'gremioFontanero' },
  { valor: 'electricista', emoji: '⚡', clave: 'gremioElectricista' },
  { valor: 'cerrajero', emoji: '🔑', clave: 'gremioCerrajero' },
  { valor: 'pintor', emoji: '🎨', clave: 'gremioPintor' },
  { valor: 'carpintero', emoji: '🪚', clave: 'gremioCarpintero' },
  { valor: 'albanil', emoji: '🧱', clave: 'gremioAlbanil' },
  { valor: 'climatizacion', emoji: '❄️', clave: 'gremioClimatizacion' },
  { valor: 'jardinero', emoji: '🌿', clave: 'gremioJardinero' },
  { valor: 'limpieza', emoji: '🧹', clave: 'gremioLimpieza' },
  { valor: 'mudanzas', emoji: '📦', clave: 'gremioMudanzas' },
  { valor: 'montador', emoji: '🪑', clave: 'gremioMontador' },
  { valor: 'cristalero', emoji: '🪟', clave: 'gremioCristalero' },
];

export const GREMIOS_VALORES = GREMIOS.map((g) => g.valor);

export const SERVICIOS_POR_GREMIO = {
  fontanero: [
    { nombre: 'Desatasco', emoji: '🚽' },
    { nombre: 'Fuga de agua', emoji: '💧' },
    { nombre: 'Caldera', emoji: '🔥' },
    { nombre: 'Grifo / ducha', emoji: '🚿' },
    { nombre: 'Radiador', emoji: '♨️' },
  ],
  electricista: [
    { nombre: 'Cortocircuito', emoji: '⚡' },
    { nombre: 'Instalación eléctrica', emoji: '🔌' },
    { nombre: 'Cuadro eléctrico', emoji: '🧯' },
    { nombre: 'Enchufes / interruptores', emoji: '🔘' },
    { nombre: 'Iluminación', emoji: '💡' },
  ],
  cerrajero: [
    { nombre: 'Apertura de puerta', emoji: '🚪' },
    { nombre: 'Cambio de cerradura', emoji: '🔑' },
    { nombre: 'Llaves perdidas', emoji: '🗝️' },
    { nombre: 'Puerta blindada', emoji: '🛡️' },
    { nombre: 'Caja fuerte', emoji: '🔒' },
  ],
  pintor: [
    { nombre: 'Pintura de interior', emoji: '🎨' },
    { nombre: 'Pintura de fachada', emoji: '🏠' },
    { nombre: 'Gotelé / alisado', emoji: '🧱' },
    { nombre: 'Barniz de madera', emoji: '🪵' },
    { nombre: 'Humedades', emoji: '💦' },
  ],
  carpintero: [
    { nombre: 'Muebles a medida', emoji: '🪑' },
    { nombre: 'Puertas y armarios', emoji: '🚪' },
    { nombre: 'Suelo de madera', emoji: '🪵' },
    { nombre: 'Reparación de muebles', emoji: '🔨' },
  ],
  albanil: [
    { nombre: 'Reforma', emoji: '🏗️' },
    { nombre: 'Alicatado', emoji: '🧱' },
    { nombre: 'Grietas y humedades', emoji: '🧰' },
    { nombre: 'Tabiques', emoji: '🧱' },
  ],
  climatizacion: [
    { nombre: 'Aire acondicionado', emoji: '❄️' },
    { nombre: 'Calefacción', emoji: '♨️' },
    { nombre: 'Reparación de caldera', emoji: '🔥' },
    { nombre: 'Mantenimiento', emoji: '🛠️' },
  ],
  jardinero: [
    { nombre: 'Poda', emoji: '🌳' },
    { nombre: 'Diseño de jardín', emoji: '🌷' },
    { nombre: 'Riego', emoji: '💧' },
    { nombre: 'Césped', emoji: '🌱' },
  ],
  limpieza: [
    { nombre: 'Limpieza del hogar', emoji: '🧹' },
    { nombre: 'Limpieza tras obra', emoji: '🧽' },
    { nombre: 'Limpieza de cristales', emoji: '🪟' },
    { nombre: 'Limpieza a fondo', emoji: '✨' },
  ],
  mudanzas: [
    { nombre: 'Mudanza completa', emoji: '📦' },
    { nombre: 'Transporte de muebles', emoji: '🚚' },
    { nombre: 'Guardamuebles', emoji: '🏬' },
  ],
  montador: [
    { nombre: 'Montaje de muebles', emoji: '🪑' },
    { nombre: 'Montaje de cocina', emoji: '🍽️' },
    { nombre: 'Colgar cuadros / TV', emoji: '🖼️' },
  ],
  cristalero: [
    { nombre: 'Cristal roto', emoji: '🪟' },
    { nombre: 'Mampara de ducha', emoji: '🚿' },
    { nombre: 'Doble acristalamiento', emoji: '❄️' },
  ],
};

export const OTRO_SERVICIO = { nombre: 'Otro', emoji: '🔧' };

export function serviciosDe(gremio) {
  return SERVICIOS_POR_GREMIO[gremio] || SERVICIOS_POR_GREMIO.fontanero;
}

// Emoji de un tipo de servicio concreto, buscando en todos los gremios
// (usado en el calendario, que no siempre sabe el gremio del hueco).
export function emojiDeServicio(nombre) {
  for (const lista of Object.values(SERVICIOS_POR_GREMIO)) {
    const encontrado = lista.find((s) => s.nombre === nombre);
    if (encontrado) return encontrado.emoji;
  }
  return '🧰';
}
