import { describe, expect, it } from 'vitest';
import { abrir, fechar, lerAbasSalvas, MAX_ABAS, renomear } from './abas';

const vazio = { abas: [], ativa: null };

describe('abas', () => {
  it('abrir não repete e ativa', () => {
    let e = abrir(vazio, { caminho: 'inicio', titulo: 'Início' });
    e = abrir(e, { caminho: 'demandas', titulo: 'Demandas' });
    e = abrir(e, { caminho: 'inicio', titulo: 'Início' });
    expect(e.abas.map(a => a.caminho)).toEqual(['inicio', 'demandas']);
    expect(e.ativa).toBe('inicio');
  });
  it('fechar a ativa ativa a vizinha da direita (ou a da esquerda)', () => {
    let e = vazio as ReturnType<typeof abrir>;
    for (const c of ['a', 'b', 'c']) e = abrir(e, { caminho: c, titulo: c });
    e = { ...e, ativa: 'b' };
    expect(fechar(e, 'b').ativa).toBe('c');
    expect(fechar({ ...e, ativa: 'c' }, 'c').ativa).toBe('b');
    expect(fechar(fechar(fechar(e, 'a'), 'b'), 'c').ativa).toBeNull();
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
