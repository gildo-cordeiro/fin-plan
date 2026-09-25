import { describe, it, expect } from 'vitest';
import { generateId } from '../utils/idGenerator';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('idGenerator', () => {
  it('gera IDs em formato UUID v4 válido', () => {
    const id = generateId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('gera IDs únicos em chamadas consecutivas', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('funciona corretamente com fallback quando crypto.randomUUID não estiver disponível', () => {
    const originalCrypto = globalThis.crypto;
    try {
      // @ts-expect-error test fallback
      delete globalThis.crypto;
      const fallbackId = generateId();
      expect(fallbackId).toMatch(UUID_V4_REGEX);
    } finally {
      globalThis.crypto = originalCrypto;
    }
  });
});
