const { withGradleProperties, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// `npx expo prebuild --clean` borra y regenera android/ entero cada vez,
// así que la firma de release no puede vivir a mano en build.gradle — se
// pierde en el próximo prebuild. Este plugin la reinyecta siempre, leyendo
// 4 variables desde un .env local que NUNCA se commitea (ver .gitignore).
// Ver .env.example para la lista de variables y cómo conseguirlas.

const VARIABLES_REQUERIDAS = [
  'ANDROID_RELEASE_STORE_FILE',
  'ANDROID_RELEASE_STORE_PASSWORD',
  'ANDROID_RELEASE_KEY_ALIAS',
  'ANDROID_RELEASE_KEY_PASSWORD',
];

function leerEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  const contenido = fs.readFileSync(envPath, 'utf8');
  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const idx = limpia.indexOf('=');
    if (idx === -1) continue;
    const clave = limpia.slice(0, idx).trim();
    let valor = limpia.slice(idx + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    vars[clave] = valor;
  }
  return vars;
}

function withAndroidReleaseSigning(config) {
  const env = { ...leerEnvLocal(), ...process.env };
  const faltantes = VARIABLES_REQUERIDAS.filter((k) => !env[k]);

  if (faltantes.length) {
    console.warn(
      `\n⚠️  withAndroidReleaseSigning: faltan estas variables en .env: ${faltantes.join(', ')}.\n` +
        '   El build de release va a quedar firmado con la keystore de debug, que Play Console rechaza.\n' +
        '   Copiá .env.example a .env y completá los 4 valores antes de compilar. No se commitea.\n'
    );
    return config;
  }

  config = withGradleProperties(config, (config) => {
    const yaConfigurado = config.modResults.some(
      (item) => item.type === 'property' && item.key === 'MYAPP_RELEASE_STORE_FILE'
    );
    if (yaConfigurado) return config;

    config.modResults.push(
      { type: 'property', key: 'MYAPP_RELEASE_STORE_FILE', value: env.ANDROID_RELEASE_STORE_FILE },
      { type: 'property', key: 'MYAPP_RELEASE_STORE_PASSWORD', value: env.ANDROID_RELEASE_STORE_PASSWORD },
      { type: 'property', key: 'MYAPP_RELEASE_KEY_ALIAS', value: env.ANDROID_RELEASE_KEY_ALIAS },
      { type: 'property', key: 'MYAPP_RELEASE_KEY_PASSWORD', value: env.ANDROID_RELEASE_KEY_PASSWORD }
    );
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    let contenido = config.modResults.contents;

    if (contenido.includes('MYAPP_RELEASE_STORE_FILE')) {
      return config; // ya aplicado (prebuild sin --clean)
    }

    const ANCLA_SIGNING_CONFIGS = 'signingConfigs {';
    if (!contenido.includes(ANCLA_SIGNING_CONFIGS)) {
      throw new Error(
        'withAndroidReleaseSigning: no encontré "signingConfigs {" en android/app/build.gradle. ' +
          'Puede que el template de Expo haya cambiado — revisar el plugin a mano.'
      );
    }
    contenido = contenido.replace(
      ANCLA_SIGNING_CONFIGS,
      `${ANCLA_SIGNING_CONFIGS}\n` +
        '        release {\n' +
        "            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {\n" +
        '                storeFile file(MYAPP_RELEASE_STORE_FILE)\n' +
        '                storePassword MYAPP_RELEASE_STORE_PASSWORD\n' +
        '                keyAlias MYAPP_RELEASE_KEY_ALIAS\n' +
        '                keyPassword MYAPP_RELEASE_KEY_PASSWORD\n' +
        '            }\n' +
        '        }'
    );

    // Bloque generado por Expo dentro de buildTypes.release — texto exacto
    // del template actual, para no tocar por error el signingConfigs.release
    // recién insertado arriba (que también contiene la palabra "release {").
    const ANCLA_BUILD_TYPE_RELEASE =
      '        release {\n' +
      '            // Caution! In production, you need to generate your own keystore file.\n' +
      '            // see https://reactnative.dev/docs/signed-apk-android.\n' +
      '            signingConfig signingConfigs.debug';
    if (!contenido.includes(ANCLA_BUILD_TYPE_RELEASE)) {
      throw new Error(
        'withAndroidReleaseSigning: no encontré el bloque release de buildTypes esperado en build.gradle. ' +
          'Puede que el template de Expo haya cambiado — revisar el plugin a mano antes de compilar, ' +
          'para no terminar firmando el release con la keystore de debug sin darte cuenta.'
      );
    }
    contenido = contenido.replace(
      ANCLA_BUILD_TYPE_RELEASE,
      ANCLA_BUILD_TYPE_RELEASE.replace('signingConfigs.debug', 'signingConfigs.release')
    );

    config.modResults.contents = contenido;
    return config;
  });

  return config;
}

module.exports = withAndroidReleaseSigning;
