import { Platform } from 'react-native';

export async function agregarArchivo(form, campo, uri, nombreArchivo, tipo) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append(campo, blob, nombreArchivo);
  } else {
    form.append(campo, { uri, name: nombreArchivo, type: tipo });
  }
}
