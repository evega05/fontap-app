# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Trabajo con múltiples agentes de IA en este repo

Más de un agente de IA (Claude Code, u otro) puede estar editando este
repo en paralelo, sobre el mismo branch. El riesgo no es que un agente "no
sepa programar" — es pisarse: sobrescribir lo que otro acaba de subir, o
construir sobre una base ya desactualizada. Seguí este protocolo siempre.

## 1. Sincronizar antes de tocar nada

Antes de editar un archivo, actualizá tu copia del historial remoto y
revisá si hay commits que no reconocés:

```bash
git fetch origin claude/github-repo-access-scope-ptjkav
git log HEAD..origin/claude/github-repo-access-scope-ptjkav --oneline
```

Si aparece algo, **leelo antes de construir encima** (`git show <hash>`).
No asumas que tu copia local es la versión actual — otro agente pudo haber
arreglado el mismo problema, de otra forma, minutos antes. Si hay commits
nuevos, `git merge --ff-only origin/claude/github-repo-access-scope-ptjkav`
antes de seguir.

## 2. Verificar contra la doc versionada de Expo

Ya está arriba: SDK 56, `https://docs.expo.dev/versions/v56.0.0/`. No te
guíes por memoria genérica de Expo ni por cómo se hacía en otra versión —
la API cambia entre SDKs.

## 3. Patrón de robustez acordado

- **Manejo de errores de red**: siempre `mensajeError(e, 'mensaje de
  fallback humano')` (definido en `errores.js`), nunca mostrar
  `e.response.data.detail` crudo en un `<Text>` — FastAPI devuelve ese
  campo como string en errores 400/403/404 pero como lista de objetos en
  errores de validación 422, y eso revienta el render si no se normaliza.
- **Confirmaciones destructivas**: usar el patrón `confirmarAccion`/
  `avisar` de `confirmar.js` (cross-platform, sin `Alert.alert` nativo
  directo) — ver skill `confirm-modal-generator`.
- **Diseño visual**: este repo tiene dos sistemas conviviendo (Glass/
  cristal vs StyleSheet plano) — ver skill `visual-consistency-audit` antes
  de decidir cuál seguir en una pantalla nueva.
- **Gremios/i18n/columnas de modelo**: antes de tocar esas áreas, mirar si
  ya existe una skill de proyecto que cubra el checklist completo
  (`gremio-onboarding`, `i18n-audit`, y su equivalente de backend
  `model-column-migration`) para no dejar algo desincronizado entre
  fontap-app y fontap-backend.

## 4. No dar nada por terminado sin verificar

Este proyecto no tiene script de lint/typecheck ni de tests configurado en
`package.json` (solo `start`/`android`/`ios`/`web`). Verificar así:

1. Chequeo de sintaxis: parseo con babel de los archivos tocados (ver
   skill `rn-style-lint`, que además valida que cada `s.xxx` usado en el
   JSX tenga su definición en `StyleSheet.create`).
2. Si el cambio es una feature completa (no solo un ajuste chico), probar
   de verdad con Expo web + Playwright headless — ver skill
   `e2e-test-orchestrator`, que ya documenta cómo levantar backend+frontend
   local y limpiar todo al terminar (incluida la lección del bug real de
   `.bak` que dejó URLs de prueba puestas — leer esa skill antes de hacer
   un sed-swap de URLs a mano).

## 5. Commits chicos y frecuentes

Un commit por cambio lógico, no una sesión entera junta. El mensaje
explica el **por qué**, no el qué — el diff ya dice el qué.

## 6. Fetch de nuevo justo antes del push

No alcanza con el fetch del paso 1 — repetilo al terminar:

```bash
git fetch origin claude/github-repo-access-scope-ptjkav
git log HEAD..origin/claude/github-repo-access-scope-ptjkav --oneline
```

Si hay conflicto, no lo resuelvas a lo bruto (`--force`, aceptar "el mío" a
ciegas) — investigá qué hizo el otro agente y conciliá a propósito.

## 7. Fuente única del protocolo

Si este archivo queda desactualizado respecto a cómo se trabaja de
verdad, se actualiza este archivo — no se inventa un protocolo paralelo.
