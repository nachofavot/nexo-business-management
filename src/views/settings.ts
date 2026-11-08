import type { View } from '../app/view';
import type { Result } from '../domain/result';
import type { FieldErrors, PreferencesInput, Settings } from '../domain/types';
import type { SaveOutcome, SettingsFailure } from '../services/settings';
import { applyAppearance } from '../ui/appearance';
import { formField, type FieldDefinition } from '../ui/components/form-field';
import { focusFirstInvalid, readFormValues, showFieldErrors } from '../ui/components/form-state';
import { segmented } from '../ui/components/segmented';
import { showToast } from '../ui/components/toast';
import { requireElement } from '../ui/dom';
import { html, setHtml } from '../ui/html';
import { storageFailureMessage } from '../ui/messages';
import { confirmRestoreDemo } from './restore-demo';
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  PREFERENCE_FIELDS,
  PROFILE_FIELDS,
  preferencesToInput,
} from './settings-form';

const PROFILE_PREFIX = 'settings-profile';
const PREFERENCES_PREFIX = 'settings-preferences';

interface FormBinding<K extends string, I> {
  form: HTMLFormElement;
  fields: readonly FieldDefinition<K>[];
  idPrefix: string;
  read(): I;
  validate(input: I): FieldErrors<K>;
  save(input: I): Result<SaveOutcome, SettingsFailure<K>>;
  /** Se llama con 'saved' y con 'unchanged': en los dos casos se muestran los valores guardados. */
  afterSave(): void;
  savedMessage: string;
}

/** Escribe en el campo el valor guardado, que puede estar normalizado (sin espacios, en minúsculas). */
function setControlValue(form: HTMLFormElement, name: string, value: string): void {
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
    control.value = value;
  }
}

export const settingsView: View = ({ root, signal, services, refreshShell }) => {
  const { profile, preferences } = services.settings.read();
  const preferenceValues = preferencesToInput(preferences);

  setHtml(
    root,
    html`<div class="nx-settings">
      <section class="nx-settings__section" aria-labelledby="settings-profile-title">
        <h2 id="settings-profile-title">Perfil</h2>
        <form class="nx-settings__form" id="${PROFILE_PREFIX}" novalidate>
          ${PROFILE_FIELDS.map((field) =>
            formField(field, { idPrefix: PROFILE_PREFIX, value: profile[field.name] }),
          )}
          <button class="nx-btn nx-btn--primary" type="submit">Guardar perfil</button>
        </form>
      </section>

      <section class="nx-settings__section" aria-labelledby="settings-preferences-title">
        <h2 id="settings-preferences-title">Preferencias</h2>
        <form class="nx-settings__form" id="${PREFERENCES_PREFIX}" novalidate>
          ${PREFERENCE_FIELDS.map((field) =>
            formField(field, { idPrefix: PREFERENCES_PREFIX, value: preferenceValues[field.name] }),
          )}
          <div class="nx-field">
            ${segmented({
              name: 'tableDensity',
              legend: 'Densidad de tablas',
              idPrefix: `${PREFERENCES_PREFIX}-density`,
              options: DENSITY_OPTIONS,
              value: preferences.tableDensity,
              visibleLegend: true,
            })}
          </div>
          <div class="nx-field">
            ${segmented({
              name: 'accent',
              legend: 'Color de acento',
              idPrefix: `${PREFERENCES_PREFIX}-accent`,
              options: ACCENT_OPTIONS,
              value: preferences.accent,
              visibleLegend: true,
            })}
          </div>
          <button class="nx-btn nx-btn--primary" type="submit">Guardar preferencias</button>
        </form>
      </section>

      <section class="nx-settings__section" aria-labelledby="settings-demo-title">
        <h2 id="settings-demo-title">Datos demo</h2>
        <p class="nx-settings__description">
          Volvé a generar clientes, productos y ventas de ejemplo con fechas de hoy. Tu perfil y tus
          preferencias se mantienen.
        </p>
        <button
          class="nx-btn nx-btn--danger"
          type="button"
          data-action="restore-demo"
          aria-haspopup="dialog"
        >
          Restaurar datos demo
        </button>
      </section>
    </div>`,
  );

  /** Valida al enviar y revalida al escribir después del primer intento, como los modales. */
  function bindForm<K extends string, I>(binding: FormBinding<K, I>): void {
    const { form, fields, idPrefix } = binding;
    let hasAttempted = false;

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        hasAttempted = true;
        const result = binding.save(binding.read());

        if (!result.ok) {
          if (result.error.kind === 'validation') {
            showFieldErrors(form, fields, idPrefix, result.error.errors);
            focusFirstInvalid(form, fields, result.error.errors);
          } else {
            showToast(storageFailureMessage(result.error.failure), 'error');
          }
          return;
        }

        showFieldErrors(form, fields, idPrefix, {});
        binding.afterSave();
        showToast(
          result.value === 'saved' ? binding.savedMessage : 'No había cambios para guardar.',
          'success',
        );
      },
      { signal },
    );

    form.addEventListener(
      'input',
      () => {
        if (hasAttempted) showFieldErrors(form, fields, idPrefix, binding.validate(binding.read()));
      },
      { signal },
    );
  }

  const profileForm = requireElement(PROFILE_PREFIX, HTMLFormElement);
  bindForm<keyof Settings['profile'], Settings['profile']>({
    form: profileForm,
    fields: PROFILE_FIELDS,
    idPrefix: PROFILE_PREFIX,
    read: () => readFormValues(profileForm, PROFILE_FIELDS, profile),
    validate: (input) => services.settings.validateProfile(input),
    save: (input) => services.settings.updateProfile(input),
    afterSave() {
      const saved = services.settings.read().profile;
      for (const { name } of PROFILE_FIELDS) setControlValue(profileForm, name, saved[name]);
      refreshShell();
    },
    savedMessage: 'Perfil guardado.',
  });

  const preferencesForm = requireElement(PREFERENCES_PREFIX, HTMLFormElement);
  bindForm<keyof PreferencesInput, PreferencesInput>({
    form: preferencesForm,
    fields: PREFERENCE_FIELDS,
    idPrefix: PREFERENCES_PREFIX,
    // Los radios no son campos de texto: se leen con FormData, igual que los demás.
    read() {
      const data = new FormData(preferencesForm);
      const text = (name: keyof PreferencesInput) => {
        const value = data.get(name);
        return typeof value === 'string' ? value : '';
      };
      return {
        currency: text('currency'),
        taxPercent: text('taxPercent'),
        lowStockThreshold: text('lowStockThreshold'),
        tableDensity: text('tableDensity'),
        accent: text('accent'),
      };
    },
    validate: (input) => services.settings.validatePreferences(input),
    save: (input) => services.settings.updatePreferences(input),
    afterSave() {
      const saved = services.settings.read().preferences;
      const values = preferencesToInput(saved);
      for (const { name } of PREFERENCE_FIELDS)
        setControlValue(preferencesForm, name, values[name]);
      applyAppearance(document.documentElement, saved);
    },
    savedMessage: 'Preferencias guardadas.',
  });

  root.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="restore-demo"]')) {
        void confirmRestoreDemo(services, signal);
      }
    },
    { signal },
  );
};
