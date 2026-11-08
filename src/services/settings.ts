import type { StorageFailure } from '../data/database';
import { createSeedDatabase } from '../data/seed';
import { err, ok, type Result } from '../domain/result';
import type { FieldErrors, PreferencesInput, Settings } from '../domain/types';
import { validatePreferences, validateProfile } from '../domain/validation/settings';
import { hasChanges, withActivity, type ServiceDependencies, type ServiceFailure } from './types';

export type ProfileField = keyof Settings['profile'];
/** La configuración siempre existe: no hay caso "no encontrado". */
export type SettingsFailure<K extends string> = Exclude<ServiceFailure<K>, { kind: 'not-found' }>;
/** 'unchanged' permite avisar que no había nada para guardar. */
export type SaveOutcome = 'saved' | 'unchanged';

export interface SettingsService {
  read(): Settings;
  /** No guarda nada: permite revalidar el formulario mientras el usuario escribe. */
  validateProfile(input: Settings['profile']): FieldErrors<ProfileField>;
  validatePreferences(input: PreferencesInput): FieldErrors<keyof PreferencesInput>;
  updateProfile(input: Settings['profile']): Result<SaveOutcome, SettingsFailure<ProfileField>>;
  updatePreferences(
    input: PreferencesInput,
  ): Result<SaveOutcome, SettingsFailure<keyof PreferencesInput>>;
  /** Datos demo nuevos con la fecha de hoy. Conserva el perfil y las preferencias. */
  restoreDemo(): Result<void, StorageFailure>;
}

export function createSettingsService(dependencies: ServiceDependencies): SettingsService {
  const { database, now } = dependencies;

  /** Guarda una parte de la configuración junto con su actividad, solo si cambió algo. */
  function save<K extends keyof Settings, F extends string>(
    section: K,
    next: Settings[K],
    activityMessage: string,
  ): Result<SaveOutcome, SettingsFailure<F>> {
    if (!hasChanges(database.read().settings[section], next)) return ok('unchanged');

    const result = database.update((current) =>
      withActivity(
        { ...current, settings: { ...current.settings, [section]: next } },
        dependencies,
        'settings',
        activityMessage,
      ),
    );

    return result.ok ? ok('saved') : err({ kind: 'storage', failure: result.error });
  }

  return {
    read: () => database.read().settings,

    validateProfile(input) {
      const result = validateProfile(input);
      return result.ok ? {} : result.error;
    },

    validatePreferences(input) {
      const result = validatePreferences(input);
      return result.ok ? {} : result.error;
    },

    updateProfile(input) {
      const validation = validateProfile(input);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      return save('profile', validation.value, 'Perfil actualizado');
    },

    updatePreferences(input) {
      const validation = validatePreferences(input);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      return save('preferences', validation.value, 'Preferencias actualizadas');
    },

    restoreDemo() {
      // Se reemplaza la base entera, como pide el diseño, pero sin perder lo que eligió el usuario.
      const restored = withActivity(
        { ...createSeedDatabase(now()), settings: database.read().settings },
        dependencies,
        'data',
        'Datos demo restaurados',
      );
      const result = database.replace(restored);

      return result.ok ? ok(undefined) : err(result.error);
    },
  };
}
