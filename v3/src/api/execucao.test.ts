import { describe, expect, it } from 'vitest';
import { arvoreDemandas, caminhoAnexo, fatiasBarra, mencoesNoTexto } from './execucao';

describe('barra de pílula de horas', () => {
  it('real e planejado sobre o previsto, em fatias separadas', () => {
    const f = fatiasBarra(20, 5, 5);
    expect(f.real).toBe(25);
    expect(f.planejado).toBe(25);
    expect(f.estouro).toBe(false);
    expect(f.saldo).toBe(10);
  });
  it('acima do previsto: escala pelo executado e marca estouro', () => {
    const f = fatiasBarra(10, 8, 7);
    expect(f.real + f.planejado).toBeCloseTo(100);
    expect(f.estouro).toBe(true);
  });
  it('sem previsto nem horas: barra vazia', () => {
    expect(fatiasBarra(null, 0, 0)).toEqual({ real: 0, planejado: 0, estouro: false, saldo: 0 });
  });
});

describe('menções', () => {
  const pessoas = [{ id: 'a', nome: 'Ana Souza' }, { id: 'b', nome: 'Bruno' }];
  it('só notifica quem continua citado no texto', () => {
    expect(mencoesNoTexto('@Ana Souza veja isto', pessoas)).toEqual(['a']);
    expect(mencoesNoTexto('@Ana Souza e @Bruno', [...pessoas, pessoas[0]])).toEqual(['a', 'b']);
  });
});

describe('árvore de demandas', () => {
  it('subdemanda fica sob a mãe; sem a mãe na lista, vira raiz', () => {
    const arv = arvoreDemandas([{ id: 'd1', pai_id: null }, { id: 's1', pai_id: 'd1' }, { id: 's2', pai_id: 'outra' }]);
    expect(arv.map(x => x.item.id)).toEqual(['d1', 's2']);
    expect(arv[0].filhas.map(x => x.id)).toEqual(['s1']);
  });
});

describe('caminho do anexo', () => {
  it('começa pela pasta do escritório e limpa o nome', () => {
    expect(caminhoAnexo('esc1', 'demanda', 'Ata reunião (final).pdf', 'u1')).toBe('esc1/demanda/u1-Ata_reuniao_final_.pdf');
  });
});
