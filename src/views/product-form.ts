import { formatCentsForInput } from '../domain/money';
import { PRODUCT_CATEGORIES, type Product, type ProductInput } from '../domain/types';
import type { FieldDefinition } from '../ui/components/form-field';

// La opción vacía obliga a elegir: si no, todo producto nuevo quedaría en la primera categoría.
const CATEGORY_OPTIONS = [
  { value: '', label: 'Elegí una categoría' },
  ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: category })),
];

export const PRODUCT_FIELDS: readonly FieldDefinition<keyof ProductInput>[] = [
  { name: 'name', label: 'Nombre', required: true, autocomplete: 'off' },
  { name: 'sku', label: 'SKU', required: true, autocomplete: 'off' },
  {
    name: 'category',
    label: 'Categoría',
    type: 'select',
    required: true,
    options: CATEGORY_OPTIONS,
  },
  { name: 'price', label: 'Precio', required: true, autocomplete: 'off', inputMode: 'decimal' },
  { name: 'stock', label: 'Stock', required: true, autocomplete: 'off', inputMode: 'numeric' },
];

export function toProductInput(product: Product | null): ProductInput {
  if (!product) return { name: '', sku: '', category: '', price: '', stock: '' };

  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: formatCentsForInput(product.priceCents),
    stock: String(product.stock),
  };
}
