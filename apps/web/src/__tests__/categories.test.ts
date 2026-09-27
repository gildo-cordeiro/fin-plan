import { describe, it, expect } from 'vitest';
import { TRANSACTION_CATEGORIES, CATEGORY_DEFINITIONS } from '../constants/categories';

describe('categories and defaultRepeat configuration', () => {
  it('garante que nenhuma categoria replica automaticamente para outros meses por padrão', () => {
    TRANSACTION_CATEGORIES.forEach((cat) => {
      expect(
        cat.defaultRepeat,
        `A categoria ${cat.label} (${cat.key}) não deve ter defaultRepeat=true`
      ).toBe(false);
    });
  });

  it('verifica que CATEGORY_DEFINITIONS possui defaultRepeat=false para todas as chaves', () => {
    Object.values(CATEGORY_DEFINITIONS).forEach((def) => {
      expect(
        def.defaultRepeat,
        `A definição ${def.label} (${def.key}) não deve ter defaultRepeat=true`
      ).toBe(false);
    });
  });
});
