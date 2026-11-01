// Visão do consultor (V10a, escopo §6): Minha agenda, Minhas demandas, apontamento pelo app, pedido de agenda e o
// relatório de apontamentos. Só grava os próprios registros (0035); a tarefa em si não muda.
import { novaOperacao, rpc } from './cliente';
import type { DemandaLinha, StatusTarefa } from './execucao';
import { diaNum, somarDias } from './projeto';

export interface LinhaAgenda {
  tarefa_id: string; data: string; periodo: string; hora_ini: string | null; hora_fim: string | null; horas_previstas: number | null;
  modalidade: string | null; status: StatusTarefa; tarefa: string; demanda_id: string; demanda: string; projeto_id: string; projeto: string;
  cliente_id: string; cliente: string; horas_reais: number;
}
export type OrigemFiltro = '' | 'sankhya_om' | 'app';
export interface LinhaApontamento extends Record<string, unknown> {
  apontamento_id: string; versao: number; origem: 'sankhya_om' | 'app' | 'manual'; numero_os: string | null; numero_interno: number | null;
  data: string; hora_ini: string | null; intervalo_min: number; hora_fim: string | null; horas: number; texto: string | null;
  consultor_id: string; consultor: string; tarefa_id: string; tarefa: string; demanda: string; projeto: string; cliente: string;
}
export interface RelatorioApontamentos { horas: number; horas_os: number; horas_app: number; total: number; itens: LinhaApontamento[] }
export type SituacaoPedido = 'aberto' | 'atendido' | 'recusado';
export interface PedidoAgenda {
  id: string; versao: number; horas: number; motivo: string; situacao: SituacaoPedido; criado_em: string; solicitante_id: string;
  tarefa_id: string | null; demanda_id: string; demanda: string; projeto_id: string; projeto: string; cliente: string;
}

const gravar = <T = { ok: true }>(fn: string, esc: string, d: unknown) => rpc<T>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });

export const consultor = {
  agenda: (esc: string, de: string, ate: string, eu: string) =>
    rpc<LinhaAgenda[]>('v1_agenda', { p_escritorio: esc, p_de: de, p_ate: ate, p_consultores: [eu] }),
  demandas: (esc: string, status: string[] | null, texto: string | null) =>
    rpc<{ total: number; itens: DemandaLinha[] }>('v1_minhas_demandas', { p_escritorio: esc, p_status: status, p_texto: texto, p_limite: 500 }),
  apontamentos: (esc: string, f: { de: string; ate: string; origem?: OrigemFiltro; equipe?: boolean; consultor?: string | null }) =>
    rpc<RelatorioApontamentos>('v1_apontamentos', { p_escritorio: esc, p_de: f.de, p_ate: f.ate, p_origem: f.origem || null,
      p_equipe: !!f.equipe, p_consultor: f.consultor || null }),
  pedidos: (esc: string, f: { projeto?: string; meus?: boolean }) =>
    rpc<PedidoAgenda[]>('v1_pedidos_agenda', { p_escritorio: esc, p_projeto: f.projeto ?? null, p_meus: !!f.meus }),
  apontar: (esc: string, d: Record<string, unknown>) => gravar('v1_apontamento_salvar', esc, d),
  pedir: (esc: string, d: { tarefa_id?: string; demanda_id?: string; horas: number; motivo: string }) => gravar('v1_pedido_agenda_salvar', esc, d),
  pedidoSituacao: (esc: string, id: string, versao: number, situacao: SituacaoPedido) => gravar('v1_pedido_agenda_salvar', esc, { id, versao, situacao }),
};

const minutos = (h: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(h); return m ? +m[1] * 60 + +m[2] : NaN; };

/** Horas = fim − início − intervalo (a mesma conta do banco); null enquanto o horário não fecha. */
export function horasApontadas(ini: string, fim: string, intervaloMin: number): number | null {
  const janela = minutos(fim) - minutos(ini);
  if (!(janela > 0) || !(intervaloMin >= 0) || intervaloMin >= janela) return null;
  return Math.round((janela - intervaloMin) / 60 * 100) / 100;
}

/** Horário sugerido no apontamento: o da agenda (no dia, com as duas horas de almoço da regra vigente). */
export function horarioSugerido(periodo: string, ini?: string | null, fim?: string | null) {
  const p: Record<string, [string, string, number]> = {
    manha: ['08:00', '12:00', 0], tarde: ['14:00', '18:00', 0], dia: ['08:00', '18:00', 120], noite: ['18:00', '22:00', 0],
  };
  const [i, f, intervalo] = p[periodo] ?? [ini?.slice(0, 5) ?? '', fim?.slice(0, 5) ?? '', 0];
  return { ini: i, fim: f, intervalo };
}

/** Segunda-feira da semana da data. */
export const inicioSemana = (iso: string) => somarDias(iso, -((diaNum(iso) + 3) % 7));
export const diasDaSemana = (iso: string) => { const s = inicioSemana(iso); return [0, 1, 2, 3, 4, 5, 6].map(d => somarDias(s, d)); };

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const nomeDia = (iso: string) => DIAS[(diaNum(iso) + 4) % 7];

/** A tarefa aceita apontamento? Só a que já chegou e não foi cancelada nem deixou de ser executada. */
export const podeApontar = (l: { data: string; status: string }, hoje: string) => l.data <= hoje && !['cancelada', 'nao_executada'].includes(l.status);
