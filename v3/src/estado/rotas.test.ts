import { describe, expect, it } from 'vitest';
import { caminhoDoHash, lerRota, modulosVisiveis } from './rotas';

describe('rotas', () => {
  it('hash vazio abre o início', () => {
    expect(caminhoDoHash('')).toBe('inicio');
    expect(caminhoDoHash('#/')).toBe('inicio');
  });
  it('hash do login por link (#access_token=…) não é rota', () => {
    expect(caminhoDoHash('#access_token=abc&type=magiclink')).toBeNull();
  });
  it('link profundo de projeto', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const r = lerRota(caminhoDoHash(`#/projeto/${id.toUpperCase()}/`)!);
    expect(r).toEqual({ tipo: 'entidade', entidade: 'projeto', id });
  });
  it('módulo e rota desconhecida', () => {
    expect(lerRota('demandas').tipo).toBe('modulo');
    expect(lerRota('projeto/123').tipo).toBe('desconhecida');
    expect(lerRota('nada').tipo).toBe('desconhecida');
  });
  it('item com permissão só aparece para quem tem', () => {
    expect(modulosVisiveis([]).some(m => m.id === 'produtividade')).toBe(false);
    expect(modulosVisiveis(['relatorio.produtividade']).some(m => m.id === 'produtividade')).toBe(true);
  });
});
