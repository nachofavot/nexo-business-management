import { describe, expect, it } from 'vitest';
import { html, raw } from './html';

describe('html', () => {
  it('escapa etiquetas en los datos', () => {
    const name = '<img src=x onerror=alert(1)>';

    expect(html`<p>${name}</p>`.value).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });

  it('impide salir de un atributo', () => {
    const title = '" onclick="x';

    expect(html`<a title="${title}"></a>`.value).toBe('<a title="&quot; onclick=&quot;x"></a>');
  });

  it('escapa comillas simples y ampersands', () => {
    const company = "O'Brien & Hijos";

    expect(html`${company}`.value).toBe('O&#39;Brien &amp; Hijos');
  });

  it('no escapa las plantillas anidadas', () => {
    expect(html`<b>${html`<i>a</i>`}</b>`.value).toBe('<b><i>a</i></b>');
  });

  it('no escapa dos veces', () => {
    expect(html`${html`${'<'}`}`.value).toBe('&lt;');
  });

  it('une las listas sin comas y escapa cada elemento', () => {
    expect(html`${['<b>', html`<i></i>`]}`.value).toBe('&lt;b&gt;<i></i>');
  });

  it('no muestra nada para null, undefined o false', () => {
    expect(html`${null}${undefined}${false}`.value).toBe('');
  });

  it('muestra el número 0', () => {
    expect(html`${0}`.value).toBe('0');
  });
});

describe('raw', () => {
  it('marca como seguro el contenido propio', () => {
    expect(html`${raw('<svg></svg>')}`.value).toBe('<svg></svg>');
  });
});
