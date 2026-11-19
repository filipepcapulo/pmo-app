// Edição múltipla (4.23.0): regra de quais gravações saem de uma seleção de demandas/subdemandas e tarefas quando a
// pessoa troca Status, Etapa e/ou Responsável de todas de uma vez. A tela (componentes/EdicaoMultipla.tsx) só executa.
// Cada item vira uma gravação com apenas os campos que mudam (o banco altera só o que é enviado); quem já está com o
// valor escolhido não é gravado de novo.
import { STATUS_TAREFA, STATUS_V4 } from '../api/execucao';

export interface ItemLote {
  tipo: 'demanda' | 'tarefa'; id: string; nome: string; status: string;
  etapa_id: string | null; responsavel_id: string | null;
  /** Só na tarefa: a subdemanda/demanda dela (para a pergunta do chamado ao concluir). */
  demanda_id?: string;
}
/** O que a pessoa escolheu na barra; vazio = não mexer no campo. */
export interface CamposLote { status: string; etapa: string; responsavel: string }
export const SEM_CAMPOS: CamposLote = { status: '', etapa: '', responsavel: '' };

export const chaveItem = (i: Pick<ItemLote, 'tipo' | 'id'>) => `${i.tipo}:${i.id}`;

// status que existem nos dois níveis (demanda e tarefa), pelo valor da V4
const COMUNS = ['nao_iniciado', 'em_andamento', 'concluida', 'cancelada'];
const DA_TAREFA: Record<string, string> = { nao_iniciado: 'planejada', em_andamento: 'em_andamento', concluida: 'concluida', cancelada: 'cancelada', nao_executada: 'nao_executada' };

/** Opções do campo Status conforme o que está selecionado: só demandas, só tarefas ou os dois (aí, só os status em comum). */
export function opcoesStatusLote(temDemanda: boolean, temTarefa: boolean): { valor: string; rotulo: string }[] {
  if (temTarefa && !temDemanda) return STATUS_TAREFA.map(s => ({ valor: s.valor === 'planejada' ? 'nao_iniciado' : s.valor, rotulo: s.rotulo }));
  const ops = STATUS_V4.map(s => ({ valor: s.valor, rotulo: s.rotulo }));
  return temTarefa ? ops.filter(o => COMUNS.includes(o.valor)) : ops;
}

/** Status do banco para o item, ou null quando o status escolhido não existe nesse nível. */
export function statusDoItem(item: Pick<ItemLote, 'tipo' | 'status'>, escolhido: string): string | null {
  if (item.tipo === 'tarefa') return DA_TAREFA[escolhido] ?? null;
  const v4 = STATUS_V4.find(s => s.valor === escolhido);
  if (!v4) return null;
  // "Não iniciado" vale por backlog e planejada: quem já está num dos dois fica como está
  return (v4.banco as string[]).includes(item.status) ? item.status : v4.banco[0];
}

export interface GravacaoLote {
  item: ItemLote;
  /** Campos de v4_demanda_salvar / v1_tarefas_salvar (sem id); null = nada a gravar por ali. */
  dados: Record<string, unknown> | null;
  /** Tarefa: a etapa do app vai pela v4_etapa_definir. */
  etapaTarefa: string | null;
  concluiu: boolean;
}

/** Uma gravação por item que realmente muda; `iguais` conta quem já estava com os valores escolhidos. */
export function planoLote(itens: ItemLote[], c: CamposLote): { gravar: GravacaoLote[]; iguais: number } {
  const gravar: GravacaoLote[] = [];
  let iguais = 0;
  for (const item of itens) {
    const dados: Record<string, unknown> = {};
    let etapaTarefa: string | null = null, concluiu = false;
    if (c.status) {
      const s = statusDoItem(item, c.status);
      if (s && s !== item.status) { dados.status = s; concluiu = s === 'concluida'; }
    }
    if (c.responsavel && c.responsavel !== item.responsavel_id) dados.responsavel_id = c.responsavel;
    if (c.etapa && c.etapa !== item.etapa_id) {
      if (item.tipo === 'demanda') dados.etapa_id = c.etapa; else etapaTarefa = c.etapa;
    }
    const tem = Object.keys(dados).length > 0;
    if (!tem && !etapaTarefa) { iguais++; continue; }
    gravar.push({ item, dados: tem ? dados : null, etapaTarefa, concluiu });
  }
  return { gravar, iguais };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
/** "3 demandas · 2 tarefas" (demanda aqui inclui subdemanda). */
export function resumoSelecao(itens: Pick<ItemLote, 'tipo'>[]): string {
  const d = itens.filter(i => i.tipo === 'demanda').length, t = itens.length - d;
  return [d ? plural(d, 'demanda', 'demandas') : '', t ? plural(t, 'tarefa', 'tarefas') : ''].filter(Boolean).join(' · ');
}
