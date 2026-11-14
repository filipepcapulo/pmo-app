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
}
/** Resumo gravado no fechamento; o que veio do Produtividade SK (`legado`) só tem horas e valor total. */
export type ResumoFechado = Partial<ResumoFech> & { t_tot: number; total: number; legado?: boolean };
export interface TotaisFech {
  p_tot: number; o_tot: number; aj: number; ajN: number; t_hn: number; t_he: number; t_tot: number; v_hn: number; v_he: number; total: number;
  meta: number | null; pPlan: number;
}
export interface LinhaFech {
  id: string; data: string; orig: 'OS' | 'Planilha'; cli: string; serv: string; os: string; desc: string; hi: string; hf: string;
  hn0: number; he0: number; hn: number; he: number; aj: boolean; ajobs: string; ajpor: string; ajem: string; rate: number; valor: number;
  cat: 'prod' | 'com' | 'int'; semVig: boolean; reg: string;
}
export interface Diferenca { usuario_id: string; nome: string; antes: { min: number; valor: number }; depois: { min: number; valor: number }; dv: number; dm: number }
export interface FechamentoPeriodo {
  periodo: Periodo; fonte: 'pmo' | 'historico'; lista: ResumoFech[]; T: TotaisFech; pendencias: string[]; diferencas: Diferenca[];
  fechamento: { status: 'fechado' | 'reaberto'; fechado_em: string; fechado_por: string | null; reaberto_em: string | null; total: { t_tot: number; total: number } | null; ilegivel: boolean } | null;
  detalhe?: LinhaFech[];
}
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
export function planilhaFechamento(lista: ResumoFech[], T: TotaisFech): Planilha {
  return {
    aba: 'Fechamento',
    colunas: [{ titulo: 'Consultor' }, { titulo: 'Modalidade' }, { titulo: 'Valor hora', tipo: 'V' }, { titulo: 'Valor hora interno', tipo: 'V' }, { titulo: 'Valores hora aplicados' },
      { titulo: 'Fixo (mín.)', tipo: 'V' }, { titulo: 'Meta (h)', tipo: 'V' }, { titulo: 'Planilha (h)', tipo: 'V' }, { titulo: 'OS (h)', tipo: 'V' }, { titulo: 'Ajustes (h)', tipo: 'V' },
      { titulo: 'Normais (h)', tipo: 'V' }, { titulo: 'Extras (h)', tipo: 'V' }, { titulo: 'Total (h)', tipo: 'V' }, { titulo: 'Valor normais', tipo: 'V' }, { titulo: 'Valor extras', tipo: 'V' },
      { titulo: 'Valor total', tipo: 'V' }, { titulo: 'Pago pelo mínimo' }, { titulo: 'Meta %', tipo: 'V' }],
    linhas: [
      ...lista.map(o => [o.nome, o.reg, o.vh, o.vhi || '', textoTaxas(o), o.fixo || '', o.metaH, h(o.p_tot), h(o.o_tot), h(o.aj), h(o.t_hn), h(o.t_he), h(o.t_tot),
        o.v_hn, o.v_he, o.total, o.minimo ? 'Sim' : '', o.meta === null ? '' : Math.round(o.meta * 1000) / 10]),
      ['Total', '', '', '', '', '', '', h(T.p_tot), h(T.o_tot), h(T.aj), h(T.t_hn), h(T.t_he), h(T.t_tot), T.v_hn, T.v_he, T.total, '', T.meta === null ? '' : Math.round(T.meta * 1000) / 10],
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
