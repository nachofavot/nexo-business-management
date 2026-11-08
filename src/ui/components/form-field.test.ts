import { describe, expect, it } from 'vitest';
import { describedBy, fieldHintId, formField, type FieldDefinition } from './form-field';

const nameField: FieldDefinition<'name'> = { name: 'name', label: 'Nombre' };

describe('formField', () => {
  it('asocia la etiqueta con el campo y muestra el valor', () => {
    const markup = formField(nameField, { idPrefix: 'cliente', value: 'Ana' }).value;

    expect(markup).toContain('for="cliente-name"');
    expect(markup).toContain('id="cliente-name"');
    expect(markup).toContain('name="name"');
    expect(markup).toContain('value="Ana"');
    expect(markup).toContain('>Nombre');
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

  it('no marca como obligatorios a los demás campos', () => {
    expect(formField(nameField, { idPrefix: 'cliente', value: '' }).value).not.toContain(
      'required',
    );
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

  describe('en una lista', () => {
    const categoryField: FieldDefinition<'category'> = {
      name: 'category',
      label: 'Categoría',
      type: 'select',
      options: [{ value: 'a', label: 'Primera' }],
    };

    it('con error la marca y asocia el mensaje', () => {
      const markup = formField(categoryField, {
        idPrefix: 'producto',
        value: 'a',
        error: 'Elegí una categoría.',
      }).value;

      expect(markup).toMatch(/<select[^>]*is-invalid/);
      expect(markup).toMatch(/<select[^>]*aria-invalid="true"/);
      expect(markup).toMatch(/<select[^>]*aria-describedby="producto-category-error"/);
    });

    it('sin error no la marca como inválida', () => {
      const markup = formField(categoryField, { idPrefix: 'producto', value: 'a' }).value;

      expect(markup).not.toContain('is-invalid');
      expect(markup).not.toContain('aria-invalid');
    });

    it('puede ser obligatoria', () => {
      const markup = formField(
        { ...categoryField, required: true },
        { idPrefix: 'producto', value: 'a' },
      ).value;

      expect(markup).toMatch(/<select[^>]*required/);
    });

    it('escapa los textos de las opciones', () => {
      const markup = formField(
        { ...categoryField, options: [{ value: '"><b>', label: '<i>' }] },
        { idPrefix: 'producto', value: '' },
      ).value;

      expect(markup).not.toMatch(/<b>|<i>/);
    });
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

  // Sin una marca, obligatorios y opcionales se veían iguales.
  it('un campo opcional lo dice en la etiqueta', () => {
    const markup = formField(nameField, { idPrefix: 'c', value: '' }).value;

    expect(markup).toMatch(
      /<label[^>]*>Nombre\s*<span class="nx-field__optional">\(opcional\)<\/span>\s*<\/label>/,
    );
  });

  it('un campo obligatorio no dice "(opcional)"', () => {
    const markup = formField({ ...nameField, required: true }, { idPrefix: 'c', value: '' }).value;

    expect(markup).not.toContain('opcional');
  });

  describe('con una ayuda', () => {
    const taxField: FieldDefinition<'tax'> = {
      name: 'tax',
      label: 'IVA (%)',
      required: true,
      hint: 'Se aplica a las ventas nuevas.',
    };

    it('la muestra bajo el campo y la asocia', () => {
      const markup = formField(taxField, { idPrefix: 'p', value: '21' }).value;

      expect(markup).toMatch(
        /<div class="form-text" id="p-tax-hint"\s*>\s*Se aplica a las ventas nuevas\./,
      );
      expect(markup).toMatch(/<input[^>]*aria-describedby="p-tax-hint"/);
      expect(markup).not.toContain('aria-invalid');
    });

    it('con error asocia la ayuda y el error', () => {
      const markup = formField(taxField, {
        idPrefix: 'p',
        value: '',
        error: 'Ingresá un número.',
      }).value;

      expect(markup).toMatch(/<input[^>]*aria-describedby="p-tax-hint p-tax-error"/);
    });

    it('en una lista también', () => {
      const markup = formField(
        { ...taxField, type: 'select', options: [{ value: 'a', label: 'A' }] },
        { idPrefix: 'p', value: 'a' },
      ).value;

      expect(markup).toMatch(/<select[^>]*aria-describedby="p-tax-hint"/);
    });

    it('escapa el texto de la ayuda', () => {
      const markup = formField(
        { ...taxField, hint: '<b>x</b>' },
        { idPrefix: 'p', value: '' },
      ).value;

      expect(markup).not.toContain('<b>');
    });
  });

  it('usa el autocompletado "off" si se pide', () => {
    const markup = formField(
      { ...nameField, autocomplete: 'off' },
      { idPrefix: 'c', value: '' },
    ).value;

    expect(markup).toContain('autocomplete="off"');
  });
});

describe('fieldHintId', () => {
  it('se arma con el prefijo y el nombre', () => {
    expect(fieldHintId('p', 'tax')).toBe('p-tax-hint');
  });
});

describe('describedBy', () => {
  it('junta los id de la ayuda y del error', () => {
    expect(describedBy({})).toBeNull();
    expect(describedBy({ hint: 'a' })).toBe('a');
    expect(describedBy({ error: 'b' })).toBe('b');
    expect(describedBy({ hint: 'a', error: 'b' })).toBe('a b');
  });
});
