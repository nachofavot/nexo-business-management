import { describe, expect, it } from 'vitest';
import { icon } from './icons';

describe('icon', () => {
  it('oculta el ícono a los lectores de pantalla', () => {
    expect(icon('menu').value).toContain('aria-hidden="true"');
  });
});
