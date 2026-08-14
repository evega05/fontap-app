// Decide a qué pantalla navegar cuando el usuario toca una notificación push,
// según el "tipo" y "referencia_id" que manda el backend (ver _crear_notificacion
// en el backend) y el tipo de cuenta (cliente/fontanero) de quien la recibe.

export function rutaParaNotificacion(data, usuario) {
  const tipo = data?.tipo;
  const referenciaId = data?.referencia_id;
  const esFontanero = usuario?.tipo === 'fontanero';

  if (!tipo) return null;

  if (tipo === 'mensaje' && referenciaId) {
    return { name: 'Chat', params: { servicioId: referenciaId } };
  }

  if (esFontanero) {
    switch (tipo) {
      case 'solicitud_directa':
      case 'solicitud_urgente':
      case 'pago_recibido':
      case 'oferta_aceptada':
      case 'resena':
      case 'verificacion':
      case 'documento':
      case 'cancelado':
        return { name: 'PanelFontanero', params: { nombre: usuario?.nombre, userId: usuario?.id } };
      case 'recordatorio':
        return { name: 'Calendario', params: { userId: usuario?.id } };
      case 'nueva_tarea':
        return { name: 'PanelEmpleado', params: { nombre: usuario?.nombre, userId: usuario?.id } };
      case 'tarea_actualizada':
        return { name: 'Equipo' };
      default:
        return { name: 'PanelFontanero', params: { nombre: usuario?.nombre, userId: usuario?.id } };
    }
  }

  // Cliente
  switch (tipo) {
    case 'eta':
    case 'en_camino':
      return referenciaId
        ? { name: 'Seguimiento', params: { servicioId: referenciaId } }
        : { name: 'MisServicios', params: { clienteId: usuario?.id } };
    case 'servicio_aceptado':
    case 'servicio_rechazado':
    case 'precio_enviado':
    case 'pago_recibido':
    case 'cancelado':
    case 'oferta':
    case 'recordatorio':
      return { name: 'MisServicios', params: { clienteId: usuario?.id } };
    default:
      return { name: 'MisServicios', params: { clienteId: usuario?.id } };
  }
}
