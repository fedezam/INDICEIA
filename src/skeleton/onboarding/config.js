import './styles.css';

export const onboardingConfig = {
  requiredFields: [
    'nombre',
    'apellido',
    'fechaNacimiento',
    'telefono',
    'provincia',
    'localidad',
    'direccion'
  ]
};

export function validateOnboarding(fields = {}) {
  console.group('🔍 [onboarding] validate');

  try {
    for (const key of onboardingConfig.requiredFields) {
      const field = fields[key];

      if (!field) {
        console.warn(`⚠️ Campo inexistente: ${key}`);
        console.groupEnd();
        return false;
      }

      const value =
        typeof field.value === 'string'
          ? field.value.trim()
          : '';

      if (!value) {
        console.warn(`⚠️ Campo vacío: ${key}`);
        console.groupEnd();
        return false;
      }
    }

    console.log('✅ Validación OK');
    console.groupEnd();
    return true;
  } catch (err) {
    console.error('❌ Error en validateOnboarding', err);
    console.groupEnd();
    return false;
  }
}
