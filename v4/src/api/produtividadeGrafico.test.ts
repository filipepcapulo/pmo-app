import { describe, expect, it } from 'vitest';
import { acumular, marcasEixo, OUTROS, seriesDoGrafico } from './produtividadeGrafico';

const g = {
  de: '2026-09-21', ate: '2026-09-25',
  tipos: [{ tipo: 'Bonificado (Planilha)', horas: 6 }, { tipo: 'OS Experience', horas: 7 }],
  dias: [
    { dia: '2026-09-21', tipo: 'OS Experience', horas: 4 },
    { dia: '2026-09-21', tipo: 'Bonificado (Planilha)', horas: 2 },
    { dia: '2026-09-23', tipo: 'OS Experience', horas: 3 },
    { dia: '2026-09-24', tipo: 'Bonificado (Planilha)', horas: 4 },
  ],
};

describe('gráfico de horas acumuladas', () => {
  it('uma barra por dia do período, inclusive os dias sem apontamento', () => {
    const a = acumular(g);
    expect(a.barras.map(b => b.dia)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
    expect(a.barras.map(b => b.doDia)).toEqual([6, 0, 3, 4, 0]);
  });
  it('acumula desde o início do período e fecha no total', () => {
    const a = acumular(g);
    expect(a.barras.map(b => b.acumulado)).toEqual([6, 6, 9, 13, 13]);
    expect(a.total).toBe(13);
  });
  it('empilha por tipo: cada fatia leva o acumulado do seu tipo e a soma das fatias é a barra', () => {
    const a = acumular(g);
    expect(a.barras[3].fatias).toEqual([
      { tipo: 'OS Experience', cor: 0, doDia: 0, acumulado: 7 },
      { tipo: 'Bonificado (Planilha)', cor: 2, doDia: 4, acumulado: 6 },
    ]);
    for (const b of a.barras) expect(b.fatias.reduce((s, f) => s + f.acumulado, 0)).toBeCloseTo(b.acumulado);
  });
  it('tipo que ainda não teve horas não entra na barra', () => {
    const a = acumular({ ...g, dias: g.dias.filter(d => !(d.dia === '2026-09-21' && d.tipo.startsWith('Bonificado'))) });
    expect(a.barras[0].fatias.map(f => f.tipo)).toEqual(['OS Experience']);
  });
  it('dias depois de hoje ficam sem barra (futuro)', () => {
    const a = acumular(g, '2026-09-23');
    expect(a.barras.map(b => b.futuro)).toEqual([false, false, false, true, true]);
    expect(a.barras[4].fatias).toEqual([]);
    expect(a.total).toBe(9);
  });
  it('a cor acompanha o tipo: conhecidos têm cor fixa mesmo quando os outros somem', () => {
    const s1 = seriesDoGrafico([{ tipo: 'Treinamento', horas: 1 }, { tipo: 'OS Experience', horas: 9 }]).series;
    const s2 = seriesDoGrafico([{ tipo: 'Treinamento', horas: 1 }]).series;
    expect(s1.find(s => s.tipo === 'Treinamento')!.cor).toBe(4);
    expect(s2.find(s => s.tipo === 'Treinamento')!.cor).toBe(4);
  });
  it('tipos fora da lista ocupam as cores livres; o que não cabe vira "Outros"', () => {
    const tipos = ['OS Experience', 'Faturado (Planilha)', 'Bonificado (Planilha)', 'Planilha - Serviços', 'Treinamento']
      .map(tipo => ({ tipo, horas: 10 })).concat([{ tipo: 'Sem tipo', horas: 5 }, { tipo: 'Interno', horas: 2 }]);
    const { series, de } = seriesDoGrafico(tipos);
    expect(series).toHaveLength(6);
    expect(series[5]).toEqual({ tipo: OUTROS, cor: 5, horas: 7 });
    expect(de.get('Interno')).toBe(OUTROS);
    const so = seriesDoGrafico([{ tipo: 'Sem tipo', horas: 5 }, { tipo: 'OS Experience', horas: 1 }]).series;
    expect(so.map(s => [s.tipo, s.cor])).toEqual([['OS Experience', 0], ['Sem tipo', 1]]);
  });
  it('"Outros" soma os tipos agrupados em cada dia', () => {
    const tipos = ['OS Experience', 'Faturado (Planilha)', 'Bonificado (Planilha)', 'Planilha - Serviços', 'Treinamento', 'X', 'Y']
      .map(tipo => ({ tipo, horas: 1 }));
    const a = acumular({ de: '2026-09-21', ate: '2026-09-21', tipos, dias: tipos.map(t => ({ dia: '2026-09-21', ...t })) });
    expect(a.barras[0].fatias.find(f => f.tipo === OUTROS)!.acumulado).toBe(2);
    expect(a.barras[0].acumulado).toBe(7);
  });
  it('período vazio: barras zeradas e sem séries', () => {
    const a = acumular({ de: '2026-09-21', ate: '2026-09-22', tipos: [], dias: [] });
    expect(a.series).toEqual([]);
    expect(a.barras.map(b => b.acumulado)).toEqual([0, 0]);
  });
  it('eixo com marcas redondas que cobrem o máximo', () => {
    expect(marcasEixo(13)).toEqual([0, 5, 10, 15]);
    expect(marcasEixo(152)).toEqual([0, 50, 100, 150, 200]);
    expect(marcasEixo(0)).toEqual([0]);
  });
});
