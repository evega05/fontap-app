---
name: wizard-flow-scaffold
description: Genera el esqueleto de un flujo multi-paso (wizard) en fontap-app, siguiendo el patrón de SolicitudScreen.js (paso de gremio → servicio → detalles → cuándo). Usar únicamente cuando el pedido implica una secuencia de 2 o más pasos con avance secuencial, tipo "paso 1 de 3". NO usar para una pantalla de una sola vista (usa screen-scaffold o frontend-data-screen-scaffold en su lugar).
---

# Armador de flujo por pasos (wizard)

`SolicitudScreen.js` es la referencia de este patrón en el proyecto: un
cliente reserva un servicio pasando por varios pasos secuenciales, con un
contador dinámico de pasos totales que cambia según el contexto (si ya hay
un profesional preseleccionado, se saltan pasos).

## Estructura base

```jsx
const [paso, setPaso] = useState(1);
const TOTAL_PASOS = /* calcular dinámicamente si algunos pasos son opcionales */ 3;

// contador de progreso
<View style={s.progresoRow}>
  {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
    <View key={i} style={[s.progresoBarra, i < paso && s.progresoBarraActiva]} />
  ))}
</View>
<Text style={s.progresoTexto}>{paso}/{TOTAL_PASOS}</Text>

{paso === 1 && (
  <View>
    {/* contenido del paso 1 */}
    <TouchableOpacity
      style={[s.btnContinuar, !condicionParaAvanzar && s.btnOff]}
      onPress={() => setPaso(2)}
      disabled={!condicionParaAvanzar}
    >
      <Text style={s.btnContinuarText}>Continuar →</Text>
    </TouchableOpacity>
  </View>
)}

{paso === 2 && ( /* ... */ )}
```

## Principios del patrón (aprendidos de SolicitudScreen.js)

- **El botón "Continuar" siempre está deshabilitado hasta que el paso
  actual tenga una respuesta válida** — nunca dejes avanzar con un campo
  vacío/sin elegir.
- **Si un paso puede saltarse según contexto** (ej. si ya viene un dato por
  `route.params`), calcula `TOTAL_PASOS` dinámicamente y ajusta a qué paso
  arranca el wizard, en vez de mostrar un paso vacío que no aporta nada.
- **El último paso siempre envía la petición al backend**, no antes — los
  pasos previos solo acumulan estado local (`useState`) sin llamadas a la
  API hasta confirmar.
- Usa un grid de tarjetas seleccionables (`s.grid`/`s.servicioCard` como en
  `SolicitudScreen.js`) para pasos de tipo "elegí una opción de una lista",
  no un `<Picker>` nativo — mantiene consistencia visual con el resto de la
  app.

## Qué NO hacer

No metas lógica de negocio del backend en el frontend (ej. validar reglas
de negocio complejas) — cada paso valida solo que el campo esté completo;
la validación de negocio real vive en el backend y se maneja como error al
enviar el último paso.
