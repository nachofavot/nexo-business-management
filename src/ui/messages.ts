import type { StorageFailure } from '../data/database';
import type { ReportPeriod } from '../domain/reports';

export function storageFailureMessage(failure: StorageFailure): string {
  return failure === 'quota-exceeded'
    ? 'No se pudo guardar. El almacenamiento del navegador está lleno.'
    : 'No se pudo guardar.';
}

export function pageAnnouncement(page: number, pageCount: number): string {
  return `Página ${page} de ${pageCount}`;
}

const PERIOD_NAMES: Readonly<Record<ReportPeriod, string>> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  '12m': '12 meses',
};

export function periodAnnouncement(period: ReportPeriod): string {
  return `Reportes de los últimos ${PERIOD_NAMES[period]}`;
}

/**
 * Nombres de los controles de una línea de venta. La etiqueta visible dice "Producto" y
 * `lineSuffix` se agrega oculto, para que el nombre accesible incluya el texto visible.
 */
export function lineControlNames(position: number): {
  product: string;
  quantity: string;
  remove: string;
  lineSuffix: string;
} {
  const lineSuffix = ` de la línea ${position}`;
  return {
    product: `Producto${lineSuffix}`,
    quantity: `Cantidad${lineSuffix}`,
    remove: `Quitar la línea ${position}`,
    lineSuffix,
  };
}
