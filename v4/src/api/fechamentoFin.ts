// Fechamento de produtividade (F4, 0075 + Edge Function `financeiro`): período 21–20, calculado no servidor com a
// remuneração do cofre. Aqui ficam os tipos do que a função devolve, as chamadas e as contas de tela (períodos, horas,
// planilha e PDF). Nenhum valor é guardado no navegador.
import { sb, FalhaApi } from './cliente';
import { reais } from './financeiro';
import { traduzirErro } from './mensagens';
import type { Planilha } from '../util/xlsx';

export interface Periodo { key: number; label: string; ini: string; fim: string }
export interface Taxa { vh: number; int: boolean; min: number }
export interface ResumoFech {
  usuario_id: string; nome: string; reg: string; vh: number; vhi: number; fixo: number; metaH: number;
  p_hn: number; p_he: number; p_tot: number; o_hn: number; o_he: number; o_tot: number; aj: number; ajN: number;
  t_hn: number; t_he: number; t_tot: number; v_hn: number; v_he: number; soma: number; minimo: boolean; total: number;
  meta: number | null; pPlan: number; semVig: number; taxas: Taxa[]; atendimentos: number; cat: { prod: number; com: number; int: number };
  bp?: number; outras?: number;
}
/** Resumo gravado no fechamento; o que veio do Produtividade SK (`legado`) só tem horas e valor total. */
export type ResumoFechado = Partial<ResumoFech> & { t_tot: number; total: number; legado?: boolean };
export interface TotaisFech {
  p_tot: number; o_tot: number; aj: number; ajN: number; t_hn: number; t_he: number; t_tot: number; v_hn: number; v_he: number; total: number;
  meta: number | null; pPlan: number;
  p_hn?: number; p_he?: number; o_hn?: number; o_he?: number; bp?: number; outras?: number;
}
export interface LinhaFech {
  id: string; data: string; orig: 'OS' | 'Planilha'; cli: string; serv: string; os: string; desc: string; hi: string; hf: string;
  hn0: number; he0: number; hn: number; he: number; aj: boolean; ajobs: string; ajpor: string; ajem: string; rate: number; valor: number;
  cat: 'prod' | 'com' | 'int'; semVig: boolean; reg: string;
  /** só quando a função devolve os atendimentos de todos (aba Histórico) */
  usuario_id?: string; nome?: string; terc?: string;
}
export interface Diferenca { usuario_id: string; nome: string; antes: { min: number; valor: number }; depois: { min: number; valor: number }; dv: number; dm: number }
export interface FechamentoPeriodo {
  periodo: Periodo; fonte: 'pmo' | 'historico'; lista: ResumoFech[]; T: TotaisFech; pendencias: string[]; diferencas: Diferenca[];
  fechamento: { status: 'fechado' | 'reaberto'; fechado_em: string; fechado_por: string | null; reaberto_em: string | null; total: { t_tot: number; total: number } | null; ilegivel: boolean } | null;
  detalhe?: LinhaFech[];
  /** OBS de bonificação / meta por consultor ({usuario_id: texto}) */
  obs?: Record<string, string>;
  /** intervalo personalizado: não é período de fechamento (sem fechar, reabrir nem OBS) */
  intervalo?: boolean;
}
export interface CelulaInd { periodo: number; usuario_id: string; cat: 'prod' | 'com' | 'int'; orig: 'OS' | 'Planilha'; min: number; valor: number; n: number }
export interface Indicadores { periodos: Periodo[]; celulas: CelulaInd[]; consultores: { id: string; nome: string }[]; ilegiveis: number }
/** O que a tela está olhando: um período de fechamento (chave AAAAMM) ou um intervalo de datas. */
export type Recorte = { periodo: number } | { ini: string; fim: string };
export interface MeuFechamento {
  periodo: Periodo; fonte: 'pmo' | 'historico'; status: 'aberto' | 'fechado' | 'reaberto'; fechado_em: string | null;
  atual: ResumoFech | null; fechado: ResumoFechado | null; linhas: LinhaFech[];
}

async function chamar<T>(acao: string, esc: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.functions.invoke('financeiro', { body: { acao, escritorio: esc, ...extra } });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as T;
}

export const fech = {
  ler: (esc: string, periodo: number, consultor?: string) => chamar<FechamentoPeriodo>('fechamento', esc, { periodo, ...(consultor ? { consultor } : {}) }),
  /** Período ou intervalo; `todos` traz os atendimentos de todos os consultores, `consultor` só os dele. */
  recorte: (esc: string, r: Recorte, o: { consultor?: string; todos?: boolean } = {}) => {
    const extra = { ...(o.consultor ? { consultor: o.consultor } : {}), ...(o.todos ? { todos: true } : {}) };
    return 'periodo' in r ? chamar<FechamentoPeriodo>('fechamento', esc, { periodo: r.periodo, ...extra })
      : chamar<FechamentoPeriodo>('fechamento_intervalo', esc, { ini: r.ini, fim: r.fim, ...extra });
  },
  obs: (esc: string, d: { periodo: number; usuario_id: string; texto: string }) => chamar<{ ok: true }>('obs_salvar', esc, { dados: d }),
  indicadores: (esc: string, de: number, ate: number) => chamar<Indicadores>('indicadores', esc, { de, ate }),
  ajustar: (esc: string, d: { apontamento_id: string; hn?: number; he?: number; obs?: string; remover?: boolean }) => chamar<{ ok: true }>('ajuste_salvar', esc, { dados: d }),
  fechar: (esc: string, periodo: number) => chamar<{ ok: true }>('fechamento_fechar', esc, { periodo }),
  reabrir: (esc: string, periodo: number) => chamar<{ ok: true }>('fechamento_reabrir', esc, { periodo }),
  meu: (esc: string, periodo: number) => chamar<MeuFechamento>('meu_fechamento', esc, { periodo }),
};

// ---------------------------------------------------------------- períodos (21 a 20)
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = (n: number) => String(n).padStart(2, '0');
export function periodoDaChave(key: number): Periodo {
  const y = Math.floor(key / 100), m = key % 100, pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
  return { key, label: `${MESES[pm - 1]}-${MESES[m - 1]}${String(y).slice(2)}`.toUpperCase(), ini: `${py}-${pad(pm)}-21`, fim: `${y}-${pad(m)}-20` };
}
/** Período que contém o dia (ISO). */
export function periodoDe(dia: string): Periodo {
  let y = +dia.slice(0, 4), m = +dia.slice(5, 7);
  if (+dia.slice(8, 10) >= 21) { m++; if (m > 12) { m = 1; y++; } }
  return periodoDaChave(y * 100 + m);
}
/** Do período atual para trás (o primeiro é o que está correndo). */
export function ultimosPeriodos(hoje: string, n = 24): Periodo[] {
  const out: Periodo[] = [];
  let k = periodoDe(hoje).key;
  for (let i = 0; i < n; i++) { out.push(periodoDaChave(k)); k = k % 100 === 1 ? k - 89 : k - 1; }
  return out;
}
/** O último período já encerrado (é o que se fecha); `periodos` vem de `ultimosPeriodos`. */
export const periodoEncerrado = (periodos: Periodo[], hoje: string) => periodos.find(p => p.fim < hoje) ?? periodos[0];

// ---------------------------------------------------------------- formatos
/** Minutos → "154:30" (negativo: "-2:00"). */
export function hm(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—';
  const m = Math.round(Math.abs(min));
  return `${min < 0 ? '-' : ''}${Math.floor(m / 60)}:${pad(m % 60)}`;
}
/** "2:30", "2,5" ou "2" (horas) → minutos; vazio ou ilegível = null. */
export function minutosDe(texto: string): number | null {
  const t = texto.trim();
  let m = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (m) return +m[1] * 60 + +m[2];
  m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(t);
  return m ? Math.round(Number(`${m[1]}.${m[2] ?? 0}`) * 60) : null;
}
export const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
/** Valores hora aplicados nas horas normais ("R$ 100,00 · R$ 40,00 int."). */
export const textoTaxas = (o: { taxas?: Taxa[] }, oculto = false) =>
  (o.taxas ?? []).map(t => reais(t.vh, oculto) + (t.int ? ' int.' : '')).join(' · ');
export const rotuloStatus = (s: string) => (s === 'fechado' ? 'Fechado' : s === 'reaberto' ? 'Reaberto' : 'Aberto');
export const ROTULO_CAT = { prod: 'Produtiva', com: 'Apoio comercial', int: 'Interna' } as const;

/** Quem aparece na lista: com horas ou com fixo (como no legado); `semHoras` mostra todos. */
export const visiveis = (lista: ResumoFech[], semHoras: boolean) => (semHoras ? lista : lista.filter(o => o.t_tot > 0 || o.fixo > 0));

// ---------------------------------------------------------------- exportação
const h = (min: number) => Math.round(min / 60 * 100) / 100;
/** Planilha Excel do fechamento (horas em decimal, para somar no Excel). */
export function planilhaFechamento(lista: ResumoFech[], T: TotaisFech, obs: Record<string, string> = {}): Planilha {
  return {
    aba: 'Fechamento',
    colunas: [{ titulo: 'Consultor' }, { titulo: 'Modalidade' }, { titulo: 'Valor hora', tipo: 'V' }, { titulo: 'Valor hora interno', tipo: 'V' }, { titulo: 'Valores hora aplicados' },
      { titulo: 'Fixo (mín.)', tipo: 'V' }, { titulo: 'Meta (h)', tipo: 'V' }, { titulo: 'Planilha normais (h)', tipo: 'V' }, { titulo: 'Planilha extras (h)', tipo: 'V' },
      { titulo: 'Planilha (h)', tipo: 'V' }, { titulo: '% planilha', tipo: 'V' }, { titulo: 'OS normais (h)', tipo: 'V' }, { titulo: 'OS extras (h)', tipo: 'V' }, { titulo: 'OS (h)', tipo: 'V' }, { titulo: 'Ajustes (h)', tipo: 'V' },
      { titulo: 'Normais (h)', tipo: 'V' }, { titulo: 'Extras (h)', tipo: 'V' }, { titulo: 'Total (h)', tipo: 'V' }, { titulo: 'Valor normais', tipo: 'V' }, { titulo: 'Valor extras', tipo: 'V' },
      { titulo: 'Valor total', tipo: 'V' }, { titulo: 'Pago pelo mínimo' }, { titulo: 'Meta %', tipo: 'V' }, { titulo: 'OBS' }],
    linhas: [
      ...lista.map(o => [o.nome, o.reg, o.vh, o.vhi || '', textoTaxas(o), o.fixo || '', o.metaH, h(o.p_hn), h(o.p_he), h(o.p_tot), Math.round(o.pPlan * 1000) / 10,
        h(o.o_hn), h(o.o_he), h(o.o_tot), h(o.aj), h(o.t_hn), h(o.t_he), h(o.t_tot),
        o.v_hn, o.v_he, o.total, o.minimo ? 'Sim' : '', o.meta === null ? '' : Math.round(o.meta * 1000) / 10, obs[o.usuario_id] ?? '']),
      ['Total', '', '', '', '', '', '', h(T.p_hn ?? 0), h(T.p_he ?? 0), h(T.p_tot), Math.round(T.pPlan * 1000) / 10, h(T.o_hn ?? 0), h(T.o_he ?? 0), h(T.o_tot), h(T.aj),
        h(T.t_hn), h(T.t_he), h(T.t_tot), T.v_hn, T.v_he, T.total, '', T.meta === null ? '' : Math.round(T.meta * 1000) / 10, ''],
    ],
  };
}
/** Tabela do PDF do fechamento (textos prontos). */
export function tabelaFechamento(lista: ResumoFech[], T: TotaisFech): { colunas: { titulo: string; dir?: boolean }[]; linhas: string[][] } {
  return {
    colunas: [{ titulo: 'Consultor' }, { titulo: 'Modalidade' }, { titulo: 'Valor hora' }, { titulo: 'Planilha', dir: true }, { titulo: 'OS', dir: true }, { titulo: 'Ajustes', dir: true },
      { titulo: 'Normais', dir: true }, { titulo: 'Extras', dir: true }, { titulo: 'Total h', dir: true }, { titulo: 'Valor normais', dir: true }, { titulo: 'Valor extras', dir: true },
      { titulo: 'Valor total', dir: true }, { titulo: 'Meta', dir: true }],
    linhas: [
      ...lista.map(o => [o.nome, o.reg, textoTaxas(o), hm(o.p_tot), hm(o.o_tot), o.ajN ? hm(o.aj) : '', hm(o.t_hn), hm(o.t_he), hm(o.t_tot), reais(o.v_hn), reais(o.v_he),
        reais(o.total) + (o.minimo ? ' (mín.)' : ''), pct(o.meta)]),
      ['Total', '', '', hm(T.p_tot), hm(T.o_tot), T.ajN ? hm(T.aj) : '', hm(T.t_hn), hm(T.t_he), hm(T.t_tot), reais(T.v_hn), reais(T.v_he), reais(T.total), pct(T.meta)],
    ],
  };
}
/** Planilha Excel do "Meu fechamento": os atendimentos do período. */
export function planilhaMeu(linhas: LinhaFech[]): Planilha {
  return {
    aba: 'Meu fechamento',
    colunas: [{ titulo: 'Data', tipo: 'D' }, { titulo: 'Origem' }, { titulo: 'Cliente' }, { titulo: 'OS' }, { titulo: 'Atividade' }, { titulo: 'Início' }, { titulo: 'Fim' },
      { titulo: 'Normais (h)', tipo: 'V' }, { titulo: 'Extras (h)', tipo: 'V' }, { titulo: 'Ajuste' }, { titulo: 'Valor hora', tipo: 'V' }, { titulo: 'Valor', tipo: 'V' }],
    linhas: linhas.map(r => [r.data, r.orig, r.cli, r.os, r.desc, r.hi, r.hf, h(r.hn), h(r.he), r.aj ? r.ajobs : '', r.rate, r.valor]),
  };
}

// ---------------------------------------------------------------- intervalo personalizado
/** Recusa do intervalo (texto para a tela) ou null. O servidor aceita até 13 períodos (cerca de um ano). */
export function erroIntervalo(ini: string, fim: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return 'Informe as duas datas do intervalo.';
  if (ini > fim) return 'A data inicial vem depois da final.';
  let n = 1;
  for (let k = periodoDe(ini).key; k < periodoDe(fim).key; k = k % 100 === 12 ? k + 89 : k + 1) n++;
  return n > 13 ? 'Escolha um intervalo de até um ano.' : null;
}

// ---------------------------------------------------------------- ajuste: atalhos do Produtividade SK
/** Desconto de 50% do apontamento retroativo: metade das horas APONTADAS (não das já ajustadas). */
export const descontoRetroativo = (l: { hn0: number; he0: number }) =>
  ({ hn: Math.round(l.hn0 / 2), he: Math.round(l.he0 / 2), obs: 'Desconto de apontamento retroativo (50%): apontou fora do prazo' });
/** "Não considerar": zera as horas; o motivo é completado por quem ajusta. */
export const NAO_CONSIDERAR = 'Não considerar: ';
/** Observação válida para gravar o ajuste (obrigatória; o prefixo do atalho sozinho não vale). */
export const obsAjusteValida = (obs: string) => { const t = obs.trim(); return t.length >= 3 && t !== NAO_CONSIDERAR.trim(); };

// ---------------------------------------------------------------- histórico (atendimentos de todos)
export interface FiltroHistorico { consultor: string; origem: '' | 'OS' | 'Planilha'; busca: string; soAjustados: boolean }
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filtrarHistorico(linhas: LinhaFech[], f: FiltroHistorico): LinhaFech[] {
  const q = semAcento(f.busca.trim());
  return linhas.filter(r => (!f.consultor || r.usuario_id === f.consultor) && (!f.origem || r.orig === f.origem) && (!f.soAjustados || r.aj)
    && (!q || semAcento([r.nome, r.cli, r.os, r.desc, r.serv, r.ajobs].join(' ')).includes(q)));
}
export function totaisHistorico(linhas: LinhaFech[]) {
  const t = { n: linhas.length, apontado: 0, considerado: 0, os: 0, planilha: 0, nOs: 0, nPlanilha: 0, valor: 0, ajustes: 0 };
  for (const r of linhas) {
    const min = r.hn + r.he;
    t.apontado += r.hn0 + r.he0; t.considerado += min; t.valor += r.valor;
    if (r.orig === 'OS') { t.os += min; t.nOs++; } else { t.planilha += min; t.nPlanilha++; }
    if (r.aj) t.ajustes++;
  }
  return t;
}
/** Planilha Excel do histórico (as linhas filtradas, na ordem da tela). */
export function planilhaHistorico(linhas: LinhaFech[]): Planilha {
  return {
    aba: 'Atendimentos',
    colunas: [{ titulo: 'Data', tipo: 'D' }, { titulo: 'Consultor' }, { titulo: 'Origem' }, { titulo: 'Cliente' }, { titulo: 'Nº OS' }, { titulo: 'Início' }, { titulo: 'Fim' },
      { titulo: 'Atividade' }, { titulo: 'Categoria' }, { titulo: 'Normais apontadas (h)', tipo: 'V' }, { titulo: 'Extras apontadas (h)', tipo: 'V' },
      { titulo: 'Normais consideradas (h)', tipo: 'V' }, { titulo: 'Extras consideradas (h)', tipo: 'V' }, { titulo: 'Total considerado (h)', tipo: 'V' },
      { titulo: 'Obs. ajuste' }, { titulo: 'Ajustado por' }, { titulo: 'Valor hora aplicado', tipo: 'V' }, { titulo: 'Valor', tipo: 'V' }],
    linhas: linhas.map(r => [r.data, r.nome ?? '', r.orig, r.cli, r.os, r.hi, r.hf, r.desc || r.serv, ROTULO_CAT[r.cat], h(r.hn0), h(r.he0), h(r.hn), h(r.he), h(r.hn + r.he),
      r.aj ? r.ajobs : '', r.aj ? r.ajpor : '', r.rate, r.valor]),
  };
}

// ---------------------------------------------------------------- indicadores
export type Cat = 'prod' | 'com' | 'int';
export const CATS: Cat[] = ['prod', 'com', 'int'];
export interface ResumoInd {
  total: number; cat: Record<Cat, { min: number; valor: number; n: number }>;
  /** ranking por horas produtivas (empate: total) */
  ranking: { id: string; nome: string; prod: number; com: number; int: number; total: number; n: number }[];
  /** uma barra por período, na ordem do tempo */
  porPeriodo: { key: number; label: string; min: Record<Cat, number>; valor: Record<Cat, number> }[];
}
/** Agrupa as células da função (período × consultor × categoria × origem) para os cartões, o ranking e os gráficos. */
export function resumoIndicadores(d: Indicadores, consultor = ''): ResumoInd {
  const zero = () => ({ prod: 0, com: 0, int: 0 });
  const r: ResumoInd = { total: 0, cat: { prod: { min: 0, valor: 0, n: 0 }, com: { min: 0, valor: 0, n: 0 }, int: { min: 0, valor: 0, n: 0 } }, ranking: [],
    porPeriodo: d.periodos.map(p => ({ key: p.key, label: p.label, min: zero(), valor: zero() })) };
  const per = new Map(r.porPeriodo.map(p => [p.key, p]));
  const nomes = new Map(d.consultores.map(c => [c.id, c.nome]));
  const rk = new Map<string, ResumoInd['ranking'][number]>();
  for (const c of d.celulas) {
    if (consultor && c.usuario_id !== consultor) continue;
    r.total += c.min;
    r.cat[c.cat].min += c.min; r.cat[c.cat].valor += c.valor; r.cat[c.cat].n += c.n;
    const p = per.get(c.periodo);
    if (p) { p.min[c.cat] += c.min; p.valor[c.cat] += c.valor; }
    const k = rk.get(c.usuario_id) ?? rk.set(c.usuario_id, { id: c.usuario_id, nome: nomes.get(c.usuario_id) ?? '—', prod: 0, com: 0, int: 0, total: 0, n: 0 }).get(c.usuario_id)!;
    k[c.cat] += c.min; k.total += c.min; k.n += c.n;
  }
  r.ranking = [...rk.values()].sort((a, b) => b.prod - a.prod || b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
  return r;
}
/** Planilha Excel dos indicadores: uma linha por período × consultor × categoria × origem. */
export function planilhaIndicadores(d: Indicadores, consultor = ''): Planilha {
  const nomes = new Map(d.consultores.map(c => [c.id, c.nome])), rot = new Map(d.periodos.map(p => [p.key, p.label]));
  return {
    aba: 'Indicadores',
    colunas: [{ titulo: 'Período' }, { titulo: 'Consultor' }, { titulo: 'Categoria' }, { titulo: 'Origem' }, { titulo: 'Horas', tipo: 'V' }, { titulo: 'Lançamentos', tipo: 'I' }, { titulo: 'Custo', tipo: 'V' }],
    linhas: d.celulas.filter(c => !consultor || c.usuario_id === consultor)
      .map(c => [rot.get(c.periodo) ?? String(c.periodo), nomes.get(c.usuario_id) ?? '—', ROTULO_CAT[c.cat], c.orig, h(c.min), c.n, Math.round(c.valor * 100) / 100]),
  };
}
