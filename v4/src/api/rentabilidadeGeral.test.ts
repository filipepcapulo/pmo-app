import { describe, expect, it } from 'vitest';
import { agrupar, aplicarFiltro, filtrar, intervaloPadrao, nomeDe, minSemReceita, modoDoTipo, planilhaGeral, proximoNivel, rotuloMes, soCusto, somar, type CelulaGeral, type RentaGeral } from './rentabilidadeGeral';

const cel = (mes: string, periodo: number, cliente: string, projeto: string, consultor: string, h: number, faturado: number, custo: number, x: Partial<CelulaGeral> = {}): CelulaGeral =>
  ({ mes, periodo, cliente_id: cliente, projeto_id: projeto, consultor_id: consultor, min: h * 60, faturado, custo, min_sem_valor: 0, min_sem_custo: 0, ...x });
const D: Pick<RentaGeral, 'clientes' | 'projetos' | 'pessoas' | 'periodos' | 'tipos'> = {
  tipos: [{ id: 'osexperience', nome: 'OS Experience', fatura: true }, { id: 'bonificadoplanilha', nome: 'Bonificado (Planilha)', fatura: false }],
  clientes: [{ id: 'c1', nome: 'Alfa' }, { id: 'c2', nome: 'Beta' }],
  projetos: [{ id: 'p1', nome: 'Implantação', cliente_id: 'c1' }, { id: 'p2', nome: 'Sustentação', cliente_id: 'c1' }, { id: 'p3', nome: 'Fiscal', cliente_id: 'c2' }],
  pessoas: [{ id: 'u1', nome: 'Ana' }, { id: 'u2', nome: 'Bia' }],
  periodos: [{ key: 202610, label: 'SET-OUT26', ini: '2026-09-21', fim: '2026-10-20' }, { key: 202611, label: 'OUT-NOV26', ini: '2026-10-21', fim: '2026-11-20' }],
};
const CELS = [
  cel('2026-10', 202610, 'c1', 'p1', 'u1', 10, 2000, 800),
  cel('2026-10', 202611, 'c1', 'p1', 'u2', 5, 1000, 600),
  cel('2026-11', 202611, 'c1', 'p2', 'u1', 4, 0, 320, { min_sem_valor: 240 }),
  cel('2026-11', 202611, 'c2', 'p3', 'u2', 8, 1200, 1500),
];

describe('rentabilidade geral (0091)', () => {
  it('soma: margem = faturado − custo, % sobre o faturado; sem faturado não há %', () => {
    const t = somar(CELS);
    expect([t.min, t.faturado, t.custo, t.margem, t.min_sem_valor]).toEqual([1620, 4200, 3220, 980, 240]);
    expect(t.margem_pct).toBeCloseTo(980 / 4200);
    expect(somar([CELS[2]]).margem_pct).toBeNull();
    expect(somar([])).toMatchObject({ min: 0, faturado: 0, custo: 0, margem: 0, margem_pct: null });
  });
  it('por período: mês civil ou período 21–20, em ordem cronológica', () => {
    expect(agrupar(D, CELS, 'tempo', 'mes').map(g => [g.id, g.nome, g.faturado, g.custo])).toEqual([['2026-10', 'out/26', 3000, 1400], ['2026-11', 'nov/26', 1200, 1820]]);
    expect(agrupar(D, CELS, 'tempo', 'periodo').map(g => [g.nome, g.faturado])).toEqual([['SET-OUT26', 2000], ['OUT-NOV26', 2200]]);
    expect(rotuloMes('2027-01')).toBe('jan/27');
  });
  it('por cliente, projeto e consultor: do maior faturado para o menor, com margem negativa quando o custo passa', () => {
    expect(agrupar(D, CELS, 'cliente', 'mes').map(g => [g.nome, g.faturado, g.margem])).toEqual([['Alfa', 3000, 1280], ['Beta', 1200, -300]]);
    expect(agrupar(D, CELS, 'projeto', 'mes').map(g => g.nome)).toEqual(['Implantação', 'Fiscal', 'Sustentação']);
    expect(agrupar(D, CELS, 'consultor', 'mes').map(g => [g.nome, g.min / 60, g.custo])).toEqual([['Bia', 13, 2100], ['Ana', 14, 1120]]);
  });
  it('navegar para o nível de baixo: o filtro de uma dimensão restringe as outras', () => {
    const f = aplicarFiltro(D, {}, 'cliente', 'c1');
    expect(agrupar(D, filtrar(CELS, f, 'mes'), 'projeto', 'mes').map(g => g.nome)).toEqual(['Implantação', 'Sustentação']);
    const fp = aplicarFiltro(D, {}, 'projeto', 'p3');
    expect(fp).toEqual({ projeto: 'p3', cliente: 'c2' });                 // o cliente do projeto entra na trilha
    expect(agrupar(D, filtrar(CELS, fp, 'mes'), 'consultor', 'mes').map(g => g.nome)).toEqual(['Bia']);
    expect(aplicarFiltro(D, fp, 'cliente', 'c1')).toEqual({ cliente: 'c1' });   // trocar de cliente tira o projeto do outro
    expect(aplicarFiltro(D, f, 'cliente', 'c1')).toEqual({});                    // clicar de novo desfaz
    expect(filtrar(CELS, { tempo: '202611', consultor: 'u2' }, 'periodo').length).toBe(2);
    expect(filtrar(CELS, { tempo: '2026-10' }, 'mes').length).toBe(2);
  });
  it('nível de baixo sugerido: geral → clientes → projetos → consultores', () => {
    expect(proximoNivel({})).toBe('cliente');
    expect(proximoNivel({ cliente: 'c1' })).toBe('projeto');
    expect(proximoNivel({ cliente: 'c1', projeto: 'p1' })).toBe('consultor');
    expect(proximoNivel({ consultor: 'u1' })).toBe('projeto');
    expect(proximoNivel({ cliente: 'c1', projeto: 'p1', consultor: 'u1' })).toBe('tempo');
  });
  it('nomes, intervalo padrão e planilha', () => {
    expect(nomeDe(D, 'projeto', 'p2', 'mes')).toBe('Sustentação');
    expect(nomeDe(D, 'consultor', 'x', 'mes')).toBe('—');
    expect(nomeDe(D, 'tempo', '202611', 'periodo')).toBe('OUT-NOV26');
    expect(intervaloPadrao('2026-11-14')).toEqual({ ini: '2026-06-01', fim: '2026-11-14' });
    expect(intervaloPadrao('2026-02-10')).toEqual({ ini: '2025-09-01', fim: '2026-02-10' });
    const p = planilhaGeral('cliente', agrupar(D, CELS, 'cliente', 'mes'), somar(CELS));
    expect(p.colunas.map(c => c.titulo)).toEqual(['Cliente', 'Horas', 'Horas não faturadas', 'Horas em pedido bonificado', 'Horas sem custo', 'Faturado', 'Custo', 'Margem', 'Margem %']);
    expect(p.linhas[0]).toEqual(['Alfa', 19, 0, 0, 0, 3000, 1720, 1280, 42.7]);
    expect(p.linhas[p.linhas.length - 1][0]).toBe('Total');
  });
  it('tipo de OS (0094): vira dimensão; o que não conta no faturado aparece só com o custo', () => {
    const cels = [
      cel('2026-11', 202611, 'c1', 'p1', 'u1', 10, 2000, 800, { tipo_id: 'osexperience' }),
      cel('2026-11', 202611, 'c1', 'p1', 'u1', 5, 0, 400, { tipo_id: 'bonificadoplanilha', min_nao_fatura: 300 }),
      cel('2026-11', 202611, 'c1', 'p1', 'u2', 2, 400, 240),                       // célula antiga, sem tipo: cai em (vazio)
    ];
    const g = agrupar(D, cels, 'tipo', 'mes');
    expect(g.map(x => [x.nome, x.faturado, x.custo, x.margem, x.min_nao_fatura])).toEqual([
      ['OS Experience', 2000, 800, 1200, 0], ['(vazio)', 400, 240, 160, 0], ['Bonificado (Planilha)', 0, 400, -400, 300]]);
    expect(g.map(soCusto)).toEqual([false, false, true]);
    const t = somar(cels);
    expect([t.faturado, t.custo, t.margem, t.min_nao_fatura, t.min_sem_valor]).toEqual([2400, 1440, 960, 300, 0]);
    expect(soCusto(t)).toBe(false);
    expect(filtrar(cels, { tipo: 'bonificadoplanilha' }, 'mes').length).toBe(1);
    expect(filtrar(cels, { tipo: 'vazio' }, 'mes').length).toBe(1);
    expect(nomeDe(D, 'tipo', 'osexperience', 'mes')).toBe('OS Experience');
    expect(aplicarFiltro(D, { cliente: 'c1' }, 'tipo', 'bonificadoplanilha')).toEqual({ cliente: 'c1', tipo: 'bonificadoplanilha' });
  });
  it('4.7.0 (0097): pedido bonificado e tipo fora do custo somam em campos próprios; modo do tipo cai no `fatura` do banco antigo', () => {
    const cels = [
      cel('2026-11', 202611, 'c1', 'p1', 'u1', 10, 1200, 800, { tipo_id: 'osexperience', min_bonificado: 240 }),
      cel('2026-11', 202611, 'c1', 'p2', 'u1', 4, 0, 320, { tipo_id: 'osexperience', min_bonificado: 240 }),     // projeto todo bonificado
      cel('2026-11', 202611, 'c1', 'p1', 'u2', 2, 0, 0, { tipo_id: 'retrabalho', min_nao_fatura: 120, min_fora_custo: 120 }),
    ];
    const t = somar(cels);
    expect([t.min_bonificado, t.min_fora_custo, t.min_nao_fatura, minSemReceita(t)]).toEqual([480, 120, 120, 600]);
    const g = agrupar(D, cels, 'projeto', 'mes');
    expect(g.map(x => [x.nome, soCusto(x)])).toEqual([['Implantação', false], ['Sustentação', true]]);
    expect(somar(CELS).min_bonificado).toBe(0);                                  // célula da 4.6.0, sem os campos novos
    expect([modoDoTipo({ fatura: true }), modoDoTipo({ fatura: false }), modoDoTipo({ fatura: true, modo: 'pedido' })]).toEqual(['sim', 'nao', 'pedido']);
    const p = planilhaGeral('projeto', g, t);
    expect(p.linhas[p.linhas.length - 1].slice(0, 5)).toEqual(['Total', 16, 2, 8, 2]);
  });
});
