import { createNavigationContainerRef } from '@react-navigation/native';

// Vive en su propio módulo (no adentro de App.js) para que componentes globales
// como AlertaTareaModal puedan navegar de forma imperativa sin crear un import
// circular con App.js.
export const navigationRef = createNavigationContainerRef();
