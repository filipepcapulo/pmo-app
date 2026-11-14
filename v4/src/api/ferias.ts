// Controle de Férias (V11a, no lugar do módulo do 2.x). O banco (0041) devolve a programação da contabilidade e as férias
// agendadas; o quadro sai daqui com as MESMAS regras do servidor 2.x (Ferias.js / ferias.py): período pendente com o
// limite mais próximo, dias para o limite legal (art. 134/137 CLT), crítico ≤ 60 dias, atenção ≤ 120, e o agendado que
// cobre o ciclo (início entre 30 dias antes do aquisitivo e o limite).
import { novaOperacao, rpc } from './cliente';
import { diaNum } from './projeto';

export interface PeriodoProg { inicio_aquisitivo: string; fim_aquisitivo: string; limite_gozo: string; dias_direito: number; dias_gozados: number }
export interface ColaboradorProg { nome: string; codigo?: string | number; data_admissao?: string; periodos: PeriodoProg[] }
export interface Programacao { empresa?: string; fonte?: string; data_base?: string; colaboradores: ColaboradorProg[] }
export interface Agendado { nome: string; inicio: string | null; fim: string | null; cancelado: boolean; origem: 'v3' | 'clickup' }
export interface FeriasBanco {
  hoje: string; admin: boolean; agendados: Agendado[];
  programacao: { dados: Programacao; atualizado_em: string; atualizado_por: string } | null;
}

export type StatusFerias = 'atrasado' | 'critico' | 'atencao' | 'agendado' | 'ok';
export const STATUS_FERIAS: { valor: StatusFerias; rotulo: string; cor: string }[] = [
  { valor: 'atrasado', rotulo: 'Atrasado', cor: '#c0362c' }, { valor: 'critico', rotulo: 'Crítico', cor: '#d97a1f' },
  { valor: 'atencao', rotulo: 'Atenção', cor: '#b79a06' }, { valor: 'agendado', rotulo: 'Agendado', cor: '#1f8a44' },
  { valor: 'ok', rotulo: 'Ok', cor: '#87909e' },
];
export const LIMIARES = { critico: 60, atencao: 120 };

export interface LinhaFerias extends Record<string, unknown> {
  nome: string; codigo: string; admissao: string | null; inicio_aq: string; fim_aq: string; limite: string; saldo: number; dias: number;
  status: Exclude<StatusFerias, 'agendado'>; visual: StatusFerias; acao: string; agendado: { inicio: string; fim: string | null } | null;
  periodos: (PeriodoProg & { saldo: number })[];
}

export const ferias = {
  ler: (esc: string) => rpc<FeriasBanco>('v1_ferias', { p_escritorio: esc }),
  programar: (esc: string, programacao: Programacao) =>
    rpc<{ ok: true; colaboradores: number }>('v1_ferias_programacao_salvar', { p_escritorio: esc, p_dados: { programacao }, p_id_operacao: novaOperacao() }),
};

const br = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '?');
const num = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Palavras do nome com mais de 2 letras, sem acento (normalize_name do Python). */
export const tokens = (nome: string) => [...new Set(semAcento(nome).replace(/\./g, ' ').split(/\s+/).filter(t => t.length > 2))];

/** Agendados de quem tem mais palavras em comum com o nome da programação (pelo menos 1). */
export function agendadosDe(nome: string, ag: Agendado[]): Agendado[] {
  const meus = tokens(nome);
  const grupos = new Map<string, Agendado[]>();
  ag.forEach(a => { const k = tokens(a.nome).sort().join(' '); grupos.set(k, [...(grupos.get(k) ?? []), a]); });
  let melhor: string | null = null, n = 0;
  grupos.forEach((_, k) => { const c = k.split(' ').filter(x => meus.includes(x)).length; if (c > n) { n = c; melhor = k; } });
  return melhor ? grupos.get(melhor)! : [];
}

/** Agendado que cobre o ciclo: início entre 30 dias antes do aquisitivo e o limite; o próximo ainda não terminado, ou o último. */
export function cobre(ag: Agendado[], inicioAq: string, limite: string, hoje: string): Agendado | null {
  const de = diaNum(inicioAq) - 30, ate = diaNum(limite);
  const c = ag.filter(a => !a.cancelado && a.inicio && diaNum(a.inicio) >= de && diaNum(a.inicio) <= ate)
    .sort((a, b) => diaNum(a.inicio!) - diaNum(b.inicio!));
  if (!c.length) return null;
  return c.find(a => !a.fim || diaNum(a.fim) >= diaNum(hoje)) ?? c[c.length - 1];
}

export function statusPorDias(dias: number): Exclude<StatusFerias, 'agendado'> {
  return dias < 0 ? 'atrasado' : dias <= LIMIARES.critico ? 'critico' : dias <= LIMIARES.atencao ? 'atencao' : 'ok';
}

function acao(st: StatusFerias, saldo: number, limite: string, ag: Agendado | null) {
  const s = `${num(saldo)} dia(s)`;
  if (ag) return `Férias agendadas: ${br(ag.inicio)} a ${br(ag.fim)}`;
  if (st === 'atrasado') return `URGENTE: período venceu em ${br(limite)} sem férias marcadas — risco de pagamento em dobro (art. 137 CLT). Agendar e comunicar imediatamente.`;
  if (st === 'critico') return `Agendar ${s} nas próximas semanas — prazo limite ${br(limite)}.`;
  if (st === 'atencao') return `Programar ${s} até ${br(limite)} (ainda dá tempo, mas comece a negociar a data).`;
  return `Sem urgência — prazo limite ${br(limite)}.`;
}

const titulo = (s: string) => s.toLowerCase().replace(/(^|[^a-zà-ÿ])([a-zà-ÿ])/g, (_, a: string, b: string) => a + b.toUpperCase());
const ORDEM: Record<StatusFerias, number> = { atrasado: 0, critico: 1, atencao: 2, agendado: 3, ok: 4 };

/** Quadro de férias (montar_dados do ferias.py): uma linha por colaborador, na ordem de urgência. */
export function quadroFerias(prog: Programacao, agendados: Agendado[], hoje: string): LinhaFerias[] {
  return prog.colaboradores.map(c => {
    const pend = c.periodos.filter(p => p.dias_direito - p.dias_gozados > 0);
    const p = (pend.length ? pend : c.periodos).reduce((m, x) => (x.limite_gozo < m.limite_gozo ? x : m));
    const saldo = p.dias_direito - p.dias_gozados, dias = diaNum(p.limite_gozo) - diaNum(hoje), status = statusPorDias(dias);
    const ag = cobre(agendadosDe(c.nome, agendados), p.inicio_aquisitivo, p.limite_gozo, hoje);
    return {
      nome: titulo(c.nome), codigo: String(c.codigo ?? ''), admissao: c.data_admissao ?? null,
      inicio_aq: p.inicio_aquisitivo, fim_aq: p.fim_aquisitivo, limite: p.limite_gozo, saldo, dias, status,
      visual: ag ? 'agendado' : status, acao: acao(status, saldo, p.limite_gozo, ag),
      agendado: ag ? { inicio: ag.inicio!, fim: ag.fim } : null,
      periodos: c.periodos.map(x => ({ ...x, saldo: x.dias_direito - x.dias_gozados })),
    } satisfies LinhaFerias;
  }).sort((a, b) => ORDEM[a.visual] - ORDEM[b.visual] || a.dias - b.dias);
}

/** Confere o JSON da programação antes de enviar (mesmas regras do servidor); devolve até 10 problemas. */
export function validarProgramacao(d: unknown): string[] {
  const e: string[] = [];
  const o = d as Programacao;
  if (!o || typeof o !== 'object' || !Array.isArray(o.colaboradores) || !o.colaboradores.length) return ['Sem "colaboradores".'];
  const dataOk = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  o.colaboradores.forEach((c, i) => {
    const q = `Colaborador ${i + 1}${c?.nome ? ` (${c.nome})` : ''}`;
    if (!c || !String(c.nome ?? '').trim()) e.push(`${q}: sem nome.`);
    if (!c || !Array.isArray(c.periodos) || !c.periodos.length) { e.push(`${q}: sem períodos.`); return; }
    c.periodos.forEach((p, j) => {
      (['inicio_aquisitivo', 'fim_aquisitivo', 'limite_gozo'] as const).forEach(k => { if (!dataOk(p[k])) e.push(`${q}, período ${j + 1}: ${k} deve ser aaaa-mm-dd.`); });
      (['dias_direito', 'dias_gozados'] as const).forEach(k => { if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) e.push(`${q}, período ${j + 1}: ${k} deve ser número.`); });
    });
  });
  return e.slice(0, 10);
}
