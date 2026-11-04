// Página temporal de la Etapa 0: comprueba las herramientas y se reemplaza en la Etapa 2.
import '@fontsource-variable/geist';
import './styles/main.scss';

import checkIcon from 'bootstrap-icons/icons/check2-circle.svg?raw';
import Modal from 'bootstrap/js/dist/modal';
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from 'chart.js';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id}`);
  return element as T;
}

const modal = new Modal(requireElement('check-modal'));

requireElement('check-icon').innerHTML = checkIcon;
requireElement('open-check-modal').addEventListener('click', () => modal.show());

Chart.register(BarController, BarElement, CategoryScale, LinearScale);
new Chart(requireElement<HTMLCanvasElement>('check-chart'), {
  type: 'bar',
  data: {
    labels: ['Enero', 'Febrero', 'Marzo'],
    datasets: [{ label: 'Comprobación', data: [3, 5, 2], backgroundColor: '#2e9bff' }],
  },
});
