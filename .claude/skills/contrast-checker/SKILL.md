---
name: contrast-checker
description: Analiza los pares de color texto/fondo definidos en el StyleSheet.create de una pantalla de fontap-app y señala combinaciones de bajo contraste (texto poco legible sobre su fondo). Usar cuando se pregunta si un texto se lee bien, si hay problemas de legibilidad, o antes de dar por terminada una pantalla nueva con colores custom. Esto es exclusivamente para las pantallas de la app React Native — NO usar para Artifacts o páginas web (esa es la skill global artifact-design de Claude Code).
---

# Revisor de contraste texto/fondo

## Cómo hacer la revisión

1. Abre el archivo de pantalla indicado y localiza su bloque
   `const s = StyleSheet.create({ ... })`.
2. Para cada estilo que define `color` (texto) intenta identificar sobre qué
   fondo se renderiza: mira el `backgroundColor` del `View`/`Glass` padre en
   el JSX, o si no hay uno explícito, asume el fondo general de la pantalla
   (`colors.bg`, casi siempre muy oscuro en este proyecto — es una app con
   tema oscuro por defecto).
3. Calcula el contraste aproximado: convierte ambos colores a luminancia
   relativa y compara. No hace falta una precisión WCAG estricta — el
   objetivo es detectar casos obvios, no certificar accesibilidad legal.

Casos típicos a vigilar en este proyecto (tema oscuro por defecto):
- Texto con `colors.textFaint` o `colors.textMuted` sobre un fondo que ya es
  oscuro pero no tanto (ej. `colors.bgCard2` en vez de `colors.bg`) — puede
  quedar demasiado apagado.
- Colores de acento usados como texto pequeño sobre fondos `Glass` con poca
  opacidad — el blur de fondo puede variar según lo que haya detrás en
  tiempo real, así que un acento con poco contraste ya en el diseño
  estático es un riesgo doble.
- Texto blanco (`#fff`) sobre gradientes claros (poco frecuente en este
  proyecto, pero revisa si alguna pantalla usa `LinearGradient` con tonos
  pastel).

## Formato del reporte

Lista cada combinación sospechosa con: nombre del estilo, color de texto,
color de fondo estimado, y una valoración simple (bien / ajustado / mal).
No reescribas los estilos automáticamente — proponé el cambio y dejá que el
usuario confirme, ya que el contraste "ajustado" a veces es una decisión de
diseño intencional (ej. texto secundario que debe verse discreto).

## Qué NO hacer

No analices Artifacts, páginas HTML del panel admin (`app/static/admin.html`
en el backend) ni ningún elemento fuera de las pantallas React Native de
este repo.
