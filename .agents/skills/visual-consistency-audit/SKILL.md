---
name: visual-consistency-audit
description: Audita qué pantallas de fontap-app usan el sistema de diseño "cristal" (Glass/Pressable/FadeInUp/GradientBg) frente a las que usan StyleSheet plano con colores de theme.js, para decidir qué migrar y en qué orden. Usar cuando se pregunta por consistencia visual, qué pantallas están "desactualizadas" de diseño, o antes de decidir qué patrón seguir en una pantalla nueva. NO usar para errores de sintaxis o claves de estilo faltantes (eso es rn-style-lint) ni para revisar lógica de negocio o seguridad (usa las skills globales simplify/security-review de Claude Code para eso).
---

# Auditoría de consistencia visual (cristal vs plano)

Este proyecto tiene dos sistemas de estilo conviviendo:

- **"Cristal"**: pantallas más nuevas que importan `Glass`, `Pressable` (de
  `../components/Pressable`), `FadeInUp`, `GradientBg`. Usan blur real,
  velos translúcidos y gradientes (`colors.accent`/`colors.accent2`).
  Ejemplos: `PanelFontaneroScreen.js`, `PerfilFontaneroPublicoScreen.js`.
- **Plano**: pantallas que usan `StyleSheet.create` directo con `colors` de
  `theme.js`, sin componentes de vidrio. Ejemplos: `PanelGestionScreen.js`,
  `EquipoScreen.js`, `OfertasScreen.js`.

Ninguno es "incorrecto" — ambos son válidos hoy en el proyecto — pero mezclar
los dos estilos dentro de una misma pantalla o feature se ve inconsistente.

## Cómo hacer la auditoría

1. Lista todos los archivos en `screens/*.js`.
2. Para cada uno, revisa sus imports: si tiene `import Glass from
   '../components/Glass'` (o Pressable/FadeInUp/GradientBg), es "cristal".
   Si no, y tiene `StyleSheet.create` con `colors.xxx`, es "plano".
3. Agrupa el resultado en dos listas y preséntalo como tabla:
   `pantalla | sistema | última vez que se tocó (opcional, si hay contexto de git log)`.

```bash
for f in screens/*.js; do
  if grep -q "from '../components/Glass'" "$f"; then
    echo "CRISTAL: $f"
  elif grep -q "StyleSheet.create" "$f"; then
    echo "PLANO: $f"
  fi
done
```

## Qué recomendar

- Si el usuario va a tocar una pantalla "plana" de todos modos por otra
  razón, es buen momento para migrarla a "cristal" — pero no lo hagas sin
  que te lo pidan explícitamente, es trabajo extra no solicitado.
- Si el usuario pregunta "¿debería usar cristal o plano para esta pantalla
  nueva?", la respuesta depende de si la pantalla vive en un flujo ya
  migrado (ej. cerca de `PanelFontaneroScreen`) o uno todavía plano (ej.
  cerca de `PanelGestionScreen`) — seguí el patrón de las pantallas vecinas
  para no mezclar dentro del mismo flujo.

## Qué NO hacer

No reportes errores de sintaxis, claves de `StyleSheet` sin definir, ni
problemas de lógica — esta skill es puramente sobre qué sistema de diseño
usa cada pantalla, no sobre si el código funciona.
