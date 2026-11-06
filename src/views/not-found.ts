import type { View } from '../app/view';
import { html, setHtml } from '../ui/html';

export const notFoundView: View = ({ root }) => {
  setHtml(
    root,
    html`<div class="nx-empty">
      <h2>Esta dirección no existe</h2>
      <p class="nx-empty__description">
        Revisá la dirección o <a href="/dashboard">volvé al Dashboard</a>.
      </p>
    </div>`,
  );
};
