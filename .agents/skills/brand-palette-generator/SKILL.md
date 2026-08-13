---
name: brand-palette-generator
description: Genera las variantes de color (glass, glassBorder, versión clara/oscura, texto asociado) para un nuevo color de acento de la app fontap-app, siguiendo la estructura ya existente en theme.js. Usar cuando se pide una paleta, un color de marca nuevo, o variantes de un color para theme.js. Esto es exclusivamente para las pantallas de la app React Native — NO usar para diseñar Artifacts o páginas web mostradas en el chat (esa es la skill global artifact-design de Claude Code).
---

# Generador de paleta a partir de un color de marca

`theme.js` define los colores de la app como un objeto `colors` plano, no
con una función generadora — cada color nuevo se agrega a mano siguiendo el
patrón de los ya existentes. Esta skill genera las variantes correctas para
que encajen con lo que ya hay, en vez de inventar un formato distinto.

## Paso 1: lee la estructura actual

Antes de proponer nada, lee `theme.js` completo y fíjate en los patrones
existentes, por ejemplo:

```js
accent: '#4C7CFF',
accent2: '#2F5CE8',
blue: '#4C7CFF',
blueLight: 'rgba(76,124,255,0.18)',
glass: 'rgba(255,255,255,0.09)',
glassBorder: ... (revisa el valor real en el archivo),
amberGlass: ...,
redLight: ...,
```

El patrón es: un color base (hex sólido), y una variante "Light"/"Glass" en
`rgba()` con alpha bajo (~0.15-0.20) del mismo tono, usada como fondo de
tarjetas/chips activos.

## Paso 2: genera las variantes para el color nuevo

Dado un hex de entrada (ej. `#E8734C` para un acento naranja):

1. **Color base**: el hex tal cual, para texto/íconos/bordes activos.
2. **Variante "Light"** (fondo de estado activo): mismo tono en
   `rgba(R,G,B,0.18)` — convertí el hex a RGB y usá ese alpha.
3. **Variante "Glass"** si la paleta la necesita para un banner tipo aviso
   (como `colors.amberGlass`): mismo tono en `rgba(R,G,B,0.14)`.
4. Nombra las claves siguiendo la convención existente: `nuevoColor`,
   `nuevoColorLight` (no inventes otro sufijo).

## Paso 3: verifica contraste

Antes de entregar la paleta, usa la skill `contrast-checker` (o el mismo
criterio: texto claro `#fff`/`colors.text` sobre el color base debe superar
un contraste razonable) para confirmar que el color base sirve como fondo de
botón con texto blanco encima, si ese es el uso previsto.

## Qué NO hacer

No propongas un sistema de theming nuevo (ej. una función `generatePalette()`
o tokens con otra convención) — el proyecto usa un objeto plano a propósito,
mantené la simplicidad existente. Y no generes paletas para páginas web o
Artifacts — esta skill es solo para `theme.js` de la app móvil.
