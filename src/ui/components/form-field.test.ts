import { describe, expect, it } from 'vitest';
import { formField, type FieldDefinition } from './form-field';

const nameField: FieldDefinition<'name'> = { name: 'name', label: 'Nombre' };

describe('formField', () => {
  it('asocia la etiqueta con el campo y muestra el valor', () => {
    const markup = formField(nameField, { idPrefix: 'cliente', value: 'Ana' }).value;

    expect(markup).toContain('for="cliente-name"');
    expect(markup).toContain('id="cliente-name"');
    expect(markup).toContain('name="name"');
    expect(markup).toContain('value="Ana"');
    expect(markup).toContain('>Nombre<');
  });

  it('sin error no marca el campo como inválido', () => {
    const markup = formField(nameField, { idPrefix: 'cliente', value: '' }).value;

    expect(markup).not.toContain('aria-invalid');
    expect(markup).not.toContain('is-invalid');
  });

  it('con error lo marca y asocia el mensaje', () => {
    const markup = formField(nameField, {
      idPrefix: 'cliente',
      value: '',
      error: 'Ingresá un nombre.',
    }).value;

    expect(markup).toContain('is-invalid');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="cliente-name-error"');
    expect(markup).toContain('id="cliente-name-error"');
    expect(markup).toContain('Ingresá un nombre.');
  });

  it('marca los campos obligatorios sin cambiar la etiqueta', () => {
    const markup = formField(
      { ...nameField, required: true },
      { idPrefix: 'cliente', value: '' },
    ).value;

    expect(markup).toContain('required');
    expect(markup).toContain('>Nombre<');
  });

  it('usa el tipo, el autocompletado y el teclado indicados', () => {
    const markup = formField(
      { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', inputMode: 'text' },
      { idPrefix: 'cliente', value: '' },
    ).value;

    expect(markup).toContain('type="email"');
    expect(markup).toContain('autocomplete="email"');
    expect(markup).toContain('inputmode="text"');
  });

  it('por defecto es un campo de texto', () => {
    expect(formField(nameField, { idPrefix: 'c', value: '' }).value).toContain('type="text"');
  });

  it('genera una lista con la opción actual seleccionada', () => {
    const markup = formField(
      {
        name: 'category',
        label: 'Categoría',
        type: 'select',
        options: [
          { value: 'a', label: 'Primera' },
          { value: 'b', label: 'Segunda' },
        ],
      },
      { idPrefix: 'producto', value: 'b' },
    ).value;

    expect(markup).toContain('<select');
    expect(markup).toMatch(/<option value="a"\s*>\s*Primera/);
    expect(markup).toMatch(/<option value="b" selected\s*>\s*Segunda/);
  });

  it('escapa el valor', () => {
    const markup = formField(nameField, {
      idPrefix: 'c',
      value: '"><img src=x onerror=alert(1)>',
    }).value;

    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });

  it('escapa el mensaje de error', () => {
    const markup = formField(nameField, { idPrefix: 'c', value: '', error: '<b>x</b>' }).value;

    expect(markup).not.toContain('<b>');
  });
});
