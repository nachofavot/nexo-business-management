import { emptyState } from '../components/empty-state';
import { html, type SafeHtml } from '../html';

export interface ChartFigureOptions {
  /** Prefijo de los id: el canvas es `${id}-canvas`. */
  id: string;
  title: string;
  /** Una frase con lo importante, visible para todos. */
  summary: string;
  /** Los mismos datos del gráfico, para leerlos con el teclado o con un lector de pantalla. */
  table: { headers: readonly [string, string]; rows: readonly (readonly [string, string])[] };
  /** Sin datos, se muestra este estado en lugar del gráfico. */
  empty?: { title: string; description: string };
}

/**
 * El marcado que rodea a un gráfico. El canvas queda oculto a los lectores de pantalla: los datos
 * están en una tabla desplegable, que se recorre con el teclado y la lee cualquier lector.
 */
export function chartFigure(options: ChartFigureOptions): SafeHtml {
  const { id, title, summary, table, empty } = options;
  const titleId = `${id}-title`;

  if (empty) {
    return html`<figure class="nx-chart" aria-labelledby="${titleId}">
      <figcaption class="nx-chart__header">
        <h2 class="nx-chart__title" id="${titleId}">${title}</h2>
      </figcaption>
      ${emptyState(empty.title, empty.description)}
    </figure>`;
  }

  return html`<figure class="nx-chart" aria-labelledby="${titleId}">
    <figcaption class="nx-chart__header">
      <h2 class="nx-chart__title" id="${titleId}">${title}</h2>
      <p class="nx-chart__summary">${summary}</p>
    </figcaption>
    <div class="nx-chart__canvas"><canvas id="${id}-canvas" aria-hidden="true"></canvas></div>
    <details class="nx-chart__data">
      <summary>Ver los datos</summary>
      <table class="nx-table nx-table--no-sort">
        <caption class="visually-hidden">
          ${title}
        </caption>
        <thead>
          <tr>
            <th scope="col">${table.headers[0]}</th>
            <th class="nx-table__number" scope="col">${table.headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          ${table.rows.map(
            ([label, value]) =>
              html`<tr>
                <td data-label="${table.headers[0]}">${label}</td>
                <td class="nx-table__number nx-table__nowrap" data-label="${table.headers[1]}">
                  ${value}
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </details>
  </figure>`;
}
