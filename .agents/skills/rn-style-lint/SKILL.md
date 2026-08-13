---
name: rn-style-lint
description: Verifica que un archivo de pantalla de fontap-app compile (babel-parse) y que cada clave usada como s.xxx en el JSX tenga su definición correspondiente en StyleSheet.create. Usar antes de dar por terminada una pantalla editada, o cuando se sospecha un error de sintaxis o un estilo faltante. NO usar para revisar diseño visual o qué sistema de estilos usa una pantalla (esa es visual-consistency-audit), ni para revisar lógica de negocio o vulnerabilidades (usa las skills globales simplify/security-review de Claude Code).
---

# Chequeo de sintaxis + estilos RN

Este proyecto no tiene un entorno de test/build corriendo permanentemente,
así que los errores de sintaxis o de claves de estilo faltantes solo se
detectan al ejecutar la app de verdad — o con este chequeo estático rápido,
que no requiere levantar nada.

## Paso 1: verificar sintaxis con babel-parse

```bash
cd fontap-app
npx --yes -p @babel/parser node -e "
const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('screens/NombrePantalla.js', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx','optionalChaining','nullishCoalescingOperator'] });
  console.log('OK');
} catch (e) { console.log('FAIL', e.message); }
"
```

Si `node_modules` ya está instalado (ver hook `session-start.sh`), podés
usar `node_modules/.bin` directamente en vez de `npx --yes -p` para que sea
más rápido.

## Paso 2: cruzar claves de estilo usadas vs definidas

```bash
node -e "
const fs = require('fs');
const code = fs.readFileSync('screens/NombrePantalla.js', 'utf8');
const styleBlockMatch = code.match(/const s = StyleSheet\.create\(\{([\s\S]*)\}\);\s*\$/);
const defined = new Set();
const defRe = /^\s*([A-Za-z0-9_]+):\s*\{/gm;
let m;
const block = styleBlockMatch[1];
while ((m = defRe.exec(block))) defined.add(m[1]);
const usedRe = /\bs\.([A-Za-z0-9_]+)/g;
const used = new Set();
while ((m = usedRe.exec(code))) used.add(m[1]);
const missing = [...used].filter(u => !defined.has(u));
console.log('missing style keys:', missing);
"
```

### Falsos positivos conocidos a ignorar

- Nombres de una sola letra reusados como variable de map/filter (ej.
  `array.filter(s => s.id !== x)`) — el script los detecta como si fueran
  `s.id` del StyleSheet. Si la clave "faltante" es algo genérico como `id`,
  `map`, `filter`, `length`, es casi seguro un falso positivo, no un bug
  real.
- Claves con letras acentuadas (`añadirCard`, `btnAñadir`) — la regex de
  detección de uso solo captura `[A-Za-z0-9_]`, así que puede cortar el
  nombre a mitad de camino (`s.añadirCard` se detecta como `s.a`). Verificá
  manualmente si el "faltante" reportado es una sola letra sospechosa.

## Qué reportar

Solo errores reales: fallo de sintaxis con su mensaje exacto, o claves de
estilo genuinamente indefinidas (después de descartar los falsos positivos
de arriba). No reportes nada sobre diseño, legibilidad o estructura del
código — esta skill es puramente sintaxis + integridad de estilos.
