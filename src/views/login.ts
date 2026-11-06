import type { View } from '../app/view';
import { brand } from '../ui/components/brand';
import { html, setHtml } from '../ui/html';

export const loginView: View = ({ root, signal, session, navigate }) => {
  setHtml(
    root,
    html`<div class="nx-login">
      ${brand()}
      <h1 tabindex="-1">Clientes, productos y ventas en un lugar</h1>
      <button class="nx-btn nx-btn--primary" type="button" data-action="enter">
        Entrar a la demo
      </button>
    </div>`,
  );

  root.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="enter"]')) {
        session.start();
        navigate('/dashboard');
      }
    },
    { signal },
  );
};
