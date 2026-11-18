import { describe, expect, it } from 'vitest';
import { agrupar, balde, camposDe, configInicial, dadosGrafico, filtrar, FONTES, fontesDoPainel, linhaDoTempo, MAX_SERIES, medir, normalizar, OUTROS, periodoDe, sanear, valoresDe, VAZIO,
  type ConfigGraficos, type ConfigLinhaTempo, type ConfigTabela, type Linha } from './paineis';
import { passoEixo } from '../componentes/GraficoDin';

const L: Linha[] = [
  { id: 't1', data: '2026-11-16', consultor: 'Ana', cliente: 'Almont', status: 'Concluída', horas_previstas: 4 },
  { id: 't2', data: '2026-11-18', consultor: 'Ana', cliente: 'HPA', status: 'Não iniciada', horas_previstas: 8 },
  { id: 't3', data: '2026-11-24', consultor: 'Bia', cliente: 'Almont', status: 'Não iniciada', horas_previstas: 4 },
  { id: 't4', data: '2026-12-01', consultor: null, cliente: 'Almont', status: 'Não iniciada', horas_previstas: null },
];

describe('painéis: catálogo', () => {
  it('toda fonte tem campo de texto, de data e de número, sem campo financeiro nem do ClickUp', () => {
    for (const f of FONTES) {
      expect(camposDe(f.valor, 'texto').length).toBeGreaterThan(3);
      expect(camposDe(f.valor, 'data').length).toBeGreaterThan(0);
      expect(camposDe(f.valor, 'numero').length).toBeGreaterThan(0);
      expect(f.campos.some(c => /valor|custo|salario|margem|clickup/i.test(c.chave))).toBe(false);
    }
  });
  it('normalizar troca os códigos pelos rótulos do app e sim/não', () => {
    const [t] = normalizar('tarefas', [{ id: 'a', status: 'planejada', periodo: 'manha', de_chamado: true, tipo_os: '', horas_previstas: 4 }]);
    expect(t.status).toBe('Não iniciada'); expect(t.de_chamado).toBe('Sim'); expect(t.tipo_os).toBeNull(); expect(t.horas_previstas).toBe(4);
    const [d] = normalizar('demandas', [{ id: 'd', status: 'backlog', prioridade: 'alta', tipo: 'plano_acao', atrasada: false }]);
    expect(d.status).toBe('Não iniciado'); expect(d.prioridade).toBe('Alta'); expect(d.tipo).toBe('Plano de ação'); expect(d.atrasada).toBe('Não');
  });
});

describe('painéis: filtro e medida', () => {
  it('filtro vazio não filtra; valor nulo casa com "(vazio)"', () => {
    expect(filtrar(L, {})).toHaveLength(4);
    expect(filtrar(L, { consultor: [] })).toHaveLength(4);
    expect(filtrar(L, { consultor: ['Ana'], cliente: ['HPA'] }).map(l => l.id)).toEqual(['t2']);
    expect(filtrar(L, { consultor: [VAZIO] }).map(l => l.id)).toEqual(['t4']);
    expect(valoresDe(L, 'consultor')).toEqual([VAZIO, 'Ana', 'Bia']);
  });
  it('medida: contagem ou soma do campo numérico (nulo conta zero)', () => {
    expect(medir(L, 'contagem')).toBe(4);
    expect(medir(L, 'horas_previstas')).toBe(16);
  });
});

describe('painéis: agrupamento (descida de nível)', () => {
  it('um nível por campo, com contagem e soma; a folha guarda as linhas', () => {
    const a = agrupar(L, ['consultor', 'cliente'], ['horas_previstas']);
    expect(a.map(n => [n.valor, n.n, n.somas.horas_previstas])).toEqual([[VAZIO, 1, 0], ['Ana', 2, 12], ['Bia', 1, 4]]);
    const ana = a[1];
    expect(ana.linhas).toEqual([]);
    expect(ana.filhos.map(f => [f.valor, f.linhas.length])).toEqual([['Almont', 1], ['HPA', 1]]);
    expect(new Set(a.flatMap(n => [n.chave, ...n.filhos.map(f => f.chave)])).size).toBe(7);
    expect(agrupar(L, [], [])).toEqual([]);
  });
});

describe('painéis: datas', () => {
  it('balde por dia, semana (segunda), mês, trimestre e ano', () => {
    expect(balde('2026-11-18', 'dia')).toEqual({ chave: '2026-11-18', rotulo: '18/11' });
    expect(balde('2026-11-18', 'semana')).toEqual({ chave: '2026-11-16', rotulo: 'sem. 16/11' });
    expect(balde('2026-11-22', 'semana')?.chave).toBe('2026-11-16');   // domingo fecha a semana
    expect(balde('2026-11-18', 'mes')).toEqual({ chave: '2026-11', rotulo: 'nov/26' });
    expect(balde('2026-11-18', 'trimestre')).toEqual({ chave: '2026-T4', rotulo: '4º tri/26' });
    expect(balde('2026-11-18', 'ano')).toEqual({ chave: '2026', rotulo: '2026' });
    expect(balde(null, 'mes')).toBeNull();
  });
  it('linha do tempo: linha × datas agrupadas, com totais e o que ficou sem data', () => {
    const m = linhaDoTempo([...L, { id: 't5', data: null, consultor: 'Ana', horas_previstas: 2 }], { linha: 'consultor', campoData: 'data', gran: 'semana', medida: 'horas_previstas' });
    expect(m.colunas.map(c => c.chave)).toEqual(['2026-11-16', '2026-11-23', '2026-11-30']);
    expect(m.linhas.map(l => [l.nome, l.total])).toEqual([[VAZIO, 0], ['Ana', 12], ['Bia', 4]]);
    expect(m.linhas[1].celulas['2026-11-16']).toBe(12);
    expect(m.totais['2026-11-16']).toBe(12); expect(m.total).toBe(16); expect(m.semData).toBe(1); expect(m.maximo).toBe(12);
  });
  it('período do painel: dias para trás e para frente, limitado a 400 dias', () => {
    expect(periodoDe({ antes: 30, depois: 30 }, '2026-11-18')).toEqual({ de: '2026-10-19', ate: '2026-12-18' });
    expect(periodoDe(undefined, '2026-11-18')).toEqual({ de: '2026-10-19', ate: '2026-12-18' });
    const p = periodoDe({ antes: 900, depois: 900 }, '2026-11-18');
    expect(p).toEqual({ de: '2025-11-18', ate: '2026-12-23' });
  });
});

describe('painéis: gráficos', () => {
  it('eixo X de data em ordem; uma série por valor, da maior para a menor', () => {
    const g = dadosGrafico(L, { x: 'data', gran: 'semana', medida: 'horas_previstas', serie: 'status' }, true);
    expect(g.categorias.map(c => c.rotulo)).toEqual(['sem. 16/11', 'sem. 23/11', 'sem. 30/11']);
    expect(g.series).toEqual([{ nome: 'Não iniciada', valores: [8, 4, 0] }, { nome: 'Concluída', valores: [4, 0, 0] }]);
    expect(g.maximo).toBe(8);
  });
  it('eixo X de texto: da maior para a menor; sem série, uma só', () => {
    const g = dadosGrafico(L, { x: 'cliente', gran: 'mes', medida: 'contagem', serie: null }, false);
    expect(g.categorias.map(c => c.rotulo)).toEqual(['Almont', 'HPA']);
    expect(g.series).toEqual([{ nome: '', valores: [3, 1] }]);
  });
  it('mais de 8 séries: ficam as 7 maiores e o resto soma em "Outros"', () => {
    const muitas: Linha[] = Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i, data: '2026-11-18', consultor: 'C' + String(i).padStart(2, '0'), horas_previstas: 12 - i }));
    const g = dadosGrafico(muitas, { x: 'data', gran: 'mes', medida: 'horas_previstas', serie: 'consultor' }, true);
    expect(g.series).toHaveLength(MAX_SERIES);
    expect(g.series.at(-1)).toEqual({ nome: OUTROS, valores: [5 + 4 + 3 + 2 + 1] });
    expect(g.series[0]).toEqual({ nome: 'C00', valores: [12] });
  });
  it('passo do eixo Y é um número redondo', () => {
    expect(passoEixo(0)).toBe(1); expect(passoEixo(7)).toBe(2); expect(passoEixo(38)).toBe(10); expect(passoEixo(309)).toBe(100); expect(passoEixo(1900)).toBe(500);
  });
});

describe('painéis: configuração', () => {
  it('configuração inicial de cada formato já é válida', () => {
    for (const t of ['tabela', 'linha_tempo', 'graficos'] as const) expect(sanear(t, configInicial(t))).toEqual({ ...configInicial(t), ...(t === 'graficos' ? { graficos: [{ ...(configInicial(t) as ConfigGraficos).graficos[0], filtros: {} }] } : { filtros: {} }) });
  });
  it('sanear tira campo que não existe, limita os níveis e conserta medida e data inválidas', () => {
    const t = sanear('tabela', { fonte: 'demandas', colunas: ['cliente', 'nao_existe'], grupos: ['status', 'x', 'etapa', 'cliente', 'projeto', 'tipo'], filtros: { status: ['Concluído'], y: ['1'], etapa: [] } }) as ConfigTabela;
    expect(t.colunas).toEqual(['cliente']); expect(t.grupos).toEqual(['status', 'etapa', 'cliente', 'projeto']); expect(t.filtros).toEqual({ status: ['Concluído'] });
    const l = sanear('linha_tempo', { fonte: 'chamados', linha: 'consultor', campoData: 'data', gran: 'hora' as never, medida: 'horas' }) as ConfigLinhaTempo;
    expect(l).toMatchObject({ fonte: 'chamados', linha: 'titulo', campoData: 'aberto_em', gran: 'semana', medida: 'contagem' });
    const g = sanear('graficos', { graficos: [] }) as ConfigGraficos;
    expect(g.graficos).toHaveLength(1);
  });
  it('fontes do painel: a da tabela; as dos gráficos sem repetir', () => {
    expect(fontesDoPainel('tabela', { fonte: 'chamados', colunas: [], grupos: [] })).toEqual(['chamados']);
    const g = (f: 'tarefas' | 'chamados') => ({ titulo: '', tipo: 'barras' as const, fonte: f, x: 'cliente', gran: 'mes' as const, medida: 'contagem' });
    expect(fontesDoPainel('graficos', { graficos: [g('tarefas'), g('chamados'), g('tarefas')] })).toEqual(['tarefas', 'chamados']);
  });
});
