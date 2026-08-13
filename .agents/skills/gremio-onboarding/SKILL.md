---
name: gremio-onboarding
description: Checklist de todos los archivos a tocar en fontap-app y fontap-backend para dar de alta un gremio/oficio nuevo (ej. "jardinería avanzada") sin dejar ninguno desincronizado. Usar cuando se pide agregar/dar de alta un gremio, oficio o categoría profesional nueva a la plataforma. NO usar para crear un endpoint o pantalla genérica sueltos sin relación a gremios (usa backend-endpoint-scaffold/screen-scaffold) — esta skill es una checklist de orquestación, no genera código por sí sola.
---

# Alta de gremio nuevo end-to-end

Un gremio nuevo toca ambos repos en varios puntos. Olvidar alguno deja el
gremio "a medias" (ej. aparece en el registro pero no tiene catálogo de
servicios, o se puede elegir pero el mapa no le pone ícono). Esta skill es
una checklist — para cada paso, usa la skill específica correspondiente si
existe, no reinventes el código a mano.

## Checklist completa

### Backend (fontap-backend)
1. **`app/main.py`**, constante `GREMIOS_VALIDOS` (o el nombre de la lista/
   enum equivalente en el momento de ejecutar esta skill — buscar por
   `grep -n "GREMIOS_VALIDOS" app/main.py`): agregar el valor nuevo del
   gremio, en minúsculas, sin espacios (ej. `jardineria_avanzada`).
2. **`app/schemas.py`**: si `UsuarioRegistro.gremio` usa un `Literal[...]`
   con la lista de gremios válidos (verificar con
   `grep -n "gremio: Literal" app/schemas.py`), agregar el valor ahí
   también — si no coincide con `GREMIOS_VALIDOS` del paso 1, el registro
   fallará con un error de validación confuso.

### Frontend (fontap-app)
3. **`gremios.js`**: agregar la entrada al array `GREMIOS` con
   `{ valor, emoji, clave }` (usar la skill `category-icon-assigner` para
   elegir el emoji) y agregar el catálogo de servicios del gremio a
   `SERVICIOS_POR_GREMIO` (lista de `{ nombre, emoji }` típicos de ese
   oficio, mirar los gremios existentes como referencia de formato y
   cantidad — normalmente 5-10 servicios).
4. **`screens/MapComponent.web.js`** y **`screens/MapComponent.native.js`**:
   confirmar que el emoji nuevo se resuelve correctamente en los pines del
   mapa (ambos leen de `gremios.js`, así que si el paso 3 está bien hecho
   esto normalmente ya funciona solo — pero verificar igual).
5. **`screens/RegistroScreen.js`**: si el selector de gremio se genera
   dinámicamente desde `GREMIOS` (verificar con
   `grep -n "GREMIOS" screens/RegistroScreen.js`), no hace falta tocar
   nada aquí — si está hardcodeado, hay que agregar la opción a mano.

## Verificación final

Después de tocar todos los puntos, correr una prueba rápida: registrar un
profesional de prueba con el gremio nuevo (ver skill `demo-data-seeder` del
backend o un curl directo a `/registro`) y confirmar que aparece con su
ícono correcto en el mapa y su catálogo de servicios al elegir "Reservar
cita" desde cero.

## Qué NO hacer

No agregues el gremio solo en un repo "para probar después" — la
desincronización entre backend y frontend es exactamente el tipo de bug que
esta skill existe para evitar. Completá el checklist entero antes de dar
la tarea por terminada.
