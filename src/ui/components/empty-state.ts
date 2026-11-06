import { html, type SafeHtml } from '../html';

export function emptyState(title: string, description: string): SafeHtml {
  return html`<div class="nx-empty">
    <h3>${title}</h3>
    <p class="nx-empty__description">${description}</p>
  </div>`;
}
