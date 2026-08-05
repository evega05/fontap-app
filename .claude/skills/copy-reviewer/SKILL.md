---
name: copy-reviewer
description: Revisa el tono, la longitud y la consistencia de los textos visibles al usuario (Text, placeholders, mensajes de error/confirmación) en una pantalla de fontap-app, comparándolos con el estilo ya establecido en el resto de la app. Usar cuando se pide revisar/mejorar la redacción, el copy, o los mensajes que ve el usuario. NO usar para revisar calidad o estructura del código (esa es la skill global simplify de Claude Code) — esta skill mira solo el contenido de los textos, no el código que los rodea.
---

# Revisor de copy

## El tono establecido en este proyecto

- Español de España, cercano pero profesional. Tuteo consistente ("tú" no
  "usted") en toda la app.
- Frases cortas y directas en botones ("Guardar", "Confirmar pago en
  efectivo →", no "Proceder a guardar los cambios realizados").
- Emojis usados con moderación, casi siempre al inicio de un título o
  estado (🎉, ⚠️, ✅, 💵) — no en cada línea de texto suelta.
- Mensajes de error explican qué pasó y qué hacer, sin tecnicismos:
  ejemplos reales del proyecto son `mensajeError(e, 'No se pudo enviar la
  oferta')` — un mensaje de fallback humano, no el error crudo del backend.
- Confirmaciones destructivas nombran explícitamente qué se pierde (ver
  skill `confirm-modal-generator`), no solo "¿Estás seguro?".

## Cómo hacer la revisión

1. Lista todos los strings visibles en el JSX de la pantalla indicada:
   contenido de `<Text>`, `placeholder` de `<TextInput>`, textos pasados a
   `avisar()`/`confirmarAccion()`.
2. Para cada uno, evalúa:
   - **Tono**: ¿tutea? ¿sigue siendo cercano sin ser informal de más?
   - **Longitud**: ¿un botón tiene un texto tan largo que se vería mal en
     una pantalla de teléfono angosta?
   - **Consistencia**: ¿usa el mismo verbo/estructura que pantallas
     similares? (ej. si otras pantallas dicen "Guardar", no uses "Aceptar"
     para la misma acción).
   - **Claridad de error**: si es un mensaje de error, ¿le dice al usuario
     qué hacer, o solo que algo falló?
3. Propone la reescritura línea por línea, no reescribas el archivo
   completo sin mostrar antes/después.

## Qué NO hacer

No toques la lógica del componente, nombres de variables, ni estructura de
estilos — esta skill es exclusivamente sobre el texto que lee el usuario.
Si además hay una traducción a euskera/inglés en `i18n.js` para ese texto,
señálalo pero no la reescribas vos mismo sin confirmar — usa la skill
`i18n-audit` para el chequeo de completitud de traducciones.
