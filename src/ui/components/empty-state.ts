import { html, type SafeHtml } from '../html';

export function emptyState(title: string, description: string, action?: SafeHtml): SafeHtml {
  return html`<div class="nx-empty">
    <p class="nx-empty__title">${title}</p>
    <p class="nx-empty__description">${description}</p>
    ${action ? html`<div class="nx-empty__action">${action}</div>` : null}
  </div>`;
}
