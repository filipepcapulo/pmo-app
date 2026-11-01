// Desvio de agenda (V10b, escopo §6.2): o consultor informa, o GP do projeto atendido aprova (troca automática, D9) ou
// recusa. Tudo no banco (0037); aqui só as chamadas e as contas da tela.
import { novaOperacao, rpc } from './cliente';

export type SituacaoDesvio = 'pendente' | 'aprovado' | 'recusado';
export interface Desvio extends Record<string, unknown> {
  id: string; versao: number; situacao: SituacaoDesvio; data: string; periodo: string; hora_ini: string | null; hora_fim: string | null; horas: number | null;
  consultor_id: string; consultor: string; tarefa_prevista_id: string; tarefa_prevista: string; demanda_prevista_id: string; demanda_prevista: string;
  projeto_previsto_id: string; projeto_previsto: string; cliente_previsto: string; projeto_atendido_id: string; projeto_atendido: string; cliente_atendido: string;
  demanda_atendida_id: string | null; demanda_atendida: string | null; tarefa_criada_id: string | null; orientado_por: string | null; motivo: string;
  motivo_recusa: string | null; aprovado_por: string | null; aprovado_em: string | null; criado_em: string; pode_decidir: boolean;
}
export interface IndicadorDesvio extends Record<string, unknown> {
  consultor_id: string; consultor: string; desvios: number; pendentes: number; aprovados: number; recusados: number;
  horas_desviadas: number; horas_agendadas: number; perc_desviado: number | null;
}
export interface OpcaoProjeto { id: string; nome: string; fase: string; cliente: string }
export interface OpcaoDemanda { id: string; nome: string; pai: string | null }

const gravar = (fn: string, esc: string, d: unknown) => rpc<{ ok: true }>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });

export const desvios = {
  lista: (esc: string, f: { de: string; ate: string; situacao?: string; meus?: boolean }) =>
    rpc<Desvio[]>('v1_desvios', { p_escritorio: esc, p_de: f.de, p_ate: f.ate, p_situacao: f.situacao || null, p_meus: !!f.meus }),
  indicador: (esc: string, de: string, ate: string) => rpc<IndicadorDesvio[]>('v1_desvios_indicador', { p_escritorio: esc, p_de: de, p_ate: ate }),
  projetos: (esc: string, texto: string) => rpc<OpcaoProjeto[]>('v1_desvio_opcoes', { p_escritorio: esc, p_texto: texto || null }),
  demandas: (esc: string, projeto: string) => rpc<OpcaoDemanda[]>('v1_desvio_opcoes', { p_escritorio: esc, p_projeto: projeto }),
  informar: (esc: string, d: { tarefa_prevista_id: string; projeto_atendido_id: string; demanda_atendida_id?: string; orientado_por?: string; motivo: string }) =>
    gravar('v1_desvio_salvar', esc, d),
  aprovar: (esc: string, d: Desvio, demanda?: string) =>
    gravar('v1_desvio_decidir', esc, { id: d.id, versao: d.versao, decisao: 'aprovar', ...(demanda ? { demanda_atendida_id: demanda } : {}) }),
  recusar: (esc: string, d: Desvio, motivo: string) =>
    gravar('v1_desvio_decidir', esc, { id: d.id, versao: d.versao, decisao: 'recusar', motivo_recusa: motivo }),
};

export const ROTULO_SITUACAO: Record<SituacaoDesvio, string> = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado' };

/** A tarefa aceita desvio? A que já chegou, ainda aberta e sem horas lançadas (a mesma regra do banco). */
export const podeDesviar = (t: { data: string; status: string; horas_reais?: number | null }, hoje: string) =>
  t.data <= hoje && ['planejada', 'em_andamento'].includes(t.status) && !(Number(t.horas_reais) > 0);
