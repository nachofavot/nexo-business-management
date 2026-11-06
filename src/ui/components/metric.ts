import { formatPercentChange } from '../format';
import { html, type SafeHtml } from '../html';

export interface MetricOptions {
  label: string;
  value: string;
  /** Cambio porcentual. Sin valor no se muestra; con null se indica que no hay datos previos. */
  change?: number | null;
  helper?: string;
  lead?: boolean;
}

function changeClass(change: number | null): string {
  if (change === null || change === 0) return '';
  return change > 0 ? 'nx-metric__change--up' : 'nx-metric__change--down';
}

export function metric(options: MetricOptions): SafeHtml {
  const { label, value, change, helper, lead = false } = options;
  const hasChange = change !== undefined;
  const showHelper = helper !== undefined && change !== null;

  return html`<div class="nx-metric ${lead ? 'nx-metric--lead' : ''}">
    <div class="nx-metric__label">${label}</div>
    <div class="nx-metric__value">${value}</div>
    ${
      hasChange || showHelper
        ? html`<div class="nx-metric__detail">
            ${
              hasChange
                ? html`<span class="nx-metric__change ${changeClass(change)}"
                    >${formatPercentChange(change)}</span
                  >`
                : null
            }
            ${showHelper ? helper : null}
          </div>`
        : null
    }
  </div>`;
}
