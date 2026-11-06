import barChartLine from 'bootstrap-icons/icons/bar-chart-line.svg?raw';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg?raw';
import boxSeam from 'bootstrap-icons/icons/box-seam.svg?raw';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg?raw';
import chevronDown from 'bootstrap-icons/icons/chevron-down.svg?raw';
import exclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg?raw';
import gear from 'bootstrap-icons/icons/gear.svg?raw';
import grid1x2 from 'bootstrap-icons/icons/grid-1x2.svg?raw';
import list from 'bootstrap-icons/icons/list.svg?raw';
import people from 'bootstrap-icons/icons/people.svg?raw';
import receipt from 'bootstrap-icons/icons/receipt.svg?raw';
import xCircle from 'bootstrap-icons/icons/x-circle.svg?raw';
import { raw, type SafeHtml } from './html';

const ICONS = {
  dashboard: grid1x2,
  customers: people,
  products: boxSeam,
  sales: receipt,
  reports: barChartLine,
  settings: gear,
  menu: list,
  logout: boxArrowRight,
  chevronDown,
  success: checkCircle,
  warning: exclamationTriangle,
  error: xCircle,
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Se importan de a uno para que el build incluya solo los íconos que se usan.
 * Son decorativos: el botón o enlace que los contiene es quien tiene el nombre accesible.
 */
export function icon(name: IconName): SafeHtml {
  return raw(ICONS[name].replace('<svg', '<svg aria-hidden="true"'));
}
