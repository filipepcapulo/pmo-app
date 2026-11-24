// Atividades da demanda/subdemanda (4.29.0, 0117): o checklist da demanda vira a lista do que precisa ser cumprido pelas
// tarefas. O responsável aponta, pela tarefa, o que realizou totalmente, parcialmente ou não realizou; a situação de cada
// atividade é a maior marca entre as tarefas (o GP pode definir à mão na demanda).
import { novaOperacao, rpc } from './cliente';
import type { ItemChecklist } from './execucao';

export type SituacaoAtividade = 'pendente' | 'parcial' | 'realizada';
export type MarcaAtividade = 'realizada' | 'parcial' | 'nao_realizada';
export interface AtividadeTarefa { id: string; texto: string; situacao: SituacaoAtividade; ordem: number; minha: MarcaAtividade | null }
export interface AtividadesDaTarefa { tarefa_id: string; demanda_id: string; demanda: string; pode_marcar: boolean; itens: AtividadeTarefa[] }

const gravar = <T = { ok: true }>(fn: string, esc: string, d: unknown) => rpc<T>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });

export const atividades = {
  daTarefa: (esc: string, tarefa: string) => rpc<AtividadesDaTarefa>('v4_atividades', { p_escritorio: esc, p_tarefa: tarefa }),
  apontar: (esc: string, tarefa: string, itens: { id: string; situacao: MarcaAtividade }[]) =>
    gravar<{ ok: true; itens: ItemChecklist[] }>('v4_atividades_apontar', esc, { tarefa_id: tarefa, itens }),
  definir: (esc: string, id: string, versao: number, situacao: SituacaoAtividade) => gravar('v4_atividade_situacao', esc, { id, versao, situacao }),
};

export const SITUACOES_ATIVIDADE: { valor: SituacaoAtividade; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendente' }, { valor: 'parcial', rotulo: 'Parcial' }, { valor: 'realizada', rotulo: 'Realizada' },
];
export const MARCAS_ATIVIDADE: { valor: MarcaAtividade; rotulo: string }[] = [
  { valor: 'nao_realizada', rotulo: 'Não realizei' }, { valor: 'parcial', rotulo: 'Parcial' }, { valor: 'realizada', rotulo: 'Total' },
];
export const rotuloSituacaoAtividade = (s: SituacaoAtividade | undefined) => SITUACOES_ATIVIDADE.find(x => x.valor === s)?.rotulo ?? 'Pendente';
export const rotuloMarca = (m: MarcaAtividade) => ({ realizada: 'realizou totalmente', parcial: 'realizou parcialmente', nao_realizada: 'não realizou' })[m];
/** Item antigo (ficha anterior à 0117) não traz a situação: vale o feito. */
export const situacaoDe = (i: Pick<ItemChecklist, 'feito' | 'situacao'>): SituacaoAtividade => i.situacao ?? (i.feito ? 'realizada' : 'pendente');

/** "2 de 5 realizadas · 1 parcial" (vazio sem itens). */
export function resumoAtividades(itens: { situacao: SituacaoAtividade }[]): string {
  if (!itens.length) return '';
  const n = (s: SituacaoAtividade) => itens.filter(i => i.situacao === s).length;
  const parc = n('parcial');
  return `${n('realizada')} de ${itens.length} realizadas${parc ? ` · ${parc} ${parc === 1 ? 'parcial' : 'parciais'}` : ''}`;
}

/** A tarefa precisa apontar esta atividade? Sim enquanto ela não estiver realizada, ou se a marca que a realizou é desta tarefa (dá para corrigir). */
export const apontavel = (a: AtividadeTarefa) => a.situacao !== 'realizada' || a.minha != null;
/** Escolha inicial do apontamento: a marca que a tarefa já deu; o resto começa em branco (o consultor precisa dizer). */
export function escolhasIniciais(itens: AtividadeTarefa[]): Record<string, MarcaAtividade | ''> {
  return Object.fromEntries(itens.filter(apontavel).map(a => [a.id, a.minha ?? '']));
}
/** Atividades que ainda estão sem resposta no apontamento. */
export const semResposta = (itens: AtividadeTarefa[], escolhas: Record<string, MarcaAtividade | ''>) =>
  itens.filter(a => apontavel(a) && !escolhas[a.id]);
/** O que vai ao banco: só o que tem resposta e mudou em relação à marca já dada por esta tarefa. */
export function marcasParaGravar(itens: AtividadeTarefa[], escolhas: Record<string, MarcaAtividade | ''>): { id: string; situacao: MarcaAtividade }[] {
  return itens.flatMap(a => { const e = escolhas[a.id]; return apontavel(a) && e && e !== a.minha ? [{ id: a.id, situacao: e }] : []; });
}
