import { describe, expect, it } from 'vitest';
import { abasVisiveis, abrirNova, ativar, caminhoAtivo, caminhoDa, fechar, fecharTodas, INICIO, lerAbasSalvas, MAX_ABAS, MAX_PILHA, mover, navegar, renomear, tituloDa, type EstadoAbas } from './abas';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const p = (caminho: string, titulo = caminho) => ({ caminho, titulo });
const vazio: EstadoAbas = { abas: [], ativa: null };
let n = 0;
const nav = (e: EstadoAbas, caminho: string, titulo?: string) => navegar(e, p(caminho, titulo), `t${n++}`);

describe('abas da V4', () => {
  it('tela do menu abre a aba dela; a mesma tela não repete', () => {
    let e = nav(vazio, 'clientes', 'Clientes');
    e = nav(e, 'demandas', 'Demandas');
    expect(e.abas.map(caminhoDa)).toEqual(['clientes', 'demandas']);
    e = nav(e, 'clientes');
    expect(e.abas).toHaveLength(2);
    expect(caminhoAtivo(e)).toBe('clientes');
  });

  it('navegar por dentro fica na mesma aba (cliente → projeto → demanda)', () => {
    let e = nav(vazio, 'clientes', 'Clientes');
    e = nav(e, `cliente/${U(1)}`, 'ACME');
    e = nav(e, `projeto/${U(2)}`, 'Projeto X');
    e = nav(e, `demanda/${U(3)}`, 'Demanda Y');
    expect(e.abas).toHaveLength(1);
    expect(e.abas[0].pilha.map(x => x.titulo)).toEqual(['Clientes', 'ACME', 'Projeto X', 'Demanda Y']);
    expect(tituloDa(e.abas[0])).toBe('Demanda Y');
  });

  it('voltar (caminho já na trilha) corta a trilha em vez de abrir aba', () => {
    let e = nav(vazio, 'clientes');
    e = nav(e, `cliente/${U(1)}`);
    e = nav(e, `projeto/${U(2)}`);
    e = nav(e, `cliente/${U(1)}`);
    expect(e.abas).toHaveLength(1);
    expect(e.abas[0].pilha.map(x => x.caminho)).toEqual(['clientes', `cliente/${U(1)}`]);
    e = nav(e, 'clientes');
    expect(e.abas[0].pilha).toHaveLength(1);
  });

  it('clicar na tela do menu com a aba dela "funda" volta essa aba para a lista', () => {
    let e = nav(vazio, 'clientes');
    e = nav(e, `cliente/${U(1)}`);
    e = nav(e, 'demandas');
    e = nav(e, 'clientes');
    expect(e.abas).toHaveLength(2);
    expect(caminhoAtivo(e)).toBe('clientes');
    expect(e.abas[0].pilha).toHaveLength(1);
  });

  it('abrirNova permite duas abas da mesma tela; o menu ativa a que já mostra a tela', () => {
    let e = nav(vazio, 'demandas', 'Demandas');
    e = abrirNova(e, p('demandas', 'Demandas'), 'outra');
    expect(e.abas.map(caminhoDa)).toEqual(['demandas', 'demandas']);
    expect(e.ativa).toBe('outra');
    e = ativar(e, e.abas[0].id);
    e = nav(e, `demanda/${U(5)}`);
    expect(e.abas.map(caminhoDa)).toEqual([`demanda/${U(5)}`, 'demandas']);
    e = nav(e, 'demandas');   // voltar na aba ativa (está na trilha dela), não pula para a outra
    expect(e.ativa).toBe(e.abas[0].id);
  });

  it('item aberto a partir do Início abre aba; parâmetro da tela fica na aba da tela', () => {
    let e: EstadoAbas = { abas: [], ativa: INICIO };
    e = nav(e, `chamado/${U(7)}`, 'Chamado 7');
    expect(e.abas).toHaveLength(1);
    e = nav(e, 'chamados');
    e = nav(e, 'chamados/kanban');
    expect(e.abas.map(caminhoDa)).toEqual([`chamado/${U(7)}`, 'chamados/kanban']);
  });

  it('Início não vira aba; fechar ativa a vizinha; fechar todas volta ao Início', () => {
    let e = nav(vazio, 'clientes');
    e = nav(e, 'demandas');
    e = nav(e, INICIO);
    expect(e.ativa).toBe(INICIO);
    expect(e.abas).toHaveLength(2);
    e = ativar(e, e.abas[1].id);
    e = fechar(e, e.abas[1].id);
    expect(caminhoAtivo(e)).toBe('clientes');
    e = fechar(e, e.abas[0].id);
    expect(e.ativa).toBe(INICIO);
    expect(fecharTodas()).toEqual({ abas: [], ativa: INICIO });
  });

  it('limites: no máximo MAX_ABAS abas e MAX_PILHA passos (a raiz fica)', () => {
    let e = vazio;
    for (let i = 0; i < MAX_ABAS + 3; i++) e = abrirNova(e, p('demandas'), `x${i}`);
    expect(e.abas).toHaveLength(MAX_ABAS);
    expect(e.ativa).toBe(`x${MAX_ABAS + 2}`);
    let f = nav(vazio, 'clientes');
    for (let i = 0; i < MAX_PILHA + 4; i++) f = nav(f, `projeto/${U(100 + i)}`);
    expect(f.abas[0].pilha).toHaveLength(MAX_PILHA);
    expect(f.abas[0].pilha[0].caminho).toBe('clientes');
  });

  it('mover, renomear e abas visíveis', () => {
    let e = nav(vazio, 'clientes');
    e = nav(e, 'demandas');
    e = nav(e, 'projetos');
    const [a, b, c] = e.abas.map(x => x.id);
    expect(mover(e, c, a, false).abas.map(x => x.id)).toEqual([c, a, b]);
    expect(mover(e, a, c, true).abas.map(x => x.id)).toEqual([b, c, a]);
    e = nav(ativar(e, a), `cliente/${U(1)}`, 'Cliente');
    e = renomear(e, a, `cliente/${U(1)}`, 'ACME Ltda');
    expect(tituloDa(e.abas[0])).toBe('ACME Ltda');
    expect(renomear(e, a, `cliente/${U(1)}`, 'ACME Ltda')).toBe(e);
    const v = abasVisiveis(e.abas, c, 400, 170, 36);
    expect(v.estourou).toBe(true);
    expect(v.visiveis.map(x => x.id)).toEqual([a, c]);
  });

  it('lê as abas salvas e descarta o que não serve (inclusive o formato da v3)', () => {
    const salvo = JSON.stringify({ abas: [{ id: 'k1', pilha: [p('clientes', 'Clientes'), p(`cliente/${U(1)}`, 'ACME')] }, { id: 'k2', pilha: [] },
      { caminho: 'demandas', titulo: 'Demandas' }, { id: 'k3', pilha: [p('equipe-dev', 'Equipe dev')] }], ativa: 'k1' });
    const e = lerAbasSalvas(salvo);
    expect(e.abas.map(x => x.id)).toEqual(['k1']);
    expect(e.ativa).toBe('k1');
    expect(lerAbasSalvas('lixo')).toEqual({ abas: [], ativa: null });
    expect(lerAbasSalvas(null)).toEqual({ abas: [], ativa: null });
  });
});
