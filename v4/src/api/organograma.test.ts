import { describe, expect, it } from 'vitest';
import { buscar, importarCentral, iniciais, lista, separarPessoa, validar, type GrupoOrg } from './organograma';

const G: GrupoOrg[] = [
  { id: 'g1', nome: 'PO de Produtos', itens: [
    { id: 'a1', area: 'WMS', pessoas: ['Ana Lima ou Bia Souza'], demandas: ['Inventário', 'Etiquetas'], obs: '' },
    { id: 'a2', area: 'Fiscal/Contábil', pessoas: ['Caio Reis'], demandas: ['SPED', 'NF-e'], obs: 'SUP' },
  ] },
  { id: 'g2', nome: 'Suporte', itens: [{ id: 'a3', area: 'Folha', pessoas: [], demandas: ['eSocial'], obs: '' }] },
];

describe('organograma', () => {
  it('pessoa com alternativa: 1º nome em destaque, demais como "ou …" (RF-02)', () => {
    expect(separarPessoa('Ana Lima ou Bia Souza OU Davi')).toEqual({ principal: 'Ana Lima', alternativas: ['Bia Souza', 'Davi'] });
    expect(separarPessoa('Caio Reis')).toEqual({ principal: 'Caio Reis', alternativas: [] });
  });
  it('iniciais da primeira e da última palavra', () => {
    expect(iniciais('Ana Maria Lima')).toBe('AL');
    expect(iniciais('Ângela')).toBe('Â');
    expect(iniciais('  ')).toBe('?');
  });
  it('lista por ";" sem vazios e sem repetidos', () => {
    expect(lista(' SPED ; ; NF-e;sped ')).toEqual(['SPED', 'NF-e']);
  });
  it('busca por demanda sem acento mostra só a área e destaca a demanda (RF-03)', () => {
    const r = buscar(G, 'inventario');
    expect(r.total).toBe(1);
    expect(r.grupos[0].itens[0].area).toBe('WMS');
    expect(r.grupos[0].itens[0].demandasAchadas).toEqual(['Inventário']);
  });
  it('busca por grupo mostra todas as áreas do grupo; por pessoa alternativa acha a área', () => {
    expect(buscar(G, 'suporte').grupos.map(g => g.nome)).toEqual(['Suporte']);
    expect(buscar(G, 'po de').total).toBe(2);
    expect(buscar(G, 'bia').grupos[0].itens.map(a => a.area)).toEqual(['WMS']);
    expect(buscar(G, 'sup').total).toBe(2); // observação "SUP" (Fiscal) + grupo Suporte (Folha)
    expect(buscar(G, 'zzz').grupos).toEqual([]);
    expect(buscar(G, '').total).toBe(3);
  });
  it('validação: nome vazio, grupo repetido, limites (RF-06)', () => {
    expect(validar(G)).toEqual([]);
    const e = validar([{ nome: ' ', itens: [] }, { nome: 'PO', itens: [] }, { nome: 'po', itens: [
      { area: 'X', pessoas: Array.from({ length: 21 }, (_, i) => 'P' + i), demandas: Array.from({ length: 61 }, (_, i) => 'D' + i), obs: 'x'.repeat(121) }] }]);
    expect(e.some(x => /nome do grupo 1/.test(x))).toBe(true);
    expect(e.some(x => /repetido/.test(x))).toBe(true);
    expect(e.some(x => /20 pessoas/.test(x))).toBe(true);
    expect(e.some(x => /60 demandas/.test(x))).toBe(true);
    expect(e.some(x => /120 letras/.test(x))).toBe(true);
  });
  it('importa o JSON da Central (com ou sem a chave organograma; listas ou texto com ";")', () => {
    const j = { grupos: [{ nome: ' PO ', itens: [{ area: 'WMS', pessoas: ['Ana', 'ana'], demandas: 'A; B', obs: null }] }] };
    const r = importarCentral(JSON.stringify(j));
    expect(r).toEqual([{ nome: 'PO', itens: [{ area: 'WMS', pessoas: ['Ana'], demandas: ['A', 'B'], obs: '' }] }]);
    expect(importarCentral(JSON.stringify({ organograma: j }))).toEqual(r);
    expect(() => importarCentral('{x')).toThrow(/JSON válido/);
    expect(() => importarCentral('{"x":1}')).toThrow(/grupos/);
  });
});
