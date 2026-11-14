// Etapas do app (V4, 0083): cadastro próprio com de/para das opções do campo "Etapa" do ClickUp.
// A demanda/tarefa guarda o texto do ClickUp (`etapa`) e, quando escolhida no app, a etapa (`etapa_id`); a etapa mostrada
// é a escolhida ou a que o de/para aponta para o texto.
import { novaOperacao, rpc } from './cliente';
import type { Gravado } from './cadastros';

export interface Etapa {
  id: string; versao: number; codigo: string; nome: string; cor: string; ordem: number; ativo: boolean; sistema: boolean;
  cu_principal: string | null; vinculos: string[];
}
export interface EtapasResposta { pode_editar: boolean; etapas: Etapa[]; opcoes_cu: string[]; sem_vinculo: string[] }

export const BACKLOG_CONSULTORES = 'backlog_consultores';
export const BACKLOG_PERSONALIZACAO = 'backlog_personalizacao';
export const SEM_ETAPA = '(vazio)';

/** Mesma normalização do banco (app.chave): sem acento, minúsculas, só letras e números. */
export const chaveEtapa = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Mapa texto do ClickUp (chave) → id da etapa do app. */
export function mapaDePara(etapas: Etapa[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of etapas) for (const v of e.vinculos) { const k = chaveEtapa(v); if (k && !m.has(k)) m.set(k, e.id); }
  return m;
}
/** Etapa do app de um registro: a escolhida (etapa_app_id / etapa_id) ou a do de/para do texto. */
export function etapaDoRegistro(d: { etapa_app_id?: string | null; etapa_id?: string | null; etapa?: string | null } | null | undefined, depara: Map<string, string>): string | null {
  if (!d) return null;
  return d.etapa_app_id ?? d.etapa_id ?? depara.get(chaveEtapa(d.etapa)) ?? null;
}

/** Texto legível (preto ou branco) sobre a cor de fundo. */
export function corTexto(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1c1c1e' : '#fff';
}
/** Iniciais para a pílula do responsável: primeiro e último nome ("Filipe Capulo" → FC; um nome só → 2 letras). */
export function iniciais(nome: string | null | undefined): string {
  const p = (nome ?? '').trim().split(/\s+/).filter(x => x && !/^(da|de|do|das|dos|e)$/i.test(x));
  if (!p.length) return '?';
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
const CORES_PESSOA = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#4f46e5', '#b45309', '#0891b2', '#be123c', '#15803d', '#6d28d9', '#475569'];
/** Cor estável por pessoa (a do cadastro, se houver; senão escolhida pelo id). */
export function corPessoa(id: string, cadastrada?: string | null): string {
  if (cadastrada && /^#[0-9a-f]{6}$/i.test(cadastrada)) return cadastrada;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CORES_PESSOA[h % CORES_PESSOA.length];
}

export const etapasApi = {
  listar: (esc: string) => rpc<EtapasResposta>('v4_etapas', { p_escritorio: esc }),
  salvar: (esc: string, dados: Record<string, unknown>) =>
    rpc<Gravado>('v4_etapa_salvar', { p_escritorio: esc, p_dados: dados, p_id_operacao: novaOperacao() }),
  definir: (esc: string, entidade: 'demanda' | 'tarefa', id: string, etapaId: string | null) =>
    rpc<Gravado>('v4_etapa_definir', { p_escritorio: esc, p_dados: { entidade, id, etapa_id: etapaId }, p_id_operacao: novaOperacao() }),
};
