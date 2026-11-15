// Pedidos de ausência (V4, 0090): a própria pessoa solicita e o pedido fica pendente até alguém com `ausencia.aprovar`
// (Admin e GP) decidir. Só o pedido APROVADO vira ausência na agenda (app.ausencias); pendente, recusado e cancelado não
// bloqueiam nada. Quem não aprova recebe sempre só os próprios pedidos.
import { novaOperacao, rpc } from './cliente';
import type { Gravado } from './cadastros';
import { TIPOS_AUSENCIA, type TipoAusencia } from './equipe';

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
