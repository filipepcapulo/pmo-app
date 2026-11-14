import { describe, expect, it } from 'vitest';
import { alternar, deslocar, mover, normalizar } from './colunas';
import { ordenar } from './paginacao';

describe('colunas da tabela', () => {
  it('junta o layout salvo com as colunas do código', () => {
    expect(normalizar(['a', 'b', 'c'], null)).toEqual({ ordem: ['a', 'b', 'c'], ocultas: [] });
    expect(normalizar(['a', 'b', 'c', 'd'], { ordem: ['c', 'x', 'a', 'c'], ocultas: ['x', 'b'] }))
      .toEqual({ ordem: ['c', 'a', 'b', 'd'], ocultas: ['b'] });
    expect(normalizar(['a', 'b'], { ordem: ['a', 'b'], ocultas: ['a', 'b'] }).ocultas).toEqual([]);
  });
  it('move antes/depois, sobe e desce', () => {
    expect(mover(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
    expect(mover(['a', 'b', 'c', 'd'], 'a', 'c', true)).toEqual(['b', 'c', 'a', 'd']);
    expect(deslocar(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(deslocar(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
  });
  it('não deixa ocultar a última coluna visível', () => {
    const l = alternar({ ordem: ['a', 'b'], ocultas: [] }, 'a');
    expect(l.ocultas).toEqual(['a']);
    expect(alternar(l, 'b').ocultas).toEqual(['a']);
    expect(alternar(l, 'a').ocultas).toEqual([]);
  });
  it('ordena pessoa pelo nome, lista pela quantidade e vazios no fim', () => {
    const r = ordenar([{ gp: { nome: 'Zé' } }, { gp: null }, { gp: { nome: 'Ana' } }], 'gp', false).map(x => (x.gp as { nome: string } | null)?.nome);
    expect(r).toEqual(['Ana', 'Zé', undefined]);
    expect(ordenar([{ p: [1, 2] }, { p: [] }, { p: [1] }], 'p', true).map(x => x.p.length)).toEqual([2, 1, 0]);
    expect(ordenar([{ p: null }, { p: 'b' }, { p: 'a' }], 'p', true).map(x => x.p)).toEqual(['b', 'a', null]);
  });
});
