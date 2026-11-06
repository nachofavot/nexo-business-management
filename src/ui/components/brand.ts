import { html, type SafeHtml } from '../html';

/** La N se dibuja con una sola línea: dos extremos unidos, como el nombre. */
export function brand(): SafeHtml {
  return html`<span class="nx-brand">
    <svg class="nx-brand__mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" />
      <path d="M10 23V9l12 14V9" />
    </svg>
    <span class="nx-brand__name">NEXO</span>
  </span>`;
}
