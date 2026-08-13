---
name: confirm-modal-generator
description: Genera el código de un diálogo de confirmación (sí/no) antes de una acción, usando el patrón confirmarAccion/avisar ya establecido en confirmar.js de fontap-app. Usar cuando se necesita confirmar una acción destructiva o importante (eliminar, cancelar, salir de un equipo, etc.) de forma consistente con el resto de la app. NO usar para pantallas completas (usa screen-scaffold) — esto es solo el diálogo puntual, funciona cross-platform (web y nativo) sin usar Alert.alert de React Native directamente.
---

# Generador de modal de confirmación estándar

Este proyecto reemplazó `Alert.alert` (que no funciona igual en web) por un
helper propio en `confirmar.js`: `confirmarAccion` para diálogos de sí/no, y
`avisar` para mensajes informativos de una sola opción.

## Patrón para confirmar una acción

```js
import { confirmarAccion } from '../confirmar';

const eliminarAlgo = (item) => {
  confirmarAccion(
    'Título corto de la pregunta',
    `Texto explicando qué va a pasar con ${item.nombre}.`,
    async () => {
      // acción a ejecutar si el usuario confirma
      try {
        await axios.delete(`${API}/ruta/${item.id}`, { headers });
        // actualizar estado local
      } catch (e) {
        avisar('Error', mensajeError(e, 'No se pudo completar la acción'));
      }
    },
    { textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar' }
  );
};
```

Para acciones especialmente destructivas (eliminar cuenta, salir de un
equipo), usa un `textoConfirmar` explícito sobre qué se pierde (ej. "Sí,
eliminar cuenta" no solo "Sí"), siguiendo el tono ya usado en
`AjustesCuentaScreen.js` y `EquipoScreen.js`.

## Patrón para un aviso simple (sin decisión)

```js
import { avisar } from '../confirmar';

avisar('Título', 'Mensaje explicando qué pasó.');
```

Usado típicamente en el `catch` de una petición, o para confirmar que algo
se envió correctamente (ej. `avisar('✅ Oferta enviada', 'El cliente recibirá tu propuesta')`).

## Qué NO hacer

No uses `Alert.alert` de `react-native` directamente en ninguna pantalla
nueva — no funciona en la versión web de la app y rompe la consistencia
visual con el resto del proyecto. Si ves `Alert.alert` en código existente
durante otra tarea, es candidato a migrar a este patrón, pero no lo hagas
sin que te lo pidan.
