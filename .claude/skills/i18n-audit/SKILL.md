---
name: i18n-audit
description: Recorre i18n.js de fontap-app y señala claves de traducción que falten en español, euskera o inglés, o textos nuevos en pantallas que todavía no pasaron por el sistema de traducción. Usar específicamente cuando se pregunta por cobertura de idiomas, claves faltantes en eu/en, o textos sin pasar por t('clave'). NO usar para revisar tono, longitud o redacción de un texto que ya está traducido (esa es la skill copy-reviewer) — esta skill solo verifica que el texto exista en los 3 idiomas, no si está bien escrito.
---

# Auditor de traducciones

La app soporta español, euskera e inglés vía `i18n.js`. No toda la app pasa
por este sistema todavía — muchas pantallas más nuevas tienen texto en
español embebido directo en el JSX sin usar `t('clave')`. Esta skill audita
ambos problemas por separado.

## Paso 1: claves incompletas dentro de i18n.js

1. Lee `i18n.js` y localiza la estructura de traducciones (normalmente un
   objeto por idioma: `es`, `eu`, `en`).
2. Lista todas las claves presentes en `es` (el idioma base, siempre más
   completo).
3. Para cada clave, comprueba si existe también en `eu` y en `en`.
4. Reporta las que falten, agrupadas por idioma faltante.

```bash
node -e "
const i18n = require('./i18n.js'); // ajustar según cómo exporte el módulo
const claves = Object.keys(i18n.es || {});
for (const idioma of ['eu', 'en']) {
  const faltantes = claves.filter(c => !(idioma in (i18n[idioma] || {})));
  console.log(idioma, 'le faltan:', faltantes);
}
"
```

Si el `require` directo no funciona por cómo está estructurado el archivo,
leé el archivo como texto y compará las claves con una expresión regular en
vez de ejecutarlo.

## Paso 2: texto embebido que no pasó por t()

Esto es más una revisión de contexto que un chequeo automático perfecto:
busca en la pantalla indicada strings largos dentro de `<Text>` que no
estén envueltos en `t('...')` ni sean claramente técnicos (nombres de
variables, valores numéricos). Reporta cada uno con la línea, para que el
usuario decida si vale la pena migrarlo al sistema de traducción o si esa
pantalla todavía no lo usa (revisa primero si pantallas vecinas del mismo
flujo ya usan `t()` — si ninguna lo hace, probablemente ese flujo entero
todavía no está internacionalizado y no hace falta empezar por ahí sin que
te lo pidan).

## Qué NO hacer

No traduzcas vos mismo los textos faltantes sin que te lo pidan
explícitamente — señalá qué falta y dejá que el usuario decida el texto
exacto, especialmente para euskera donde una mala traducción automática es
peor que dejarlo pendiente.
