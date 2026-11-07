import type { View } from '../app/view';
import { sortItems } from '../domain/list';
import { formatSaleNumber } from '../domain/sales';
import {
  PAYMENT_METHODS,
  type Customer,
  type Product,
  type SaleErrors,
  type SaleField,
  type SaleInput,
} from '../domain/types';
import { emptyState } from '../ui/components/empty-state';
import { fieldErrorId, formField, type FieldDefinition } from '../ui/components/form-field';
import { showToast } from '../ui/components/toast';
import { requireElement } from '../ui/dom';
import { formatDiscount, formatMoney, formatPaymentMethod, formatPercent } from '../ui/format';
import { html, setHtml, type SafeHtml } from '../ui/html';
import { icon } from '../ui/icons';
import { storageFailureMessage } from '../ui/messages';

const ID_PREFIX = 'new-sale';

function customerField(customers: readonly Customer[]): FieldDefinition<SaleField> {
  return {
    name: 'customerId',
    label: 'Cliente',
    type: 'select',
    required: true,
    options: [
      { value: '', label: 'Elegí un cliente' },
      ...sortItems(customers, (customer) => customer.name, 'asc').map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    ],
  };
}

const DISCOUNT_FIELD: FieldDefinition<SaleField> = {
  name: 'discountPercent',
  label: 'Descuento (%)',
  inputMode: 'numeric',
  autocomplete: 'off',
  required: true,
};

const PAYMENT_FIELD: FieldDefinition<SaleField> = {
  name: 'paymentMethod',
  label: 'Medio de pago',
  type: 'select',
  required: true,
  options: [
    { value: '', label: 'Elegí un medio de pago' },
    ...PAYMENT_METHODS.map((method) => ({ value: method, label: formatPaymentMethod(method) })),
  ],
};

/** Los productos sin stock se ven, para no desconcertar, pero no se pueden elegir. */
function productOptions(products: readonly Product[]): SafeHtml {
  return html`<option value="">Elegí un producto</option>
    ${products.map((product) =>
      product.stock === 0
        ? html`<option value="${product.id}" disabled>
            ${product.name} (${product.sku}, sin stock)
          </option>`
        : html`<option value="${product.id}">${product.name} (${product.sku})</option>`,
    )}`;
}

/**
 * Cada línea tiene una clave propia y no su posición: así sus id no cambian al quitar otra.
 * La cantidad siempre describe la ayuda y el error de la línea, aunque estén vacíos.
 */
function lineRow(key: number, options: SafeHtml): SafeHtml {
  const id = `sale-line-${key}`;

  return html`<li class="nx-sale-line" data-line="${key}">
    <div class="nx-sale-line__product">
      <label class="form-label" for="${id}-product">Producto</label>
      <select class="form-select" id="${id}-product" data-role="product">
        ${options}
      </select>
    </div>
    <div class="nx-sale-line__quantity">
      <label class="form-label" for="${id}-quantity">Cantidad</label>
      <input
        class="form-control"
        id="${id}-quantity"
        data-role="quantity"
        value="1"
        inputmode="numeric"
        autocomplete="off"
        aria-describedby="${id}-hint ${id}-error"
      />
    </div>
    <p class="nx-sale-line__subtotal nx-num" data-role="subtotal">—</p>
    <button
      class="nx-btn nx-btn--ghost nx-btn--icon nx-sale-line__remove"
      type="button"
      data-role="remove"
      aria-label="Quitar línea sin producto"
    >
      ${icon('delete')}
    </button>
    <p class="nx-sale-line__hint" id="${id}-hint" data-role="hint"></p>
    <p class="nx-form-error nx-sale-line__error" id="${id}-error" data-role="error"></p>
  </li>`;
}

/** Busca una parte de la línea y comprueba su tipo real, en lugar de suponerlo con un cast. */
function linePart<T extends HTMLElement>(row: Element, role: string, type: new () => T): T {
  const element = row.querySelector(`[data-role="${role}"]`);
  if (!(element instanceof type)) throw new Error(`La línea no tiene la parte ${role}`);
  return element;
}

export const newSaleView: View = ({ root, signal, database, services, navigate }) => {
  const { sales } = services;
  const { customers, products, settings } = database.read();
  const { currency, taxPercent } = settings.preferences;

  if (customers.length === 0) {
    setHtml(
      root,
      emptyState(
        'Todavía no hay clientes',
        'Para registrar una venta, primero agregá un cliente.',
        html`<a class="nx-btn nx-btn--primary" href="/clientes">Ir a Clientes</a>`,
      ),
    );
    return;
  }
  if (!products.some((product) => product.stock > 0)) {
    setHtml(
      root,
      emptyState(
        'No hay productos con stock',
        'Para registrar una venta, agregá un producto o subí el stock de uno.',
        html`<a class="nx-btn nx-btn--primary" href="/productos">Ir a Productos</a>`,
      ),
    );
    return;
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const productChoices = productOptions(sortItems(products, (product) => product.name, 'asc'));

  setHtml(
    root,
    html`<form class="nx-new-sale" id="new-sale-form" novalidate>
      <div class="nx-new-sale__fields">
        ${formField(customerField(customers), { idPrefix: ID_PREFIX, value: '' })}
        <section class="nx-new-sale__section" aria-labelledby="new-sale-lines-title">
          <h2 class="nx-new-sale__title" id="new-sale-lines-title">Productos</h2>
          <ol class="nx-sale-lines" id="new-sale-lines"></ol>
          <button class="nx-btn nx-btn--secondary" id="new-sale-add-line" type="button">
            ${icon('add')} Agregar producto
          </button>
          <p class="nx-form-error" id="new-sale-lines-error"></p>
        </section>
        <div class="nx-new-sale__terms">
          ${formField(DISCOUNT_FIELD, { idPrefix: ID_PREFIX, value: '0' })}
          ${formField(PAYMENT_FIELD, { idPrefix: ID_PREFIX, value: '' })}
        </div>
      </div>
      <aside class="nx-sale-summary" aria-labelledby="new-sale-summary-title">
        <h2 class="nx-new-sale__title" id="new-sale-summary-title">Resumen</h2>
        <dl class="nx-totals">
          <div class="nx-totals__row">
            <dt>Subtotal</dt>
            <dd id="new-sale-subtotal">${formatMoney(0, currency)}</dd>
          </div>
          <div class="nx-totals__row">
            <dt id="new-sale-discount-label">Descuento (${formatPercent(0)})</dt>
            <dd id="new-sale-discount">${formatDiscount(0, currency)}</dd>
          </div>
          <div class="nx-totals__row">
            <dt>IVA (${formatPercent(taxPercent)})</dt>
            <dd id="new-sale-tax">${formatMoney(0, currency)}</dd>
          </div>
          <div class="nx-totals__row nx-totals__row--total">
            <dt>Total</dt>
            <dd>
              <span role="status" aria-atomic="true">
                <span class="visually-hidden">Total</span>
                <span id="new-sale-total">${formatMoney(0, currency)}</span>
              </span>
            </dd>
          </div>
        </dl>
        <div class="nx-sale-summary__actions">
          <button class="nx-btn nx-btn--primary" type="submit">Registrar venta</button>
          <a class="nx-btn nx-btn--ghost" href="/ventas">Cancelar</a>
        </div>
      </aside>
    </form>`,
  );

  const form = requireElement('new-sale-form', HTMLFormElement);
  const linesList = requireElement('new-sale-lines', HTMLOListElement);
  const addButton = requireElement('new-sale-add-line', HTMLButtonElement);
  const linesError = requireElement('new-sale-lines-error', HTMLElement);
  const subtotalText = requireElement('new-sale-subtotal', HTMLElement);
  const discountLabel = requireElement('new-sale-discount-label', HTMLElement);
  const discountText = requireElement('new-sale-discount', HTMLElement);
  const taxText = requireElement('new-sale-tax', HTMLElement);
  const totalText = requireElement('new-sale-total', HTMLElement);

  let hasAttempted = false;
  let nextLineKey = 0;

  function lineRows(): HTMLElement[] {
    return [...linesList.querySelectorAll<HTMLElement>('[data-line]')];
  }

  function fieldControl(name: SaleField): HTMLElement | null {
    const control = form.elements.namedItem(name);
    return control instanceof HTMLElement ? control : null;
  }

  function readInput(): SaleInput {
    const data = new FormData(form);
    const value = (name: SaleField) => {
      const entry = data.get(name);
      return typeof entry === 'string' ? entry : '';
    };

    return {
      customerId: value('customerId'),
      lines: lineRows().map((row) => ({
        productId: linePart(row, 'product', HTMLSelectElement).value,
        quantity: linePart(row, 'quantity', HTMLInputElement).value,
      })),
      discountPercent: value('discountPercent'),
      paymentMethod: value('paymentMethod'),
    };
  }

  /** Actualiza solo textos: volver a dibujar los campos haría perder el foco. */
  function showPreview(input: SaleInput): void {
    const preview = sales.preview(input);

    lineRows().forEach((row, index) => {
      const line = preview.lines[index];
      const product = productsById.get(input.lines[index]?.productId ?? '');
      const available = line?.availableStock ?? null;
      const subtotal = line?.subtotalCents ?? null;

      linePart(row, 'hint', HTMLElement).textContent =
        available === null ? '' : `Disponibles: ${available}`;
      linePart(row, 'subtotal', HTMLElement).textContent =
        subtotal === null ? '—' : formatMoney(subtotal, currency);
      linePart(row, 'remove', HTMLButtonElement).setAttribute(
        'aria-label',
        product ? `Quitar ${product.name}` : 'Quitar línea sin producto',
      );
    });

    const { totals } = preview;
    subtotalText.textContent = formatMoney(totals.subtotalCents, currency);
    discountLabel.textContent = `Descuento (${formatPercent(preview.discountPercent)})`;
    discountText.textContent = formatDiscount(totals.discountCents, currency);
    taxText.textContent = formatMoney(totals.taxCents, currency);
    totalText.textContent = formatMoney(totals.totalCents, currency);
  }

  function markInvalid(control: HTMLElement, isInvalid: boolean): void {
    control.classList.toggle('is-invalid', isInvalid);
    if (isInvalid) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }

  /** Igual que en los modales: solo cambian clases, atributos y mensajes. */
  function showErrors(errors: SaleErrors): void {
    for (const name of ['customerId', 'discountPercent', 'paymentMethod'] as const) {
      const control = fieldControl(name);
      const errorId = fieldErrorId(ID_PREFIX, name);
      const message = errors[name];
      if (control) {
        markInvalid(control, message !== undefined);
        if (message === undefined) control.removeAttribute('aria-describedby');
        else control.setAttribute('aria-describedby', errorId);
      }
      const errorElement = document.getElementById(errorId);
      if (errorElement) errorElement.textContent = message ?? '';
    }

    linesError.textContent = errors.lines ?? '';
    if (errors.lines === undefined) addButton.removeAttribute('aria-describedby');
    else addButton.setAttribute('aria-describedby', linesError.id);

    lineRows().forEach((row, index) => {
      const lineError = errors.lineErrors?.[index];
      const productSelect = linePart(row, 'product', HTMLSelectElement);
      const errorElement = linePart(row, 'error', HTMLElement);
      const isProductError = lineError?.field === 'productId';

      markInvalid(productSelect, isProductError);
      if (isProductError) productSelect.setAttribute('aria-describedby', errorElement.id);
      else productSelect.removeAttribute('aria-describedby');
      markInvalid(linePart(row, 'quantity', HTMLInputElement), lineError?.field === 'quantity');
      errorElement.textContent = lineError?.message ?? '';
    });
  }

  /** El foco va al primer error en el orden de la pantalla. */
  function focusFirstError(errors: SaleErrors): void {
    const candidates: (HTMLElement | null)[] = [];
    if (errors.customerId) candidates.push(fieldControl('customerId'));
    lineRows().forEach((row, index) => {
      const lineError = errors.lineErrors?.[index];
      if (!lineError) return;
      candidates.push(
        lineError.field === 'productId'
          ? linePart(row, 'product', HTMLSelectElement)
          : linePart(row, 'quantity', HTMLInputElement),
      );
    });
    if (errors.lines) candidates.push(addButton);
    if (errors.discountPercent) candidates.push(fieldControl('discountPercent'));
    if (errors.paymentMethod) candidates.push(fieldControl('paymentMethod'));

    candidates.find((candidate) => candidate !== null)?.focus();
  }

  function refresh(): void {
    const input = readInput();
    showPreview(input);
    if (hasAttempted) showErrors(sales.validate(input));
  }

  function addLine(options: { focus: boolean }): void {
    nextLineKey += 1;
    const holder = document.createElement('ol');
    setHtml(holder, lineRow(nextLineKey, productChoices));
    const row = holder.firstElementChild;
    if (!row) return;

    linesList.append(row);
    if (options.focus) linePart(row, 'product', HTMLSelectElement).focus();
    refresh();
  }

  function removeLine(row: HTMLElement): void {
    const index = lineRows().indexOf(row);
    row.remove();

    const remaining = lineRows();
    const next = remaining[index] ?? remaining[index - 1];
    (next ? linePart(next, 'product', HTMLSelectElement) : addButton).focus();
    refresh();
  }

  form.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;

      if (event.target.closest('#new-sale-add-line')) {
        addLine({ focus: true });
        return;
      }

      const removeButton = event.target.closest('[data-role="remove"]');
      const row = removeButton?.closest<HTMLElement>('[data-line]');
      if (row) removeLine(row);
    },
    { signal },
  );

  form.addEventListener('input', refresh, { signal });
  form.addEventListener('change', refresh, { signal });

  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      hasAttempted = true;

      const result = sales.register(readInput());
      if (result.ok) {
        showToast(`Venta ${formatSaleNumber(result.value.number)} registrada.`, 'success');
        navigate('/ventas');
        return;
      }
      if (result.error.kind === 'storage') {
        showToast(storageFailureMessage(result.error.failure), 'error');
        return;
      }
      showErrors(result.error.errors);
      focusFirstError(result.error.errors);
    },
    { signal },
  );

  addLine({ focus: false });
};
