// 4.21.0 (0112): filtro de origem de Ordens de Serviço em seleção múltipla — parâmetro do banco, total do fechamento e gráfico.
import { describe, expect, it } from 'vitest';
import { origemParam, rotuloOrigens, temOrigem } from './consultor';
import { totalDoFiltro, totais, type LinhaFechamento } from './fechamento';
import { acumular, porOrigem, type GraficoProdutividade } from './produtividadeGrafico';

describe('origens de Ordens de Serviço', () => {
  it('nenhuma marcada = todas (inclusive a agenda prevista)', () => {
    expect(origemParam([])).toBe('tudo');
    expect(temOrigem([], 'previsto')).toBe(true);
    expect(rotuloOrigens([])).toBe('OS + app + previsto');
    expect(origemParam(['sankhya_om', 'app', 'previsto'])).toBe('tudo');
  });
  it('lista separada por vírgula; a OS manual acompanha a do Sankhya OM', () => {
    expect(origemParam(['sankhya_om'])).toBe('sankhya_om,manual');
    expect(origemParam(['previsto', 'app'])).toBe('app,previsto');
    expect(origemParam(['previsto'])).toBe('previsto');
    expect(temOrigem(['app'], 'previsto')).toBe(false);
    expect(rotuloOrigens(['app', 'previsto'])).toBe('app + previsto');
  });
  it('valor desconhecido no filtro não conta como marcado', () => {
    expect(origemParam(['outro'])).toBe('tudo');
  });
});

describe('total do fechamento conforme o filtro', () => {
  const l = { horas_os: 100, horas_app: 20.5, previsto: 30 };
  it('soma só as origens marcadas', () => {
    expect(totalDoFiltro(l, { os: true, app: true, previsto: true })).toBe(150.5);
    expect(totalDoFiltro(l, { os: true, app: true, previsto: false })).toBe(120.5);
    expect(totalDoFiltro(l, { os: false, app: false, previsto: true })).toBe(30);
  });
  it('banco anterior à 0112 (sem previsto) soma zero de previsto', () => {
    expect(totalDoFiltro({ horas_os: 8, horas_app: 2 }, { os: true, app: true, previsto: true })).toBe(10);
    expect(totais([{ horas_os: 8, horas_app: 2 } as LinhaFechamento]).previsto).toBe(0);
  });
});

describe('gráfico por origem', () => {
  const g: GraficoProdutividade = { de: '2026-10-01', ate: '2026-10-03', so_proprio: false, consultor_id: null, total: 7,
    tipos: [{ tipo: 'OS Experience', horas: 7 }], dias: [{ dia: '2026-10-01', tipo: 'OS Experience', horas: 7 }],
    dias_origem: [{ dia: '2026-10-01', tipo: 'OS Experience', origem: 'sankhya_om', horas: 4 }, { dia: '2026-10-01', tipo: 'OS Experience', origem: 'app', horas: 3 },
      { dia: '2026-10-01', tipo: 'OS Experience', origem: 'manual', horas: 1 }, { dia: '2026-10-03', tipo: 'Agenda prevista', origem: 'previsto', horas: 8 }] };
  it('recorta pelas origens; a manual conta como OS', () => {
    expect(acumular(porOrigem(g, { os: true, app: false, previsto: false })).total).toBe(5);
    expect(acumular(porOrigem(g, { os: false, app: true, previsto: false })).total).toBe(3);
    const tudo = acumular(porOrigem(g, { os: true, app: true, previsto: true }));
    expect(tudo.total).toBe(16);
    expect(tudo.series.map(s => s.tipo).sort()).toEqual(['Agenda prevista', 'OS Experience']);
  });
  it('dia futuro: sem a prevista é cortado em hoje; com a prevista entra', () => {
    const f = { os: true, app: true, previsto: true };
    expect(acumular(porOrigem(g, f), '2026-10-02').total).toBe(8);
    expect(acumular(porOrigem(g, f)).barras[2].doDia).toBe(8);
  });
  it('banco anterior à 0112 (sem dias_origem): devolve o gráfico como veio', () => {
    const antigo = { ...g, dias_origem: undefined };
    expect(acumular(porOrigem(antigo, { os: false, app: false, previsto: true })).total).toBe(7);
  });
});
