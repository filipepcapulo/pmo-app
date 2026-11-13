import { describe, expect, it } from 'vitest';
import { caminhoDoHash, lerRota, modulosVisiveis } from './rotas';

describe('rotas', () => {
  it('hash vazio abre o início', () => {
    expect(caminhoDoHash('')).toBe('inicio');
    expect(caminhoDoHash('#/')).toBe('inicio');
  });
  it('Equipe dev saiu (3.13.0): o link antigo cai na Agenda da equipe e ela some do menu', () => {
    expect(caminhoDoHash('#/equipe-dev')).toBe('agenda');
    expect(lerRota('equipe-dev').tipo).toBe('desconhecida');
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
    expect(modulosVisiveis([]).some(m => m.id === 'portfolio')).toBe(false);
    expect(modulosVisiveis(['portfolio.ver']).some(m => m.id === 'portfolio')).toBe(true);
  });
  it('produtividade e manuais para todos (o banco limita a produtividade ao próprio, 0045)', () => {
    const ids = modulosVisiveis([]).map(m => m.id);
    expect(ids).toEqual(expect.arrayContaining(['produtividade', 'manuais']));
  });
  it('manual por link profundo (#/manuais/<id>); parâmetro só em módulo que aceita', () => {
    expect(lerRota('manuais')).toMatchObject({ tipo: 'modulo', modulo: { id: 'manuais' } });
    expect(lerRota('manuais/gp')).toMatchObject({ tipo: 'modulo', modulo: { id: 'manuais' }, parametro: 'gp' });
    expect(lerRota('demandas/gp').tipo).toBe('desconhecida');
    expect(lerRota('manuais/gp/x').tipo).toBe('desconhecida');
  });
  it('cadastros da V5: clientes, projetos e equipe para todos; modelos com projeto.criar', () => {
    const ids = modulosVisiveis([]).map(m => m.id);
    expect(ids).toEqual(expect.arrayContaining(['clientes', 'projetos', 'equipe']));
    expect(ids).not.toContain('modelos');
    expect(modulosVisiveis(['projeto.criar']).some(m => m.id === 'modelos')).toBe(true);
    expect(lerRota('cliente/0f8fad5b-d9cb-469f-a165-70867728950e')).toMatchObject({ tipo: 'entidade', entidade: 'cliente' });
  });
  it('Financeiro (cofre): só com papel nominal no cofre; permissão do app (até Admin) não basta', () => {
    expect(modulosVisiveis(['portfolio.ver', 'permissao.editar']).some(m => m.id === 'financeiro')).toBe(false);
    expect(modulosVisiveis([], []).some(m => m.id === 'financeiro')).toBe(false);
    expect(modulosVisiveis([], ['fechamento']).some(m => m.id === 'financeiro')).toBe(true);
    expect(lerRota('financeiro')).toMatchObject({ tipo: 'modulo', modulo: { id: 'financeiro', cofre: true } });
  });
  it('Fechamento (F4): o do período só com papel dono ou fechamento; o Meu fechamento é de todos', () => {
    const ve = (fin: string[]) => modulosVisiveis([], fin).map(m => m.id);
    expect(ve([])).not.toContain('fechamento');
    expect(ve(['rentabilidade'])).not.toContain('fechamento');
    expect(ve(['rentabilidade'])).toContain('financeiro');
    expect(ve(['fechamento'])).toContain('fechamento');
    expect(ve(['dono'])).toContain('fechamento');
    expect(modulosVisiveis(['portfolio.ver', 'permissao.editar']).some(m => m.id === 'fechamento')).toBe(false);
    expect(ve([])).toContain('meu-fechamento');
    expect(lerRota('meu-fechamento')).toMatchObject({ tipo: 'modulo', modulo: { id: 'meu-fechamento' } });
  });
});
