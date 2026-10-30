// Execução (V6): demandas, subdemandas, tarefas, comentários (@menção), checklist, anexos, favoritos por cliente e
// notificações. Leitura e gravação só pelas funções `api.v1_*` (0024/0029); gravação sempre com id_operacao novo.
import { novaOperacao, rpc, sb } from './cliente';
import type { Gravado, Pessoa } from './cadastros';

// ---------------------------------------------------------------- rótulos
type Op<T extends string = string> = { valor: T; rotulo: string };
export type StatusDemanda = 'backlog' | 'planejada' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
export const STATUS_DEMANDA: Op<StatusDemanda>[] = [
  { valor: 'backlog', rotulo: 'Backlog' }, { valor: 'planejada', rotulo: 'Planejada' }, { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'pausada', rotulo: 'Pausada' }, { valor: 'concluida', rotulo: 'Concluída' }, { valor: 'cancelada', rotulo: 'Cancelada' },
];
export type StatusTarefa = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada' | 'nao_executada';
export const STATUS_TAREFA: Op<StatusTarefa>[] = [
  { valor: 'planejada', rotulo: 'Não iniciada' }, { valor: 'em_andamento', rotulo: 'Em andamento' }, { valor: 'concluida', rotulo: 'Concluída' },
  { valor: 'cancelada', rotulo: 'Cancelada' }, { valor: 'nao_executada', rotulo: 'Não executada' },
];
export const PRIORIDADES: Op[] = [
  { valor: 'baixa', rotulo: 'Baixa' }, { valor: 'normal', rotulo: 'Normal' }, { valor: 'alta', rotulo: 'Alta' }, { valor: 'urgente', rotulo: 'Urgente' },
];
export const PERIODOS: Op[] = [
  { valor: 'manha', rotulo: 'Manhã (08h-12h)' }, { valor: 'tarde', rotulo: 'Tarde (13h-17h)' }, { valor: 'dia', rotulo: 'Dia (08h-18h)' },
  { valor: 'noite', rotulo: 'Noite (18h-22h)' }, { valor: 'livre', rotulo: 'Horário livre' },
];
export const MODALIDADES: Op[] = [
  { valor: '', rotulo: '—' }, { valor: 'remoto', rotulo: 'Remoto' }, { valor: 'interno', rotulo: 'Interno' }, { valor: 'presencial', rotulo: 'Presencial no cliente' },
];
const rotulo = (l: Op[], v: string | null | undefined) => l.find(x => x.valor === v)?.rotulo ?? v ?? '';
export const rotuloStatusDemanda = (v: string) => rotulo(STATUS_DEMANDA, v);
export const rotuloStatusTarefa = (v: string) => rotulo(STATUS_TAREFA, v);
export const rotuloPeriodo = (v: string, ini?: string | null, fim?: string | null) =>
  v === 'livre' && ini && fim ? `${ini.slice(0, 5)}–${fim.slice(0, 5)}` : rotulo(PERIODOS, v);
export const rotuloModalidade = (v: string | null) => rotulo(MODALIDADES, v ?? '');
export const rotuloPrioridade = (v: string) => rotulo(PRIORIDADES, v);

// ---------------------------------------------------------------- tipos
export interface TotaisDemanda {
  demanda_id: string; horas_previstas: number | null; horas_reais: number; horas_planejadas: number; horas_concluidas: number;
  tarefas: number; inicio: string | null; fim: string | null; perc: number | null; atrasada: boolean;
}
export interface Demanda {
  id: string; projeto_id: string; pai_id: string | null; tipo: 'entregavel' | 'plano_acao' | 'chamado'; nome: string; descricao: string | null;
  status: StatusDemanda; prioridade: string; inicio: string | null; fim: string | null; horas_previstas: number | null; perc_manual: number | null;
  responsavel_id: string | null; etapa: string | null; modulo_id: string | null; versao: number; clickup_id: string | null;
  totais?: TotaisDemanda | null;
}
export interface Tarefa {
  id: string; demanda_id: string; responsavel_id: string; nome: string; data: string; periodo: string; hora_ini: string | null; hora_fim: string | null;
  horas_previstas: number | null; modalidade: string | null; status: StatusTarefa; motivo_status: string | null; detalhamento: string | null;
  etapa: string | null; agendamento: string | null; experience: string | null; apontamento: string | null; grupo_criacao: string | null;
  versao: number; clickup_id: string | null; horas_reais: number | null; apontamentos: number;
}
export interface ItemChecklist { id: string; texto: string; feito: boolean; feito_por: string | null; feito_em: string | null; ordem: number; versao: number }
export interface Anexo { id: string; nome: string; caminho: string; tamanho: number | null; tipo: string | null; criado_em: string; criado_por: string | null }
export interface FichaDemanda {
  demanda: Demanda; totais: TotaisDemanda | null;
  projeto: { id: string; nome: string; fase: string; situacao: string; gp_id: string | null };
  cliente: { id: string; nome: string; ativo: boolean };
  pai: { id: string; nome: string } | null;
  subdemandas: Demanda[]; tarefas: Tarefa[]; checklist: ItemChecklist[]; anexos: Anexo[]; comentarios: number; favorito: boolean;
}
export interface Apontamento {
  id: string; origem: 'sankhya_om' | 'app' | 'manual'; numero_os: string | null; numero_interno: number | null; data: string;
  hora_ini: string | null; hora_fim: string | null; intervalo_min: number; horas: number; texto: string | null;
}
export interface FichaTarefa {
  tarefa: Tarefa; demanda: { id: string; nome: string; pai_id: string | null; status: string }; pai: { id: string; nome: string } | null;
  projeto: { id: string; nome: string; fase: string }; cliente: { id: string; nome: string };
  apontamentos: Apontamento[]; grupo: { id: string; responsavel_id: string; data: string; status: string }[];
  checklist: ItemChecklist[]; anexos: Anexo[]; comentarios: number; favorito: boolean;
}
export type EntidadeComentavel = 'projeto' | 'demanda' | 'tarefa' | 'chamado';
export interface Comentario { id: string; texto: string; mencoes: string[]; autor: Pessoa; criado_em: string; editado_em: string | null; versao: number; meu: boolean }
export interface OpcoesExecucao {
  periodos: Record<string, number>; etapas: string[]; agendamento: string[]; experience: string[]; apontamento: string[];
  modulos: { id: string; nome: string }[];
}
export interface ItemFavoritoHome {
  entidade: 'projeto' | 'demanda' | 'tarefa'; id: string; nome: string; projeto: string; status: string; subdemanda?: boolean;
  data?: string; responsavel_id?: string;
  totais?: { horas_previstas: number | null; horas_reais: number; horas_planejadas: number; perc: number | null; atrasada?: boolean; fim?: string | null; horas_contratadas?: number } | null;
}
export interface GrupoFavoritos { cliente: { id: string; nome: string }; itens: ItemFavoritoHome[] }
export interface Notificacao { id: string; tipo: string; titulo: string; link: string | null; criado_em: string; lida: boolean }
export interface DemandaLinha extends Demanda { projeto: string; fase: string; cliente_id: string; cliente: string }

// ---------------------------------------------------------------- chamadas
const salvar = <R = Record<string, unknown>>(funcao: string, esc: string, dados: Record<string, unknown>) =>
  rpc<Gravado<R> & Record<string, unknown>>(funcao, { p_escritorio: esc, p_dados: dados, p_id_operacao: novaOperacao() });

export const exec = {
  demandas: (esc: string, f: { projeto?: string | null; status?: string[] | null; texto?: string | null; limite?: number; pagina?: number } = {}) =>
    rpc<{ total: number; itens: DemandaLinha[] }>('v1_demandas', { p_escritorio: esc, p_projeto: f.projeto ?? null, p_status: f.status ?? null,
      p_texto: f.texto ?? null, p_limite: f.limite ?? 200, p_pagina: f.pagina ?? 0 }),
  demanda: (esc: string, id: string) => rpc<FichaDemanda>('v1_demanda', { p_escritorio: esc, p_demanda: id }),
  tarefa: (esc: string, id: string) => rpc<FichaTarefa>('v1_tarefa', { p_escritorio: esc, p_tarefa: id }),
  opcoes: (esc: string) => rpc<OpcoesExecucao>('v1_opcoes_execucao', { p_escritorio: esc }),
  demandaSalvar: (esc: string, d: Record<string, unknown>) => salvar<Demanda>('v1_demanda_salvar', esc, d),
  tarefasSalvar: (esc: string, d: Record<string, unknown>) => salvar<Tarefa>('v1_tarefas_salvar', esc, d),
  liberarHoras: (esc: string, d: { projeto_id: string; horas: number; justificativa: string }) => salvar('v1_liberacao_horas_salvar', esc, d),
  comentarios: (esc: string, entidade: EntidadeComentavel, id: string) =>
    rpc<Comentario[]>('v1_comentarios', { p_escritorio: esc, p_entidade: entidade, p_entidade_id: id }),
  comentarioSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_comentario_salvar', esc, d),
  checklistSalvar: (esc: string, d: Record<string, unknown>) => salvar<ItemChecklist>('v1_checklist_salvar', esc, d),
  anexoSalvar: (esc: string, d: Record<string, unknown>) => salvar<Anexo>('v1_anexo_salvar', esc, d),
  favoritosHome: (esc: string) => rpc<GrupoFavoritos[]>('v1_favoritos_home', { p_escritorio: esc }),
  notificacoes: (esc: string) => rpc<{ nao_lidas: number; itens: Notificacao[] }>('v1_notificacoes', { p_escritorio: esc, p_limite: 30 }),
  notificacoesLidas: (esc: string, ids: string[] | null) => rpc<{ marcadas: number }>('v1_notificacoes_lidas', { p_escritorio: esc, p_ids: ids }),
};

// ---------------------------------------------------------------- anexos no Storage (bucket `anexos`, pasta do escritório)
const BUCKET = 'anexos';
/** Caminho do arquivo: `<escritorio>/<entidade>/<uuid>-<nome sem acento>` (a política do Storage confere o 1º nível). */
export function caminhoAnexo(esc: string, entidade: string, nome: string, id: string = crypto.randomUUID()) {
  const limpo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-120) || 'arquivo';
  return `${esc}/${entidade}/${id}-${limpo}`;
}
export async function enviarAnexo(esc: string, entidade: EntidadeComentavel, entidadeId: string, arquivo: File) {
  if (arquivo.size > 20 * 1024 * 1024) throw new Error('Arquivo acima de 20 MB.');
  const caminho = caminhoAnexo(esc, entidade, arquivo.name);
  const up = await sb.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false });
  if (up.error) throw new Error('Falha ao enviar o arquivo: ' + up.error.message);
  return exec.anexoSalvar(esc, { entidade, entidade_id: entidadeId, caminho, nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type || null });
}
export async function abrirAnexo(caminho: string) {
  const r = await sb.storage.from(BUCKET).createSignedUrl(caminho, 120);
  if (r.error || !r.data) throw new Error('Não foi possível abrir o anexo.');
  window.open(r.data.signedUrl, '_blank', 'noopener');
}

// ---------------------------------------------------------------- regras puras (testadas no Vitest)
/** Fatias da barra de pílula (escopo §2.3): real (OS/app) e planejado (sem apontamento, outra cor) sobre o previsto. */
export function fatiasBarra(previsto: number | null | undefined, real: number, planejado: number) {
  const p = Math.max(0, Number(previsto ?? 0)), r = Math.max(0, Number(real || 0)), pl = Math.max(0, Number(planejado || 0));
  const total = Math.max(p, r + pl);
  if (total <= 0) return { real: 0, planejado: 0, estouro: false, saldo: 0 };
  return { real: (r / total) * 100, planejado: (pl / total) * 100, estouro: p > 0 && r + pl > p, saldo: p - r - pl };
}

/** Ids mencionados que ainda aparecem no texto como `@Nome` (quem foi apagado do texto não é notificado). */
export function mencoesNoTexto(texto: string, escolhidos: { id: string; nome: string }[]) {
  return [...new Set(escolhidos.filter(p => texto.includes('@' + p.nome)).map(p => p.id))];
}

/** Agrupa demandas (com subdemandas logo abaixo da mãe), na ordem recebida. */
export function arvoreDemandas<T extends { id: string; pai_id: string | null }>(lista: T[]): { item: T; filhas: T[] }[] {
  const ids = new Set(lista.map(d => d.id));
  const filhas = new Map<string, T[]>();
  for (const d of lista) if (d.pai_id && ids.has(d.pai_id)) filhas.set(d.pai_id, [...(filhas.get(d.pai_id) ?? []), d]);
  return lista.filter(d => !d.pai_id || !ids.has(d.pai_id)).map(d => ({ item: d, filhas: filhas.get(d.id) ?? [] }));
}
