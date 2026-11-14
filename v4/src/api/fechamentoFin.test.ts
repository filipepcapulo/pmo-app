import { describe, expect, it } from 'vitest';
import {
  descontoRetroativo, erroIntervalo, filtrarHistorico, hm, minutosDe, NAO_CONSIDERAR, obsAjusteValida, pct, periodoDaChave, periodoDe, periodoEncerrado, planilhaFechamento, planilhaHistorico, planilhaIndicadores, planilhaMeu, resumoIndicadores, rotuloStatus, tabelaFechamento, textoTaxas, totaisHistorico, ultimosPeriodos, visiveis,
  type Indicadores, type LinhaFech, type ResumoFech, type TotaisFech,
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
    const p = planilhaFechamento([o({ minimo: true, total: 5000, fixo: 5000, aj: -30, ajN: 1, t_he: 90, v_he: 240, p_hn: 60, p_he: 30, p_tot: 90, pPlan: 0.13 })], T, { a: 'Bônus da meta' });
    expect(p.colunas.length).toBe(24);
    expect(p.linhas.every(l => l.length === 24)).toBe(true);
    expect(p.linhas[0].slice(0, 3)).toEqual(['Ana', 'PJ', 100]);
    expect(p.linhas[0].slice(7, 14)).toEqual([1, 0.5, 1.5, 13, 10, 0, 10]);   // planilha normais/extras/total/%, OS normais/extras/total
    expect([p.linhas[0][14], p.linhas[0][16], p.linhas[0][17], p.linhas[0][20], p.linhas[0][21], p.linhas[0][23]]).toEqual([-0.5, 1.5, 10, 5000, 'Sim', 'Bônus da meta']);
    expect([p.linhas[1][0], p.linhas[1][17], p.linhas[1][20]]).toEqual(['Total', 11.5, 6240]);
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
  const l = (p: Partial<LinhaFech>): LinhaFech => ({ id: '1', data: '2026-11-03', orig: 'OS', cli: 'Cliente SA', serv: '', os: '77', desc: 'Implantação', hi: '08:00', hf: '12:00',
    hn0: 240, he0: 0, hn: 240, he: 0, aj: false, ajobs: '', ajpor: '', ajem: '', rate: 100, valor: 400, cat: 'prod', semVig: false, reg: 'PJ', usuario_id: 'a', nome: 'Ana', ...p });
  it('ajuste: desconto de 50% parte das horas apontadas; "Não considerar" exige o motivo', () => {
    expect(descontoRetroativo({ hn0: 245, he0: 30 })).toMatchObject({ hn: 123, he: 15 });
    expect(descontoRetroativo({ hn0: 240, he0: 0 }).obs).toMatch(/retroativo \(50%\)/);
    expect([obsAjusteValida(NAO_CONSIDERAR), obsAjusteValida(NAO_CONSIDERAR + 'duplicado'), obsAjusteValida(' a '), obsAjusteValida('glosa')]).toEqual([false, true, false, true]);
  });
  it('intervalo personalizado: datas em ordem e no máximo um ano', () => {
    expect(erroIntervalo('2026-11-01', '2026-11-10')).toBeNull();
    expect(erroIntervalo('2025-11-21', '2026-11-20')).toBeNull();
    expect(erroIntervalo('2026-11-10', '2026-11-01')).toMatch(/depois/);
    expect(erroIntervalo('', '2026-11-01')).toMatch(/Informe/);
    expect(erroIntervalo('2025-01-01', '2026-11-01')).toMatch(/um ano/);
  });
  it('histórico: filtra por consultor, origem, texto sem acento e só ajustados; soma apontado × considerado', () => {
    const ls = [l({}), l({ id: '2', orig: 'Planilha', os: '', cli: 'Interno', desc: 'Reunião', cat: 'int', hn0: 120, hn: 60, aj: true, ajobs: 'glosa', ajpor: 'Dono', valor: 100 }),
      l({ id: '3', usuario_id: 'b', nome: 'Bia', he0: 60, he: 60, valor: 600 })];
    const f = { consultor: '', origem: '' as const, busca: '', soAjustados: false };
    expect(filtrarHistorico(ls, { ...f, consultor: 'b' }).map(x => x.id)).toEqual(['3']);
    expect(filtrarHistorico(ls, { ...f, origem: 'Planilha' }).map(x => x.id)).toEqual(['2']);
    expect(filtrarHistorico(ls, { ...f, busca: 'reuniao' }).map(x => x.id)).toEqual(['2']);
    expect(filtrarHistorico(ls, { ...f, busca: 'bia' }).map(x => x.id)).toEqual(['3']);
    expect(filtrarHistorico(ls, { ...f, soAjustados: true }).map(x => x.id)).toEqual(['2']);
    expect(totaisHistorico(ls)).toEqual({ n: 3, apontado: 660, considerado: 600, os: 540, planilha: 60, nOs: 2, nPlanilha: 1, valor: 1100, ajustes: 1 });
    const p = planilhaHistorico(ls);
    expect(p.colunas.length).toBe(18);
    expect(p.linhas[1]).toEqual(['2026-11-03', 'Ana', 'Planilha', 'Interno', '', '08:00', '12:00', 'Reunião', 'Interna', 2, 0, 1, 0, 1, 'glosa', 'Dono', 100, 100]);
  });
  it('indicadores: cartões por categoria, ranking por produtivas e uma barra por período; filtro de consultor', () => {
    const d: Indicadores = { ilegiveis: 0, periodos: [periodoDaChave(202610), periodoDaChave(202611)], consultores: [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Bia' }],
      celulas: [{ periodo: 202610, usuario_id: 'a', cat: 'prod', orig: 'OS', min: 600, valor: 1000, n: 3 }, { periodo: 202611, usuario_id: 'a', cat: 'int', orig: 'Planilha', min: 120, valor: 80, n: 1 },
        { periodo: 202611, usuario_id: 'b', cat: 'prod', orig: 'OS', min: 900, valor: 900, n: 4 }, { periodo: 202611, usuario_id: 'b', cat: 'com', orig: 'Planilha', min: 60, valor: 60, n: 1 }] };
    const r = resumoIndicadores(d);
    expect([r.total, r.cat.prod.min, r.cat.com.min, r.cat.int.min, r.cat.prod.valor, r.cat.prod.n]).toEqual([1680, 1500, 60, 120, 1900, 7]);
    expect(r.ranking.map(x => [x.nome, x.prod, x.total])).toEqual([['Bia', 900, 960], ['Ana', 600, 720]]);
    expect(r.porPeriodo.map(p => [p.label, p.min.prod, p.min.int, p.valor.prod])).toEqual([['SET-OUT26', 600, 0, 1000], ['OUT-NOV26', 900, 120, 900]]);
    const a = resumoIndicadores(d, 'a');
    expect([a.total, a.ranking.length, a.porPeriodo[1].min.prod]).toEqual([720, 1, 0]);
    expect(planilhaIndicadores(d, 'b').linhas).toEqual([['OUT-NOV26', 'Bia', 'Produtiva', 'OS', 15, 4, 900], ['OUT-NOV26', 'Bia', 'Apoio comercial', 'Planilha', 1, 1, 60]]);
  });
  it('registro do cofre fala a língua da tela', () => {
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'fechamento.obs', alvo: 'Ana', registro: '202611' })).toBe('Gravou OBS no fechamento 11/2026');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'fechamento.fechar', alvo: null, registro: '202611' })).toBe('Fechou o período 11/2026');
    expect(textoLog({ em: '', quem: 'Ana', acao: 'fechamento.ver_meu', alvo: 'Ana', registro: '202611' })).toBe('Viu o próprio fechamento 11/2026');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'ajuste.salvar', alvo: 'Ana', registro: 'x' })).toBe('Ajustou horas de Ana');
  });
});
