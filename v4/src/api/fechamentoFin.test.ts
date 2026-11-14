import { describe, expect, it } from 'vitest';
import {
  hm, minutosDe, pct, periodoDaChave, periodoDe, periodoEncerrado, planilhaFechamento, planilhaMeu, rotuloStatus, tabelaFechamento, textoTaxas, ultimosPeriodos, visiveis,
  type LinhaFech, type ResumoFech, type TotaisFech,
} from './fechamentoFin';
import { textoLog } from './financeiro';
import { gerarXlsx } from '../util/xlsx';

const o = (p: Partial<ResumoFech>): ResumoFech => ({ usuario_id: 'a', nome: 'Ana', reg: 'PJ', vh: 100, vhi: 0, fixo: 0, metaH: 154, p_hn: 0, p_he: 0, p_tot: 0, o_hn: 600, o_he: 0, o_tot: 600,
  aj: 0, ajN: 0, t_hn: 600, t_he: 0, t_tot: 600, v_hn: 1000, v_he: 0, soma: 1000, minimo: false, total: 1000, meta: 10 / 154, pPlan: 0, semVig: 0,
  taxas: [{ vh: 100, int: false, min: 600 }], atendimentos: 1, cat: { prod: 600, com: 0, int: 0 }, ...p });
const T: TotaisFech = { p_tot: 90, o_tot: 600, aj: -30, ajN: 1, t_hn: 600, t_he: 90, t_tot: 690, v_hn: 1000, v_he: 240, total: 6240, meta: 0.0373, pPlan: 0.13 };

describe('fechamento de produtividade (F4)', () => {
  it('período de 21 a 20 com o nome dos dois meses', () => {
    expect(periodoDe('2026-11-13')).toEqual({ key: 202611, label: 'OUT-NOV26', ini: '2026-10-21', fim: '2026-11-20' });
    expect(periodoDe('2026-11-21').key).toBe(202612);
    expect(periodoDe('2026-12-21')).toEqual({ key: 202701, label: 'DEZ-JAN27', ini: '2026-12-21', fim: '2027-01-20' });
    expect(periodoDaChave(202601).ini).toBe('2025-12-21');
  });
  it('lista de períodos começa no que está correndo; o que se fecha é o último encerrado', () => {
    const ps = ultimosPeriodos('2026-01-15', 4);
    expect(ps.map(p => p.key)).toEqual([202601, 202512, 202511, 202510]);
    expect(periodoEncerrado(ps, '2026-01-15').key).toBe(202512);
    expect(periodoEncerrado(ultimosPeriodos('2026-11-21', 3), '2026-11-21').key).toBe(202611);
    expect(ultimosPeriodos('2026-11-13').length).toBe(24);
  });
  it('horas: minutos viram h:mm e o que a pessoa digita vira minutos', () => {
    expect([hm(0), hm(690), hm(-120), hm(9245), hm(null)]).toEqual(['0:00', '11:30', '-2:00', '154:05', '—']);
    expect([minutosDe('2:30'), minutosDe('2,5'), minutosDe('2'), minutosDe(' 0 '), minutosDe('10:05')]).toEqual([150, 150, 120, 0, 605]);
    expect([minutosDe(''), minutosDe('2:75'), minutosDe('abc'), minutosDe('-1')]).toEqual([null, null, null, null]);
    expect([pct(0.5), pct(1.004), pct(null), pct(NaN)]).toEqual(['50%', '100%', '—', '—']);
    expect([rotuloStatus('fechado'), rotuloStatus('reaberto'), rotuloStatus('aberto')]).toEqual(['Fechado', 'Reaberto', 'Aberto']);
  });
  it('valores hora aplicados: mostra todos e respeita o oculto', () => {
    const dois = o({ taxas: [{ vh: 100, int: false, min: 300 }, { vh: 40, int: true, min: 60 }] });
    expect(textoTaxas(dois)).toBe('R$ 100,00 · R$ 40,00 int.');
    expect(textoTaxas(dois, true)).toBe('R$ ••• · R$ ••• int.');
    expect(textoTaxas({})).toBe('');
  });
  it('lista: só quem tem horas ou fixo, a não ser que peça todos', () => {
    const l = [o({}), o({ usuario_id: 'b', t_tot: 0, fixo: 3000 }), o({ usuario_id: 'c', t_tot: 0 })];
    expect(visiveis(l, false).map(x => x.usuario_id)).toEqual(['a', 'b']);
    expect(visiveis(l, true).length).toBe(3);
  });
  it('Excel: horas em decimal, linha de total e o arquivo é gerado', () => {
    const p = planilhaFechamento([o({ minimo: true, total: 5000, fixo: 5000, aj: -30, ajN: 1, t_he: 90, v_he: 240 })], T);
    expect(p.colunas.length).toBe(18);
    expect(p.linhas.every(l => l.length === 18)).toBe(true);
    expect(p.linhas[0].slice(0, 3)).toEqual(['Ana', 'PJ', 100]);
    expect([p.linhas[0][9], p.linhas[0][11], p.linhas[0][12], p.linhas[0][15], p.linhas[0][16]]).toEqual([-0.5, 1.5, 10, 5000, 'Sim']);
    expect([p.linhas[1][0], p.linhas[1][12], p.linhas[1][15]]).toEqual(['Total', 11.5, 6240]);
    expect(gerarXlsx(p).length).toBeGreaterThan(1000);
    const m = planilhaMeu([{ id: '1', data: '2026-11-03', orig: 'OS', cli: 'Cliente', serv: '', os: '77', desc: 'Projeto', hi: '08:00', hf: '12:00', hn0: 240, he0: 0, hn: 120, he: 0,
      aj: true, ajobs: 'glosa', ajpor: 'Dono', ajem: '', rate: 100, valor: 200, cat: 'prod', semVig: false, reg: 'PJ' } as LinhaFech]);
    expect(m.linhas[0]).toEqual(['2026-11-03', 'OS', 'Cliente', '77', 'Projeto', '08:00', '12:00', 2, 0, 'glosa', 100, 200]);
  });
  it('PDF: textos prontos, mínimo marcado e total na última linha', () => {
    const t = tabelaFechamento([o({ minimo: true, total: 5000 })], T);
    expect(t.colunas.length).toBe(13);
    expect(t.linhas[0][11]).toBe('R$ 5.000,00 (mín.)');
    expect(t.linhas[1].slice(0, 1).concat(t.linhas[1].slice(8, 9))).toEqual(['Total', '11:30']);
    expect(t.linhas[1][5]).toBe('-0:30');
  });
  it('registro do cofre fala a língua da tela', () => {
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'fechamento.fechar', alvo: null, registro: '202611' })).toBe('Fechou o período 11/2026');
    expect(textoLog({ em: '', quem: 'Ana', acao: 'fechamento.ver_meu', alvo: 'Ana', registro: '202611' })).toBe('Viu o próprio fechamento 11/2026');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'ajuste.salvar', alvo: 'Ana', registro: 'x' })).toBe('Ajustou horas de Ana');
  });
});
