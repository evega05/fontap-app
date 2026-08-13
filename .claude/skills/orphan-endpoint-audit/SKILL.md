---
name: orphan-endpoint-audit
description: Cruza las rutas @app.get/post/put/delete de fontap-backend/app/main.py contra las llamadas axios.get/post/put/delete de fontap-app, señalando endpoints del backend sin ningún consumidor en el frontend, o llamadas del frontend a rutas que no existen en el backend. Usar cuando se pregunta si hay endpoints sin usar, código muerto de API, o antes de una limpieza grande del backend. NO usar para revisar seguridad (usa la skill global security-review de Claude Code) ni para el bug específico de confundir Fontanero.id con usuario_id (usa id-convention-reviewer).
---

# Auditoría de endpoints huérfanos

## Cómo hacer la auditoría

Necesita ambos repos disponibles. Si solo tenés uno clonado en la sesión
actual, avisá que el resultado será parcial (puede haber falsos positivos
de "endpoint sin consumidor" si el consumidor está en el repo que falta).

### Paso 1: extraer todas las rutas del backend

```bash
cd fontap-backend
grep -oE '@app\.(get|post|put|delete)\("[^"]+"' app/main.py | sed 's/@app\.\w*("//;s/"$//' | sort -u
```

Normalizá los parámetros de path (`{servicio_id}`, `{fontanero_id}`, etc.)
a un placeholder genérico como `{id}` para poder comparar con las llamadas
del frontend, que arman la URL con template strings.

### Paso 2: extraer todas las llamadas del frontend

```bash
cd fontap-app
grep -rohE "axios\.(get|post|put|delete)\(\`\\\$\{API\}[^,)\`]*" screens/*.js *.js | sed 's/axios\.\w*(`\${API}//'
```

Normalizá igual los interpolados (`${servicioId}`, `${userId}`, etc.) a
`{id}`.

### Paso 3: comparar

- **Rutas del backend sin match en el frontend**: candidatas a "huérfanas"
  — pero antes de reportarlas como muertas, verificá que no las use el
  panel admin (`app/static/admin.html`, que llama a la API con `fetch`
  directo, no axios) ni un webhook externo (Stripe, Google) que no pasa
  por el frontend.
- **Llamadas del frontend sin match en el backend**: son las más
  peligrosas — significa que una pantalla está pegándole a una ruta que ya
  no existe o nunca existió, y probablemente falla en producción ahora
  mismo.

## Formato del reporte

Tabla con: ruta, dónde se define (backend), dónde se consume (frontend, o
"ninguno encontrado"), y una nota si aplica alguna excepción (admin.html,
webhook).

## Qué NO hacer

No borres endpoints "huérfanos" automáticamente — a veces un endpoint
existe para un cliente externo, un webhook, o una versión de la app que
todavía no se actualizó en el móvil de algún usuario. Reportá y dejá que el
usuario decida.
