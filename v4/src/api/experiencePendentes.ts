// Tarefas Pendentes no Experience (4.14.0, 0105 — api.v4_experience_pendentes): as agendas com Apontamento "OS Experience" ou
// "Hora Dobrada" cujo campo Experience ainda pede uma ação no Experience. Abertura = criar o lançamento (vazio/"Não lançado"),
// Ajuste = alterar ("Alterar"), Exclusão = excluir ("Lixeira"). São as mesmas tarefas que o Sync com o Experience trata.
import { rpc } from './cliente';
import type { AcaoSync, Modo, ResultadoSync } from './syncExperience';
import { passaEm } from '../util/selecao';

export interface LinhaPendente extends Record<string, unknown> {
  id: string; tarefa: string; consultor_id: string; consultor: string; data: string; periodo: string; ini: string | null; fim: string | null;
  apontamento: string; experience: string | null; acao: AcaoSync; status: string; cliente: string; projeto_id: string; projeto: string;
  fap: string | null; projeto_inativo: boolean; demanda_id: string; demanda: string; subdemanda_id: string | null; subdemanda: string | null;
  lancamento_id: string | null; ultimo_resultado: Exclude<ResultadoSync, 'simulado'> | null; observacao: string | null; sync_em: string | null; tem_os: boolean;
}
export interface PainelPendentes { de: string; ate: string; modo: Modo; linhas: LinhaPendente[] }

export const experiencePendentes = {
  painel: (esc: string, de: string, ate: string) => rpc<PainelPendentes>('v4_experience_pendentes', { p_escritorio: esc, p_de: de, p_ate: ate }),
};

export const ROTULO_PENDENCIA: Record<AcaoSync, string> = { criar: 'Abertura', alterar: 'Ajuste', excluir: 'Exclusão' };
export const COR_PENDENCIA: Record<AcaoSync, string> = { criar: 'var(--azul)', alterar: 'var(--laranja)', excluir: 'var(--vermelho)' };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const soma = (dia: string, n: number) => iso(new Date(Date.parse(dia) + n * 864e5));
/** Período padrão: 31 dias para trás (o que ficou sem lançar) e 31 para a frente (as próximas agendas). */
export const periodoPendentes = (hoje: string) => ({ de: soma(hoje, -31), ate: soma(hoje, 31) });
/** Mesma regra do banco: de ≤ até e no máximo 125 dias. */
export function erroPeriodoPendentes(de: string, ate: string): string | null {
  if (!de || !ate) return 'Informe o período.';
  if (ate < de) return 'A data final é antes da inicial.';
  if ((Date.parse(ate) - Date.parse(de)) / 864e5 > 124) return 'Período de no máximo 125 dias.';
  return null;
}

/** "Manhã · 08:00–12:00" (o horário é o que vai para o lançamento do Experience). */
export function janelaPendente(l: Pick<LinhaPendente, 'periodo' | 'ini' | 'fim'>): string {
  const nome = ({ manha: 'Manhã', tarde: 'Tarde', dia: 'Dia', noite: 'Noite', livre: 'Livre' } as Record<string, string>)[l.periodo] ?? l.periodo;
  return l.ini && l.fim ? `${nome} · ${l.ini}–${l.fim}` : nome;
}

/** O que impede ou merece atenção antes de sincronizar (vazio = nada). */
export function avisosPendente(l: Pick<LinhaPendente, 'fap' | 'projeto_inativo' | 'data' | 'acao' | 'ultimo_resultado' | 'tem_os'>, hoje: string): string[] {
  const a: string[] = [];
  if (!l.fap) a.push('Projeto sem FAP no nome: o sync não trata');
  if (l.projeto_inativo) a.push('Projeto inativo');
  if (l.tem_os && l.acao !== 'criar') a.push('Já tem OS no Sankhya');
  if (l.ultimo_resultado === 'erro') a.push('Último sync com erro');
  if (l.ultimo_resultado === 'bloqueado') a.push('Último sync bloqueado');
  if (l.acao === 'criar' && l.data < hoje) a.push('Agenda já passou sem lançamento');
  return a;
}

/** consultor e apontamento: lista (seleção múltipla com Exibir/Ocultar) ou o valor único antigo ('' = todos). */
export interface FiltroPendentes { acao: AcaoSync | ''; consultor: string | readonly string[]; apontamento: string | readonly string[] }
export function filtrarPendentes(ls: LinhaPendente[], f: FiltroPendentes): LinhaPendente[] {
  return ls.filter(l => (!f.acao || l.acao === f.acao) && passaEm(f.consultor, l.consultor_id) && passaEm(f.apontamento, l.apontamento));
}
export function totaisPendentes(ls: Pick<LinhaPendente, 'acao'>[]): Record<AcaoSync, number> {
  const t: Record<AcaoSync, number> = { criar: 0, alterar: 0, excluir: 0 };
  for (const l of ls) t[l.acao]++;
  return t;
}
/** Opções dos filtros a partir das próprias linhas (só quem tem pendência aparece). */
export function opcoesPendentes(ls: LinhaPendente[]): { consultores: { id: string; nome: string }[]; apontamentos: string[] } {
  const c = new Map<string, string>();
  for (const l of ls) c.set(l.consultor_id, l.consultor);
  return {
    consultores: [...c.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
    apontamentos: [...new Set(ls.map(l => l.apontamento))].sort(),
  };
}
