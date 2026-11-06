import { describe, expect, it } from 'vitest';
import { storageFailureMessage } from './messages';

describe('storageFailureMessage', () => {
  it('explica que el almacenamiento está lleno', () => {
    expect(storageFailureMessage('quota-exceeded')).toBe(
      'No se pudo guardar. El almacenamiento del navegador está lleno.',
    );
  });

  it.each(['write-failed', 'invalid-data'] as const)('da un mensaje general con %s', (failure) => {
    expect(storageFailureMessage(failure)).toBe('No se pudo guardar.');
  });
});
