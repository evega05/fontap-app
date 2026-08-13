---
name: frontend-data-screen-scaffold
description: Genera una pantalla nueva de fontap-app que consume la API desde el primer momento (axios + AuthContext + manejo de error vía errores.js). Usar cuando la pantalla nueva necesita traer o enviar datos reales al backend, no solo un esqueleto visual. NO usar para una pantalla vacía sin datos (usa screen-scaffold) ni para un flujo de varios pasos (usa wizard-flow-scaffold) — esta skill es para UNA vista que carga/envía datos.
---

# Scaffolding de pantalla con datos

## Patrón base

```jsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { avisar } from '../confirmar';
import { mensajeError } from '../errores';

const API = 'https://fontap-backend-production.up.railway.app';

export default function NuevaScreen({ navigation, route }) {
  const { usuario, token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ruta`, { headers });
      setDatos(res.data || []);
    } catch (e) {} // errores silenciosos en carga inicial son aceptables en este proyecto
    finally { setCargando(false); setRefrescando(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const enviarAlgo = async (payload) => {
    try {
      await axios.post(`${API}/ruta`, payload, { headers });
      cargar();
    } catch (e) {
      avisar('Error', mensajeError(e, 'No se pudo completar la acción'));
    }
  };

  return (
    <View style={s.container}>
      {/* header igual que screen-scaffold */}
      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.blue} size="large" /></View>
      ) : (
        <ScrollView
          style={s.lista}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={colors.blue} />}
        >
          {/* renderizar datos, o estado vacío si datos.length === 0 */}
        </ScrollView>
      )}
    </View>
  );
}
```

## Convenciones a respetar

- `API` es siempre la constante hardcodeada con la URL de producción de
  Railway al tope del archivo — así lo hace cada pantalla en este proyecto,
  no uses una variable de entorno.
- Los errores de **carga inicial** (`cargar()`) normalmente se tragan en
  silencio (`catch (e) {}`) para no bombardear al usuario con alertas al
  abrir la pantalla — pero los errores de **acciones del usuario** (crear,
  enviar, eliminar) sí se muestran con `avisar('Error', mensajeError(e, '...'))`.
- Si la pantalla necesita saber a qué `Fontanero` pertenece el usuario
  logueado, recordá la convención de IDs del proyecto: muchas rutas usan
  `usuario_id` en la URL aunque el parámetro se llame `fontanero_id` (ver
  skill `id-convention-reviewer` del backend si hay dudas al construir la
  URL correcta).
- Usa `RefreshControl` con pull-to-refresh en listas, es el patrón repetido
  en todo el proyecto (`OfertasScreen.js`, `MisServiciosScreen.js`, etc.).

## Qué NO hacer

No inventes un cliente HTTP propio ni uses `fetch` nativo — todo el
proyecto usa `axios` de forma consistente. Y no pongas la URL del backend
en una variable de entorno o config central — cada archivo la declara
localmente, es la convención ya establecida (no ideal, pero consistente).
