---
name: category-icon-assigner
description: Sugiere un emoji consistente para un gremio/categoría/tipo de servicio nuevo en fontap-app, y señala en qué archivos hay que registrarlo (gremios.js, MapComponent.web.js, MapComponent.native.js). Usar cuando se pide un ícono o emoji para algo nuevo del catálogo de servicios/gremios. NO usar para dar de alta un gremio completo end-to-end (esa es la skill gremio-onboarding, que incluye esta como uno de sus pasos).
---

# Asignador de iconografía por categoría

## Paso 1: revisa los emojis ya usados

Lee `gremios.js` y lista los emoji ya asignados a cada gremio en `GREMIOS`
(ej. 🔧 fontanero, ⚡ electricista, 🔑 cerrajero, 🎨 pintor...). El objetivo
es que el emoji nuevo no se confunda visualmente con uno existente y que
sea reconocible de un vistazo en un pin de mapa pequeño.

## Paso 2: propone el emoji

Elige un emoji que:
- Represente la herramienta o acción central del oficio (no un objeto
  genérico).
- Se vea claro incluso a tamaño de ícono de mapa (evita emojis con mucho
  detalle interno).
- No repita uno ya asignado a otro gremio.

Da 2-3 opciones si hay ambigüedad, con una breve razón para cada una.

## Paso 3: señala dónde registrarlo

El emoji tiene que aparecer en estos lugares para que el gremio nuevo se
vea igual de bien que los demás en toda la app (no lo edites automáticamente
salvo que te lo pidan, solo señala):

1. `gremios.js` — el array `GREMIOS`, entrada `{ valor, emoji, clave }`.
2. `screens/MapComponent.web.js` — función `crearIcono`, que arma el
   `L.divIcon` con el emoji embebido como texto.
3. `screens/MapComponent.native.js` — el `<Marker>` que muestra el emoji
   como `<Text>` superpuesto.
4. Si el gremio tiene servicios propios, también hace falta agregarlos al
   catálogo `SERVICIOS_POR_GREMIO` en `gremios.js` (ver skill
   `gremio-onboarding` para el checklist completo si es un gremio nuevo,
   no solo un ícono).

## Qué NO hacer

No inventes un sistema de iconos SVG custom — el proyecto usa emoji directo
como texto por simplicidad, mantené esa convención.
