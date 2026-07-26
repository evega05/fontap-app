// FastAPI devuelve `detail` como texto en los errores de negocio (400, 403, 404...)
// pero como una lista de objetos {type, loc, msg, input} en los errores de validación (422).
// Sin esto, pasar `detail` directo a un <Text> revienta con "Objects are not valid as a React child".
export function mensajeError(e, porDefecto) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) return detail.map(d => d?.msg || String(d)).join(' ');
  return porDefecto;
}
