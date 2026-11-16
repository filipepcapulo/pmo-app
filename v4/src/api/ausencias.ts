// Pedidos de ausência (V4, 0090): a própria pessoa solicita e o pedido fica pendente até alguém com `ausencia.aprovar`
// (Admin e GP) decidir. Só o pedido APROVADO vira ausência na agenda (app.ausencias); pendente, recusado e cancelado não
// bloqueiam nada. Quem não aprova recebe sempre só os próprios pedidos.
import { novaOperacao, rpc } from './cliente';
import type { Gravado } from './cadastros';
import { faixaTarefa, segundaDe, TIPOS_AUSENCIA, type Ausencia, type TarefaGrade, type TipoAusencia } from './equipe';
import { diaNum, somarDias } from './projeto';

export type SituacaoPedido = 'pendente' | 'aprovada' | 'recusada' | 'cancelada';
export interface PedidoAusencia {
  id: string; versao: number; consultor_id: string; consultor: string; de: string; ate: string; tipo: TipoAusencia; motivo: string;
  hora_ini: string | null; hora_fim: string | null; situacao: SituacaoPedido; resposta: string | null;
  decidido_em: string | null; decidido_por: string | null; criado_em: string;
  /** só na lista de quem aprova: tarefas planejadas ou em andamento da pessoa no período */
  tarefas_no_periodo: number | null;
}
export interface PedidosAusencia { pode_solicitar: boolean; pode_aprovar: boolean; pendentes: number | null; linhas: PedidoAusencia[] }
export interface NovoPedido { de: string; ate: string; tipo: TipoAusencia; motivo: string; hora_ini?: string; hora_fim?: string }

export const ausencias = {
  /** `todos`: os pedidos do escritório (só chega para quem aprova; os demais recebem os próprios). */
  pedidos: (esc: string, f: { todos?: boolean; situacao?: SituacaoPedido } = {}) =>
    rpc<PedidosAusencia>('v4_ausencias_pedidos', { p_escritorio: esc, p_filtros: f }),
  pedir: (esc: string, d: NovoPedido) =>
    rpc<Gravado<PedidoAusencia>>('v4_ausencia_pedido_salvar', { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() }),
  cancelar: (esc: string, p: Pick<PedidoAusencia, 'id' | 'versao'>) =>
    rpc<Gravado<PedidoAusencia>>('v4_ausencia_pedido_salvar', { p_escritorio: esc, p_dados: { id: p.id, versao: p.versao, cancelar: true }, p_id_operacao: novaOperacao() }),
  decidir: (esc: string, p: Pick<PedidoAusencia, 'id' | 'versao'>, aprovar: boolean, resposta?: string) =>
    rpc<Gravado<PedidoAusencia>>('v4_ausencia_pedido_decidir', {
      p_escritorio: esc, p_dados: { id: p.id, versao: p.versao, aprovar, ...(resposta?.trim() ? { resposta: resposta.trim() } : {}) }, p_id_operacao: novaOperacao(),
    }),
};

export const ROTULO_SITUACAO: Record<SituacaoPedido, string> = { pendente: 'Aguardando aprovação', aprovada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada' };
export const TIPOS_PEDIDO = TIPOS_AUSENCIA;

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** "12/12/2026", "12/12/2026 a 15/12/2026" ou "12/12/2026 · 08:00 às 10:00". */
export function periodoPedido(p: Pick<PedidoAusencia, 'de' | 'ate' | 'hora_ini' | 'hora_fim'>): string {
  if (p.hora_ini && p.hora_fim) return `${br(p.de)} · ${p.hora_ini.slice(0, 5)} às ${p.hora_fim.slice(0, 5)}`;
  return p.ate && p.ate !== p.de ? `${br(p.de)} a ${br(p.ate)}` : br(p.de);
}

/** Confere o formulário antes de enviar (as mesmas regras do banco); devolve a mensagem do 1º problema ou null. */
export function erroPedido(d: { de: string; ate: string; motivo: string; parcial: boolean; hora_ini: string; hora_fim: string }, hoje: string): string | null {
  if (!d.de) return 'Informe a data da ausência.';
  const ate = d.parcial ? d.de : d.ate || d.de;
  if (ate < d.de) return 'A data final é anterior à inicial.';
  if ((Date.parse(ate) - Date.parse(d.de)) / 86400000 > 92) return 'O pedido cobre no máximo 3 meses.';
  if ((Date.parse(hoje) - Date.parse(d.de)) / 86400000 > 30) return 'Ausência com mais de 30 dias passados é lançada pelo PMO.';
  if (d.parcial && (!d.hora_ini || !d.hora_fim)) return 'Informe o início e o fim do horário.';
  if (d.parcial && d.hora_fim <= d.hora_ini) return 'O fim do horário precisa ser depois do início.';
  if (d.motivo.trim().length < 3) return 'Informe o motivo.';
  return null;
}
/** Dados do formulário → o que vai para o banco. */
export function montarPedido(d: { de: string; ate: string; tipo: TipoAusencia; motivo: string; parcial: boolean; hora_ini: string; hora_fim: string }): NovoPedido {
  return { de: d.de, ate: d.parcial ? d.de : d.ate || d.de, tipo: d.tipo, motivo: d.motivo.trim(), ...(d.parcial ? { hora_ini: d.hora_ini, hora_fim: d.hora_fim } : {}) };
}

// ---------------------------------------------------------------- Gantt das ausências (4.10.0, só Admin e GP)
// Linhas = pessoas da equipe; colunas = dias, semanas, quinzenas ou meses. Mostra as ausências aprovadas (as mesmas da
// Agenda da equipe) e os pedidos que aguardam aprovação, e avisa quando há tarefa em aberto da pessoa no período.
export type EscalaGantt = 'dia' | 'semana' | 'quinzena' | 'mes';
export const ESCALAS_GANTT: { valor: EscalaGantt; rotulo: string; colunas: number; passo: number; pxDia: number }[] = [
  { valor: 'dia', rotulo: 'Dias', colunas: 28, passo: 7, pxDia: 34 },
  { valor: 'semana', rotulo: 'Semanas', colunas: 13, passo: 4, pxDia: 14 },
  { valor: 'quinzena', rotulo: 'Quinzenas', colunas: 8, passo: 2, pxDia: 7 },
  { valor: 'mes', rotulo: 'Meses', colunas: 12, passo: 3, pxDia: 3.4 },
];
export interface ColunaGantt { de: string; ate: string; rotulo: string; grupo: string }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesDe = (iso: string, k: number) => {
  const n = +iso.slice(0, 4) * 12 + (+iso.slice(5, 7) - 1) + k;
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}-01`;
};
const mesAno = (iso: string) => `${MESES[+iso.slice(5, 7) - 1]}/${iso.slice(2, 4)}`;

/** Início da coluna que contém o dia. */
export function inicioColuna(iso: string, e: EscalaGantt): string {
  if (e === 'dia') return iso;
  if (e === 'semana') return segundaDe(iso);
  if (e === 'mes') return mesDe(iso, 0);
  return iso.slice(0, 8) + (+iso.slice(8, 10) >= 16 ? '16' : '01');
}
/** Início da coluna `k` colunas depois (ou antes, com `k` negativo) da coluna que começa em `ini`. */
export function andarColunas(ini: string, e: EscalaGantt, k: number): string {
  if (e === 'dia') return somarDias(ini, k);
  if (e === 'semana') return somarDias(ini, 7 * k);
  if (e === 'mes') return mesDe(ini, k);
  const q = (+ini.slice(8, 10) >= 16 ? 1 : 0) + k;
  return mesDe(ini, Math.floor(q / 2)).slice(0, 8) + (((q % 2) + 2) % 2 ? '16' : '01');
}
/** `n` colunas a partir da coluna que contém `inicio`. Quinzena = 1–15 e 16–fim do mês. */
export function colunasGantt(inicio: string, e: EscalaGantt, n: number): ColunaGantt[] {
  const out: ColunaGantt[] = [];
  let de = inicioColuna(inicio, e);
  for (let i = 0; i < n; i++) {
    const prox = andarColunas(de, e, 1), ate = somarDias(prox, -1);
    const dd = de.slice(8, 10);
    out.push({
      de, ate, grupo: e === 'mes' ? de.slice(0, 4) : mesAno(de),
      rotulo: e === 'dia' ? dd : e === 'semana' ? `${dd}/${de.slice(5, 7)}` : e === 'quinzena' ? `${dd}–${ate.slice(8, 10)}` : MESES[+de.slice(5, 7) - 1],
    });
    de = prox;
  }
  return out;
}

export interface BarraAusencia {
  chave: string; consultor_id: string; de: string; ate: string; tipo: string; motivo: string | null;
  hora_ini: string | null; hora_fim: string | null; pendente: boolean;
  /** tarefas em aberto (não iniciada / em andamento) da pessoa dentro da ausência */
  conflitos: TarefaGrade[];
}
const ABERTA = new Set(['planejada', 'em_andamento']);
const hNum = (h: string) => Number(h.slice(0, 2)) + Number(h.slice(3, 5)) / 60;
/** A tarefa conflita com a ausência? Ausência de parte do dia só conflita se os horários se cruzam (sem horário = conflita). */
export function conflita(a: Pick<BarraAusencia, 'consultor_id' | 'de' | 'ate' | 'hora_ini' | 'hora_fim'>, t: TarefaGrade): boolean {
  if (t.consultor_id !== a.consultor_id || !ABERTA.has(t.status) || t.data < a.de || t.data > a.ate) return false;
  if (!a.hora_ini || !a.hora_fim) return true;
  const f = faixaTarefa(t);
  return !f || (f[0] < hNum(a.hora_fim) && f[1] > hNum(a.hora_ini));
}
/** Junta as ausências aprovadas (sem repetir a que veio em mais de uma janela) e os pedidos pendentes, já com os conflitos. */
export function barrasAusencia(aprovadas: Ausencia[], pendentes: PedidoAusencia[], tarefas: TarefaGrade[]): BarraAusencia[] {
  const m = new Map<string, BarraAusencia>();
  const por = (b: Omit<BarraAusencia, 'conflitos'>) => { if (!m.has(b.chave)) m.set(b.chave, { ...b, conflitos: [] }); };
  for (const a of aprovadas) por({ chave: ['a', a.id, a.consultor_id, a.de, a.ate, a.hora_ini ?? ''].join('|'), consultor_id: a.consultor_id, de: a.de, ate: a.ate,
    tipo: a.tipo, motivo: a.motivo ?? null, hora_ini: a.hora_ini ?? null, hora_fim: a.hora_fim ?? null, pendente: false });
  for (const p of pendentes) if (p.situacao === 'pendente') por({ chave: 'p|' + p.id, consultor_id: p.consultor_id, de: p.de, ate: p.ate, tipo: p.tipo, motivo: p.motivo,
    hora_ini: p.hora_ini, hora_fim: p.hora_fim, pendente: true });
  const vistos = new Map<string, TarefaGrade>(tarefas.map(t => [t.id, t]));
  const l = [...m.values()].sort((a, b) => a.de.localeCompare(b.de));
  for (const b of l) b.conflitos = [...vistos.values()].filter(t => conflita(b, t)).sort((x, y) => x.data.localeCompare(y.data));
  return l;
}
/** Posição da barra na linha (em dias a partir do início da janela), cortada na janela; null = fora dela. */
export function posicaoBarra(b: Pick<BarraAusencia, 'de' | 'ate'>, de: string, ate: string): { inicio: number; dias: number } | null {
  if (b.ate < de || b.de > ate) return null;
  const i = Math.max(diaNum(b.de), diaNum(de)), f = Math.min(diaNum(b.ate), diaNum(ate));
  return { inicio: i - diaNum(de), dias: f - i + 1 };
}
