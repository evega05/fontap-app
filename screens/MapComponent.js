import { Platform } from 'react-native';

let MapComponent = null;

if (Platform.OS !== 'web') {
  MapComponent = require('./MapComponentNative').default;
} else {
  MapComponent = require('./MapComponentWeb').default;
}

export default MapComponent;