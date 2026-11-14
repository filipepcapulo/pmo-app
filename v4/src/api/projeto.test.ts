import { describe, expect, it } from 'vitest';
import { gerarCsv } from '../util/csv';
import { gerarPdf } from '../util/pdf';
import type { Tarefa } from './execucao';
import { dependenciaViolada, itensDoMovimento, linhasGantt, porConsultor, proximosMarcos, riscos, somarDias, type DemandaProjeto } from './projeto';

const dem = (o: Partial<DemandaProjeto> & { id: string }): DemandaProjeto =>
  ({ projeto_id: 'p', pai_id: null, nome: o.id, status: 'planejada', horas_previstas: null, etapa: null, versao: 1, ...o });

describe('Gantt', () => {
  const lista = [
    dem({ id: 'D', inicio: '2026-11-02', fim: '2026-11-04' }),
    dem({ id: 'S1', pai_id: 'D', inicio: '2026-11-03', fim: '2026-11-05', versao: 3 }),
    dem({ id: 'S2', pai_id: 'D', totais: { inicio: '2026-11-10', fim: '2026-11-12' } }),
    dem({ id: 'X', status: 'cancelada', inicio: '2026-11-01', fim: '2026-11-01' }),
    dem({ id: 'L' }),
  ];
  it('demanda com subdemandas vira resumo (próprias + filhas); sem datas fica sem barra; cancelada some', () => {
    const l = linhasGantt(lista);
    expect(l.map(x => x.d.id)).toEqual(['D', 'S1', 'S2', 'L']);
    expect(l[0]).toMatchObject({ resumo: true, faixa: { inicio: '2026-11-02', fim: '2026-11-12' }, filhas: ['S1', 'S2'] });
    expect(l[2].faixa).toEqual({ inicio: '2026-11-10', fim: '2026-11-12' });  // efetivas (tarefas)
    expect(l[3].faixa).toBeNull();
    expect(linhasGantt(lista, true).some(x => x.d.id === 'X')).toBe(true);
  });
  it('mover a resumo desloca ela e as filhas com a versão lida; as pontas só mudam a própria', () => {
    const l = linhasGantt(lista);
    expect(itensDoMovimento(l, 'D', 'mover', 7)).toEqual([
      { id: 'D', versao: 1, inicio: '2026-11-09', fim: '2026-11-11' },
      { id: 'S1', versao: 3, inicio: '2026-11-10', fim: '2026-11-12' },
      { id: 'S2', versao: 1, inicio: '2026-11-17', fim: '2026-11-19' },
    ]);
    expect(itensDoMovimento(l, 'D', 'fim', 2)).toEqual([]);           // resumo não estica
    expect(itensDoMovimento(l, 'S1', 'fim', 2)).toEqual([{ id: 'S1', versao: 3, inicio: '2026-11-03', fim: '2026-11-07' }]);
    expect(itensDoMovimento(l, 'S1', 'inicio', 5)).toEqual([]);       // início depois do fim
    expect(itensDoMovimento(l, 'S1', 'mover', 0)).toEqual([]);
  });
  it('datas atravessam mês/ano sem fuso', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('dependência descumprida conforme o tipo e a folga', () => {
    const o = { inicio: '2026-11-02', fim: '2026-11-05' };
    const dep = { id: 'x', origem: 'a', destino: 'b', tipo: 'TI' as const, folga_dias: 0, versao: 1 };
    expect(dependenciaViolada(dep, o, { inicio: '2026-11-06', fim: '2026-11-07' })).toBe(false);
    expect(dependenciaViolada(dep, o, { inicio: '2026-11-05', fim: '2026-11-07' })).toBe(true);
    expect(dependenciaViolada({ ...dep, folga_dias: 2 }, o, { inicio: '2026-11-07', fim: '2026-11-09' })).toBe(true);
    expect(dependenciaViolada({ ...dep, tipo: 'II' }, o, { inicio: '2026-11-02', fim: '2026-11-03' })).toBe(false);
  });
});

describe('indicadores', () => {
  it('riscos do 5W2H: vencido/urgente = crítico, alta em 7 dias = alto, demais moderado; só abertos', () => {
    const r = riscos([
      dem({ id: 'a', tipo: 'plano_acao', fim: '2026-11-10', prioridade: 'normal' }),
      dem({ id: 'b', tipo: 'plano_acao', fim: '2026-10-30', prioridade: 'normal' }),
      dem({ id: 'c', tipo: 'plano_acao', fim: '2026-11-05', prioridade: 'alta' }),
      dem({ id: 'd', tipo: 'plano_acao', fim: '2026-11-05', status: 'concluida' }),
      dem({ id: 'e', tipo: 'entregavel', fim: '2026-10-01' }),
    ], '2026-10-31');
    expect(r.map(x => [x.d.id, x.nivel])).toEqual([['b', 'critico'], ['c', 'alto'], ['a', 'moderado']]);
  });
  it('próximos marcos: entregáveis abertos com fim a partir de hoje, ordenados', () => {
    const m = proximosMarcos([
      dem({ id: 'go', nome: 'Go Live', fim: '2026-11-20' }), dem({ id: 'v', fim: '2026-10-01' }),
      dem({ id: 't', fim: '2026-11-03' }), dem({ id: 's', pai_id: 't', fim: '2026-11-01' }),
    ], '2026-10-31');
    expect(m.map(x => x.d.id)).toEqual(['t', 'go']);
    expect(m[1].golive).toBe(true);
  });
  it('consumo por consultor: real (OS/app), planejado sem apontamento, próxima tarefa', () => {
    const t = (o: Partial<Tarefa>) => ({ id: 'x', demanda_id: 'd1', responsavel_id: 'u1', data: '2026-11-04', status: 'planejada', horas_previstas: 4, horas_reais: null, ...o }) as Tarefa;
    const c = porConsultor([t({ horas_reais: 3, status: 'concluida', data: '2026-10-20' }), t({}), t({ demanda_id: 'd2', data: '2026-11-02' }),
      t({ responsavel_id: 'u2', status: 'cancelada' })], '2026-10-31');
    expect(c).toEqual([{ id: 'u1', real: 3, planejado: 8, tarefas: 3, demandas: ['d1', 'd2'], proxima: '2026-11-02' }]);
  });
});

describe('exportação', () => {
  it('CSV para o Excel em português: BOM, ";" e vírgula decimal, aspas quando precisa', () => {
    expect(gerarCsv(['Nome', 'Horas'], [['A; "b"', 2.5], [null, true]])).toBe('\uFEFFNome;Horas\r\n"A; ""b""";2,5\r\n;Sim\r\n');
  });
  it('PDF: cabeçalho, imagem JPEG e xref com os deslocamentos certos', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = gerarPdf('Cronograma · Almont (ção)', jpeg, 1600, 400);
    const txt = new TextDecoder('latin1').decode(pdf);
    expect(txt.startsWith('%PDF-1.4')).toBe(true);
    expect(txt).toContain('/Filter /DCTDecode /Length 4');
    expect(txt).toContain('(Cronograma \xB7 Almont \\(\xE7\xE3o\\)) Tj');
    const xref = Number(/startxref\n(\d+)/.exec(txt)![1]);
    expect(txt.slice(xref, xref + 4)).toBe('xref');
    const off = [...txt.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
    off.forEach((o, i) => expect(txt.slice(o, o + 8)).toBe(`${i + 1} 0 obj\n`));
  });
});
