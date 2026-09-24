import { describe, it, expect } from 'vitest';
import { SheetIdGenerator, toSemanticSlug } from '../utils/idGenerator';
import { ExpenseCategory, SheetConfigId, SheetRowType } from '../constants/enums';

describe('idGenerator', () => {
  describe('toSemanticSlug', () => {
    it('converte textos com acentos e maiúsculas para slug limpo', () => {
      expect(toSemanticSlug('Cartão Itaú')).toBe('cartao_itau');
      expect(toSemanticSlug('Renda Líquida Mensal')).toBe('renda_liquida_mensal');
      expect(toSemanticSlug('Caução & Depósito do Novo Imóvel')).toBe('caucao_deposito_do_novo_imovel');
      expect(toSemanticSlug('Pintura / Reparos')).toBe('pintura_reparos');
    });

    it('remove underscores redundantes no início e fim', () => {
      expect(toSemanticSlug('  __Teste de Nome__  ')).toBe('teste_de_nome');
    });

    it('retorna fallback para strings vazias', () => {
      expect(toSemanticSlug('')).toBe('item');
    });

    it('limita o tamanho do slug para brevidade', () => {
      const longText = 'a'.repeat(100);
      expect(toSemanticSlug(longText).length).toBeLessThanOrEqual(50);
    });
  });

  describe('SheetIdGenerator', () => {
    it('gera IDs de configuração fixos e padronizados', () => {
      expect(SheetIdGenerator.config('initialBalance')).toBe(SheetConfigId.InitialBalance);
      expect(SheetIdGenerator.config('emergencyReserve')).toBe(SheetConfigId.EmergencyReserve);
      expect(SheetIdGenerator.config('initialBalance')).toBe('cfg:saldo_inicial');
      expect(SheetIdGenerator.config('emergencyReserve')).toBe('cfg:reserva_emergencia');
    });

    it('gera IDs semânticos para renda mensal', () => {
      const id = SheetIdGenerator.income('Renda Líquida Mensal', '2026-10');
      expect(id).toBe('renda:renda_liquida_mensal:2026-10');
      expect(id.startsWith(`${SheetRowType.Renda}:`)).toBe(true);
    });

    it('gera IDs semânticos para despesas recorrentes por categoria', () => {
      expect(SheetIdGenerator.expense(ExpenseCategory.Cartoes, 'Cartão Itaú', '2026-10')).toBe(
        'despesa:cartoes:cartao_itau:2026-10'
      );
      expect(SheetIdGenerator.expense(ExpenseCategory.Fixas, 'Aluguel', '2026-11')).toBe(
        'despesa:fixas:aluguel:2026-11'
      );
      expect(SheetIdGenerator.expense(ExpenseCategory.Vars, 'Alimentação & Mercado', '2026-12')).toBe(
        'despesa:vars:alimentacao_mercado:2026-12'
      );
    });

    it('gera IDs semânticos para custos pontuais da mudança', () => {
      expect(SheetIdGenerator.oneTime('Frete ou Caminhão')).toBe('mudanca:frete_ou_caminhao');
      expect(SheetIdGenerator.oneTime('Depósito Caução')).toBe('mudanca:deposito_caucao');
    });

    it('gera IDs semânticos para metas financeiras', () => {
      expect(SheetIdGenerator.goal('Mudança de Residência')).toBe('meta:mudanca_de_residencia');
      expect(SheetIdGenerator.goal('Reserva de Emergência')).toBe('meta:reserva_de_emergencia');
    });

    it('extrai corretamente a chave base de IDs semânticos para agrupamento', () => {
      expect(
        SheetIdGenerator.extractBaseKey('despesa:cartoes:cartao_itau:2026-10', '2026-10', 'Cartão Itaú')
      ).toBe('despesa:cartoes:cartao_itau');

      expect(
        SheetIdGenerator.extractBaseKey('renda:salario:2026-10', '2026-10', 'Salário')
      ).toBe('renda:salario');
    });

    it('extrai corretamente a chave base de IDs legados com sufixo de mês', () => {
      expect(
        SheetIdGenerator.extractBaseKey('cartao_itau_2026-10', '2026-10', 'Cartão Itaú')
      ).toBe('cartao_itau');
    });
  });
});
