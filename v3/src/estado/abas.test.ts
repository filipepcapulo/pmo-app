import { describe, expect, it } from 'vitest';
import { abasVisiveis, abrir, fechar, fecharTodas, INICIO, lerAbasSalvas, MAX_ABAS, mover, renomear } from './abas';

const vazio = { abas: [], ativa: null };

describe('abas', () => {
  it('abrir não repete e ativa', () => {
    let e = abrir(vazio, { caminho: 'clientes', titulo: 'Clientes' });
    e = abrir(e, { caminho: 'demandas', titulo: 'Demandas' });
    e = abrir(e, { caminho: 'clientes', titulo: 'Clientes' });
    expect(e.abas.map(a => a.caminho)).toEqual(['clientes', 'demandas']);
    expect(e.ativa).toBe('clientes');
  });
  it('o Início é o fundo: ativa sem virar aba, inclusive em abas salvas antigas', () => {
    const e = abrir(abrir(vazio, { caminho: 'demandas', titulo: 'Demandas' }), { caminho: INICIO, titulo: 'Início' });
    expect(e.abas.map(a => a.caminho)).toEqual(['demandas']);
    expect(e.ativa).toBe(INICIO);
    const salvas = lerAbasSalvas(JSON.stringify({ abas: [{ caminho: INICIO, titulo: 'Início' }, { caminho: 'a', titulo: 'A' }], ativa: INICIO }));
    expect(salvas).toEqual({ abas: [{ caminho: 'a', titulo: 'A' }], ativa: INICIO });
  });
  it('fechar a ativa ativa a vizinha da direita (ou a da esquerda)', () => {
    let e = vazio as ReturnType<typeof abrir>;
    for (const c of ['a', 'b', 'c']) e = abrir(e, { caminho: c, titulo: c });
    e = { ...e, ativa: 'b' };
    expect(fechar(e, 'b').ativa).toBe('c');
    expect(fechar({ ...e, ativa: 'c' }, 'c').ativa).toBe('b');
    expect(fechar(fechar(fechar(e, 'a'), 'b'), 'c').ativa).toBe(INICIO);
    expect(fecharTodas()).toEqual({ abas: [], ativa: INICIO });
  });
  it('mover leva a aba para o lado da aba alvo', () => {
    let e = vazio as ReturnType<typeof abrir>;
    for (const c of ['a', 'b', 'c']) e = abrir(e, { caminho: c, titulo: c });
    expect(mover(e, 'a', 'c', true).abas.map(x => x.caminho)).toEqual(['b', 'c', 'a']);
    expect(mover(e, 'c', 'a', false).abas.map(x => x.caminho)).toEqual(['c', 'a', 'b']);
    expect(mover(e, 'a', 'a', true)).toBe(e);
  });
  it('abas visíveis: cabem todas sem seta; estourou deixa a ativa à vista', () => {
    const abas = ['a', 'b', 'c', 'd'].map(c => ({ caminho: c, titulo: c }));
    expect(abasVisiveis(abas, 'a', 400, 100, 40)).toEqual({ visiveis: abas, estourou: false });
    const r = abasVisiveis(abas, 'd', 340, 100, 40);
    expect(r.estourou).toBe(true);
    expect(r.visiveis.map(a => a.caminho)).toEqual(['a', 'b', 'd']);
    expect(abasVisiveis(abas, 'd', 130, 100, 40).visiveis.map(a => a.caminho)).toEqual(['d']);
    expect(abasVisiveis(abas, 'd', 90, 100, 40)).toEqual({ visiveis: [], estourou: true });
  });
  it('limite de abas tira a mais antiga', () => {
    let e = vazio as ReturnType<typeof abrir>;
    for (let i = 0; i <= MAX_ABAS; i++) e = abrir(e, { caminho: 'm' + i, titulo: 'm' + i });
    expect(e.abas.length).toBe(MAX_ABAS);
    expect(e.abas[0].caminho).toBe('m1');
    expect(e.ativa).toBe('m' + MAX_ABAS);
  });
  it('renomear e ler salvas (corrompido vira vazio)', () => {
    const e = renomear(abrir(vazio, { caminho: 'projeto/x', titulo: 'Projeto' }), 'projeto/x', 'Cliente · P1');
    expect(e.abas[0].titulo).toBe('Cliente · P1');
    expect(lerAbasSalvas('{lixo')).toEqual(vazio);
    expect(lerAbasSalvas(JSON.stringify({ abas: [{ caminho: 'a', titulo: 'A' }], ativa: 'zz' })).ativa).toBe('a');
  });
});
