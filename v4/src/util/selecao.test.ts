import { describe, expect, it } from 'vitest';
import { marcadosDe, montarSelecao, OCULTAR, ocultando, passa, passaAlgum, semSelecao, textoSelecao } from './selecao';

describe('seleção múltipla com Exibir/Ocultar (4.26.0)', () => {
  it('nada marcado não filtra, em qualquer modo', () => {
    expect(passa([], 'a')).toBe(true);
    expect(passa([OCULTAR], 'a')).toBe(true);
    expect(semSelecao([OCULTAR])).toBe(true);
    expect(montarSelecao([], true)).toEqual([]);
  });
  it('Exibir mostra só os marcados; Ocultar mostra todos menos os marcados', () => {
    expect(['a', 'b', 'c'].filter(v => passa(['a', 'b'], v))).toEqual(['a', 'b']);
    expect(['a', 'b', 'c'].filter(v => passa([OCULTAR, 'a'], v))).toEqual(['b', 'c']);
    expect(passa(['a'], null)).toBe(false);
    expect(passa([OCULTAR, 'a'], null)).toBe(true);
  });
  it('item com vários valores: Exibir pede algum marcado; Ocultar tira quem tem algum marcado', () => {
    expect(passaAlgum(['P1'], ['P1', 'P2'])).toBe(true);
    expect(passaAlgum([OCULTAR, 'P1'], ['P1', 'P2'])).toBe(false);
    expect(passaAlgum([OCULTAR, 'P1'], [])).toBe(true);
  });
  it('monta, lê e descreve a seleção', () => {
    const s = montarSelecao(['a', 'b'], true);
    expect(s).toEqual([OCULTAR, 'a', 'b']);
    expect(ocultando(s)).toBe(true);
    expect(marcadosDe(s)).toEqual(['a', 'b']);
    expect(montarSelecao(['a'], false)).toEqual(['a']);
    expect(textoSelecao(s, v => v.toUpperCase())).toBe('todos menos A, B');
    expect(textoSelecao(['a'])).toBe('a');
    expect(textoSelecao([])).toBe('');
  });
});
