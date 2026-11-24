// Tarefa sem alocação (4.29.0, 0117): o GP tira o consultor e a data de uma tarefa em aberto para atribuir depois. A tarefa
// sai da agenda e o conteúdo fica guardado na demanda/subdemanda; ao lançar tarefa nova na mesma demanda, o app avisa.
import { novaOperacao, rpc } from './cliente';
import { rotuloModalidade, rotuloPeriodo } from './execucao';

export interface TarefaSemAlocacao {
  id: string; demanda_id: string; demanda: string; pai_id: string | null; nome: string; periodo: string | null; hora_ini: string | null; hora_fim: string | null;
  horas_previstas: number | null; modalidade: string | null; detalhamento: string | null; etapa: string | null; etapa_id: string | null;
  agendamento: string | null; apontamento: string | null; usuario_cliente_id: string | null; origem_tarefa_id: string | null;
  origem_responsavel_id: string | null; origem_responsavel: string | null; origem_data: string | null; criado_em: string; criado_por: string | null;
}

const gravar = <T = { ok: true }>(fn: string, esc: string, d: unknown) => rpc<T>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });

export const semAlocacao = {
  /** Abertas da demanda e das subdemandas dela. */
  lista: (esc: string, demanda: string) => rpc<TarefaSemAlocacao[]>('v4_tarefas_sem_alocacao', { p_escritorio: esc, p_demanda: demanda }),
  desalocar: (esc: string, id: string, versao: number) => gravar<{ ok: true; id: string; demanda_id: string }>('v4_tarefa_desalocar', esc, { id, versao }),
  atribuida: (esc: string, id: string, tarefaNova: string | null) => gravar('v4_tarefa_sem_alocacao_resolver', esc, { id, tarefa_nova_id: tarefaNova }),
  excluir: (esc: string, id: string) => gravar('v4_tarefa_sem_alocacao_resolver', esc, { id, excluir: true }),
};

/** Só as da própria demanda (o aviso do lançamento vale para a mesma demanda/subdemanda), fora a que está sendo atribuída agora. */
export const abertasDaDemanda = (l: TarefaSemAlocacao[], demanda: string, atribuindo?: string | null) =>
  l.filter(s => s.demanda_id === demanda && s.id !== atribuindo);

const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** "Manhã · Remoto · era de Ana em 24/11". */
export function resumoSemAlocacao(s: Pick<TarefaSemAlocacao, 'periodo' | 'hora_ini' | 'hora_fim' | 'modalidade' | 'origem_responsavel' | 'origem_data'>): string {
  return [
    s.periodo ? rotuloPeriodo(s.periodo, s.hora_ini, s.hora_fim) : null,
    s.modalidade ? rotuloModalidade(s.modalidade) : null,
    s.origem_responsavel || s.origem_data ? `era de ${s.origem_responsavel ?? '—'}${s.origem_data ? ` em ${dm(s.origem_data)}` : ''}` : null,
  ].filter(Boolean).join(' · ');
}
/** Texto do aviso ao lançar tarefa nova numa demanda que já tem tarefa aberta sem alocação. */
export const avisoSemAlocacao = (n: number) =>
  `Já ${n === 1 ? 'existe 1 tarefa aberta' : `existem ${n} tarefas abertas`} sem alocação nesta demanda. Quer continuar com o lançamento de uma tarefa nova?`;
