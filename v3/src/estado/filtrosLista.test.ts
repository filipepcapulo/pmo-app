import { describe, expect, it } from 'vitest';
import { juntarPaginas } from '../api/execucao';
import {
  candidatosGrade, consultoresPorDemanda, contarAtivos, fasesPorCliente, filtrarClientes, filtrarDemandas, filtrarProjetos, filtrarTarefas, normalizarFiltro,
  opcoesNomeadas, opcoesPessoas, opcoesTexto, PADRAO_AGENDA_EQUIPE, PADRAO_CLIENTES, PADRAO_DEMANDAS, PADRAO_PROJETOS, PADRAO_TAREFAS, pessoasDaGrade, SEM, temTexto,
} from './filtrosLista';

const FASES = ['P1', 'P2', 'P3', 'Sustentação'];
const ana = { id: 'ana' }, bia = { id: 'bia' };

describe('peças comuns', () => {
  it('texto: todas as palavras, sem acento e sem caixa, em qualquer campo', () => {
    expect(temTexto('', 'x')).toBe(true);
    expect(temTexto('sao joao', 'Usina São João', 'P1')).toBe(true);
    expect(temTexto('joao p1', 'Usina São João', 'P1')).toBe(true);
    expect(temTexto('joao p2', 'Usina São João', 'P1')).toBe(false);
    expect(temTexto('x', null, undefined)).toBe(false);
  });
  it('opções de pessoa: só quem aparece, em ordem, "(sem …)" no fim', () => {
    const nome = (id: string) => ({ ana: 'Ana', bia: 'Bia' } as Record<string, string>)[id];
    expect(opcoesPessoas(['bia', null, 'ana', 'bia', 'zzz'], nome)).toEqual([
      { valor: 'ana', rotulo: 'Ana' }, { valor: 'bia', rotulo: 'Bia' }, { valor: 'zzz', rotulo: '(pessoa removida)' }, { valor: SEM, rotulo: '(sem responsável)' }]);
    expect(opcoesPessoas(['ana'], nome)).toEqual([{ valor: 'ana', rotulo: 'Ana' }]);
  });
  it('opções de texto: a base na ordem dada, extras em ordem, vazio só com rótulo', () => {
    expect(opcoesTexto(['Avulso', 'P2', null], FASES).map(o => o.valor)).toEqual([...FASES, 'Avulso']);
    expect(opcoesTexto(['b', '', 'a'], [], '(sem etapa)').map(o => o.valor)).toEqual(['a', 'b', SEM]);
    expect(opcoesNomeadas([['2', 'Zeta'], ['1', 'Alfa'], ['2', 'Zeta']])).toEqual([{ valor: '1', rotulo: 'Alfa' }, { valor: '2', rotulo: 'Zeta' }]);
  });
});

describe('clientes', () => {
  const cli = [
    { id: 'c1', nome: 'Almont', ativo: true, gp: ana },
    { id: 'c2', nome: 'Usina São João', ativo: true, gp: bia },
    { id: 'c3', nome: 'Zeta', ativo: false, gp: null },
  ];
  const fases = fasesPorCliente([
    { cliente_id: 'c1', fase: 'P3', situacao: 'ativo' }, { cliente_id: 'c1', fase: 'P1', situacao: 'pausado' },
    { cliente_id: 'c1', fase: 'P2', situacao: 'encerrado' }, { cliente_id: 'c2', fase: 'Sustentação', situacao: 'ativo' },
  ], FASES);
  const ids = (f: Partial<typeof PADRAO_CLIENTES>) => filtrarClientes(cli, { ...PADRAO_CLIENTES, ...f }, fases).map(c => c.id);
  it('fases do cliente = projetos abertos, na ordem das fases', () => {
    expect(fases.get('c1')).toEqual(['P1', 'P3']);
    expect(fases.get('c3')).toBeUndefined();
  });
  it('padrão mostra os ativos; situação, GP, fase e texto se somam', () => {
    expect(ids({})).toEqual(['c1', 'c2']);
    expect(ids({ situacao: 'inativos' })).toEqual(['c3']);
    expect(ids({ situacao: 'todos' })).toEqual(['c1', 'c2', 'c3']);
    expect(ids({ gps: ['bia'] })).toEqual(['c2']);
    expect(ids({ situacao: 'todos', gps: [SEM] })).toEqual(['c3']);
    expect(ids({ fases: ['P1', 'Sustentação'] })).toEqual(['c1', 'c2']);
    expect(ids({ fases: ['P2'] })).toEqual([]);   // P2 do c1 está encerrado
    expect(ids({ fases: ['P3'], gps: ['bia'] })).toEqual([]);
    expect(ids({ texto: 'sao' })).toEqual(['c2']);
  });
});

describe('projetos', () => {
  const proj = [
    { id: 'p1', nome: 'Implantação', fase: 'P1', situacao: 'ativo', gp: ana, cliente_id: 'c1', cliente: 'Almont' },
    { id: 'p2', nome: 'Fiscal', fase: 'P3', situacao: 'pausado', gp: bia, cliente_id: 'c1', cliente: 'Almont' },
    { id: 'p3', nome: 'Suporte', fase: 'Sustentação', situacao: 'encerrado', gp: null, cliente_id: 'c2', cliente: 'Usina' },
    { id: 'p4', nome: 'WMS', fase: 'P1', situacao: 'cancelado', gp: ana, cliente_id: 'c2', cliente: 'Usina' },
  ];
  const ids = (f: Partial<typeof PADRAO_PROJETOS>) => filtrarProjetos(proj, { ...PADRAO_PROJETOS, ...f }).map(p => p.id);
  it('situação: abertos (padrão), uma só ou todas', () => {
    expect(ids({})).toEqual(['p1', 'p2']);
    expect(ids({ situacao: 'encerrado' })).toEqual(['p3']);
    expect(ids({ situacao: '' })).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
  it('fase, GP, cliente e texto se somam', () => {
    expect(ids({ situacao: '', fases: ['P1'] })).toEqual(['p1', 'p4']);
    expect(ids({ situacao: '', fases: ['P1'], gps: ['ana'], clientes: ['c2'] })).toEqual(['p4']);
    expect(ids({ situacao: '', gps: [SEM] })).toEqual(['p3']);
    expect(ids({ situacao: '', texto: 'usina p1' })).toEqual(['p4']);
  });
  it('sem cliente na linha (ficha do cliente) o filtro de fase/GP funciona igual', () => {
    const l = [{ nome: 'A', fase: 'P1', situacao: 'ativo', gp: ana }, { nome: 'B', fase: 'P2', situacao: 'encerrado', gp: null }];
    expect(filtrarProjetos(l, { ...PADRAO_PROJETOS, situacao: '', fases: ['P2'] }).map(x => x.nome)).toEqual(['B']);
  });
});

describe('demandas', () => {
  const dem = [
    { id: 'd1', pai_id: null, nome: 'Almoxarifado', status: 'em_andamento', projeto_id: 'p1', tipo: 'entregavel', prioridade: 'alta', responsavel_id: 'ana', etapa: 'Homologação', fase: 'P1', cliente_id: 'c1', cliente: 'Almont', projeto: 'Implantação', totais: { atrasada: true } },
    { id: 'd2', pai_id: 'd1', nome: 'Requisições', status: 'backlog', projeto_id: 'p1', tipo: 'entregavel', prioridade: 'normal', responsavel_id: 'bia', etapa: null, fase: 'P1', cliente_id: 'c1', cliente: 'Almont', projeto: 'Implantação', totais: { atrasada: false } },
    { id: 'd3', pai_id: null, nome: 'Plano fiscal', status: 'planejada', projeto_id: 'p2', tipo: 'plano_acao', prioridade: 'urgente', responsavel_id: null, etapa: 'Execução', fase: 'P3', cliente_id: 'c1', cliente: 'Almont', projeto: 'Fiscal', totais: null },
    { id: 'd4', pai_id: null, nome: 'Chamado 101', status: 'concluida', projeto_id: 'p3', tipo: 'chamado', prioridade: 'normal', responsavel_id: 'ana', etapa: null, fase: 'Sustentação', cliente_id: 'c2', cliente: 'Usina', projeto: 'Suporte' },
  ];
  const ids = (f: Partial<typeof PADRAO_DEMANDAS>, cons?: Map<string, Set<string>>) => filtrarDemandas(dem, { ...PADRAO_DEMANDAS, ...f }, cons).map(d => d.id);
  it('sem filtro devolve tudo, na ordem', () => expect(ids({})).toEqual(['d1', 'd2', 'd3', 'd4']));
  it('fase do projeto, etapa, tipo, prioridade, status, cliente e projeto', () => {
    expect(ids({ fases: ['P3', 'Sustentação'] })).toEqual(['d3', 'd4']);
    expect(ids({ etapas: ['Homologação'] })).toEqual(['d1']);
    expect(ids({ etapas: [SEM] })).toEqual(['d1', 'd2', 'd4']);   // d1 vem como mãe da d2
    expect(ids({ tipos: ['plano_acao', 'chamado'] })).toEqual(['d3', 'd4']);
    expect(ids({ prioridades: ['alta', 'urgente'] })).toEqual(['d1', 'd3']);
    expect(ids({ status: ['concluida'] })).toEqual(['d4']);
    expect(ids({ clientes: ['c2'] })).toEqual(['d4']);
    expect(ids({ projetos: ['p2'] })).toEqual(['d3']);
    expect(ids({ fases: ['P1'], prioridades: ['urgente'] })).toEqual([]);
  });
  it('responsável: o da demanda; a mãe acompanha a subdemanda que passa; "(sem responsável)"', () => {
    expect(ids({ responsaveis: ['ana'] })).toEqual(['d1', 'd4']);
    expect(ids({ responsaveis: ['bia'] })).toEqual(['d1', 'd2']);
    expect(ids({ responsaveis: [SEM] })).toEqual(['d3']);
  });
  it('responsável também por quem tem tarefa na demanda (ficha do projeto)', () => {
    const cons = consultoresPorDemanda([{ demanda_id: 'd3', responsavel_id: 'bia' }, { demanda_id: 'd3', responsavel_id: null }, { demanda_id: 'd4', responsavel_id: 'bia' }]);
    expect(ids({ responsaveis: ['bia'] }, cons)).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(ids({ responsaveis: ['ana'] }, cons)).toEqual(['d1', 'd4']);
  });
  it('só atrasadas e texto (demanda, cliente ou projeto)', () => {
    expect(ids({ atrasadas: true })).toEqual(['d1']);
    expect(ids({ texto: 'requisi' })).toEqual(['d1', 'd2']);
    expect(ids({ texto: 'usina' })).toEqual(['d4']);
    expect(ids({ texto: 'almont fiscal' })).toEqual(['d3']);
  });
  it('demanda do projeto sem os campos opcionais não quebra', () => {
    const l = [{ id: 'x', pai_id: null, nome: 'X', status: 'backlog' }];
    expect(filtrarDemandas(l, PADRAO_DEMANDAS)).toHaveLength(1);
    expect(filtrarDemandas(l, { ...PADRAO_DEMANDAS, tipos: ['entregavel'], prioridades: ['normal'], responsaveis: [SEM] })).toHaveLength(1);
    expect(filtrarDemandas(l, { ...PADRAO_DEMANDAS, atrasadas: true })).toHaveLength(0);
  });
});

describe('tarefas', () => {
  const tar = [
    { id: 't1', nome: 'Levantamento', responsavel_id: 'ana', status: 'concluida', data: '2026-11-03' },
    { id: 't2', nome: 'Configuração', responsavel_id: 'bia', status: 'planejada', data: '2026-11-10' },
    { id: 't3', nome: 'Treinamento', responsavel_id: 'ana', status: 'planejada', data: '2026-11-20' },
  ];
  const ids = (f: Partial<typeof PADRAO_TAREFAS>) => filtrarTarefas(tar, { ...PADRAO_TAREFAS, ...f }).map(t => t.id);
  it('responsável, status e texto', () => {
    expect(ids({})).toEqual(['t1', 't2', 't3']);
    expect(ids({ responsaveis: ['ana'], status: ['planejada'] })).toEqual(['t3']);
    expect(ids({ texto: 'config' })).toEqual(['t2']);
  });
  it('período: de, até, os dois (inclusive) e invertido', () => {
    expect(ids({ de: '2026-11-10' })).toEqual(['t2', 't3']);
    expect(ids({ ate: '2026-11-10' })).toEqual(['t1', 't2']);
    expect(ids({ de: '2026-11-04', ate: '2026-11-19' })).toEqual(['t2']);
    expect(ids({ de: '2026-11-19', ate: '2026-11-04' })).toEqual(['t2']);
  });
});

describe('agenda da equipe', () => {
  const eq = [
    { id: 'm', nome: 'Marcelo', ativo: true, papeis: ['consultor'] }, { id: 'a', nome: 'Ana', ativo: true, papeis: ['desenvolvedor'] },
    { id: 'g', nome: 'Gabi GP', ativo: true, papeis: ['gp'] }, { id: 'f', nome: 'Filipe', ativo: true, papeis: ['gp'] },
    { id: 'x', nome: 'Saiu', ativo: false, papeis: ['consultor'] },
  ];
  const cand = candidatosGrade(eq, new Set(['f', 'x']));
  it('candidatos: ativos que atendem ou têm tarefa, em ordem', () => expect(cand.map(m => m.id)).toEqual(['a', 'f', 'm']));
  it('sem escolha mostra todos; com escolha só os marcados; o texto soma', () => {
    expect(pessoasDaGrade(cand, []).map(m => m.id)).toEqual(['a', 'f', 'm']);
    expect(pessoasDaGrade(cand, ['m', 'a']).map(m => m.id)).toEqual(['a', 'm']);
    expect(pessoasDaGrade(cand, ['m', 'a'], 'mar').map(m => m.id)).toEqual(['m']);
  });
  it('escolhido que saiu da equipe é ignorado (só ele = todos)', () => {
    expect(pessoasDaGrade(cand, ['x', 'm']).map(m => m.id)).toEqual(['m']);
    expect(pessoasDaGrade(cand, ['x']).map(m => m.id)).toEqual(['a', 'f', 'm']);
  });
  it('a escolha guardada só aceita lista de ids', () => {
    expect(normalizarFiltro(PADRAO_AGENDA_EQUIPE, { pessoas: ['m', 3] })).toEqual({ pessoas: ['m'] });
    expect(normalizarFiltro(PADRAO_AGENDA_EQUIPE, { pessoas: 'm' })).toEqual({ pessoas: [] });
  });
});

describe('lembrar e limpar', () => {
  it('conta os campos fora do padrão', () => {
    expect(contarAtivos(PADRAO_PROJETOS, PADRAO_PROJETOS)).toBe(0);
    expect(contarAtivos({ ...PADRAO_PROJETOS, fases: ['P1'], situacao: '' }, PADRAO_PROJETOS)).toBe(2);
  });
  it('filtro guardado: aproveita só campos conhecidos e do tipo certo', () => {
    expect(normalizarFiltro(PADRAO_PROJETOS, null)).toEqual(PADRAO_PROJETOS);
    expect(normalizarFiltro(PADRAO_PROJETOS, { fases: ['P1', 7], gps: 'ana', situacao: 'encerrado', outro: 1, texto: null }))
      .toEqual({ ...PADRAO_PROJETOS, fases: ['P1'], situacao: 'encerrado' });
    expect(normalizarFiltro(PADRAO_DEMANDAS, { atrasadas: 'sim' }).atrasadas).toBe(false);
    expect(normalizarFiltro(PADRAO_DEMANDAS, { atrasadas: true }).atrasadas).toBe(true);
  });
});

describe('lista paginada no banco', () => {
  it('junta as páginas até o total, sem repetir', async () => {
    const paginas = [[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }], [{ id: 'd' }]];
    const pedidas: number[] = [];
    const r = await juntarPaginas(async p => { pedidas.push(p); return { total: 4, itens: paginas[p] ?? [] }; });
    expect(r.itens.map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(r.total).toBe(4);
    expect(pedidas).toEqual([0, 1, 2]);
  });
  it('uma página basta quando já veio tudo; para em página vazia', async () => {
    let n = 0;
    await juntarPaginas(async () => { n++; return { total: 1, itens: [{ id: 'a' }] }; });
    expect(n).toBe(1);
    n = 0;
    const r = await juntarPaginas(async p => { n++; return { total: 9, itens: p === 0 ? [{ id: 'a' }] : [] }; });
    expect(n).toBe(2);
    expect(r.itens).toHaveLength(1);
  });
});
