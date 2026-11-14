import { describe, expect, it } from 'vitest';
import { filtrarSugestoes, podeEditarSugestao, rotuloStatusSugestao, type Sugestao } from './sugestoes';

const s = (p: Partial<Sugestao>): Sugestao => ({
  id: '1', titulo: 't', descricao: null, status: 'nova', resposta: null, respondido_em: null, respondido_por: null,
  autor: null, criado_em: '2026-11-12', versao: 1, minha: false, anexos: [], ...p,
});

describe('sugestões de melhoria', () => {
  it('quem sugeriu edita só enquanto nova; quem gerencia edita sempre', () => {
    expect(podeEditarSugestao(s({ minha: true }), false)).toBe(true);
    expect(podeEditarSugestao(s({ minha: true, status: 'planejada' }), false)).toBe(false);
    expect(podeEditarSugestao(s({ minha: false }), false)).toBe(false);
    expect(podeEditarSugestao(s({ minha: false, status: 'concluida' }), true)).toBe(true);
  });
  it('filtra por status e por "só as minhas"', () => {
    const l = [s({ id: 'a', minha: true }), s({ id: 'b', status: 'planejada' }), s({ id: 'c', status: 'planejada', minha: true })];
    expect(filtrarSugestoes(l, '', false).map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(filtrarSugestoes(l, 'planejada', false).map(x => x.id)).toEqual(['b', 'c']);
    expect(filtrarSugestoes(l, 'planejada', true).map(x => x.id)).toEqual(['c']);
  });
  it('rótulo do status', () => {
    expect(rotuloStatusSugestao('em_analise')).toBe('Em análise');
    expect(rotuloStatusSugestao('outro')).toBe('outro');
  });
});
