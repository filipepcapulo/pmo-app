// Conferência de OS no Experience (4.29.0, 0117 — api.v4_experience_conferencia): todas as agendas do período com Apontamento
// "OS Experience" ou "Hora Dobrada" e a situação do campo Experience do ClickUp, para o assistente de projetos conferir o que
// já foi lançado e o que falta. Mesmas exclusões do Sync com o Experience. Só leitura.
import { rpc } from './cliente';
import { passa } from '../util/selecao';

export interface LinhaConferencia extends Record<string, unknown> {
  id: string; tarefa: string; consultor_id: string; consultor: string; data: string; periodo: string; ini: string | null; fim: string | null;
  apontamento: string; experience: string; status: string; cliente_id: string; cliente: string; projeto_id: string; projeto: string; fap: string | null;
  demanda_id: string; demanda: string; subdemanda_id: string | null; subdemanda: string | null;
  lancamento_id: string | null; ultimo_resultado: string | null; sync_em: string | null; tem_os: boolean;
}
export interface PainelConferencia { de: string; ate: string; linhas: LinhaConferencia[] }

export const experienceConferencia = {
  painel: (esc: string, de: string, ate: string) => rpc<PainelConferencia>('v4_experience_conferencia', { p_escritorio: esc, p_de: de, p_ate: ate }),
};

/** Ordem dos cartões: o que falta lançar primeiro; valores que o ClickUp ganhar depois entram no fim, em ordem alfabética. */
export const ORDEM_EXPERIENCE = ['Não lançado', 'Alterar', 'Lixeira', 'Lançado'];
export const COR_EXPERIENCE: Record<string, string> = { 'Não lançado': 'var(--vermelho)', Alterar: 'var(--laranja)', Lixeira: 'var(--texto-2)', 'Lançado': 'var(--verde)' };
export const corExperience = (s: string) => COR_EXPERIENCE[s] ?? 'var(--azul)';

export interface FiltroConferencia { experience: readonly string[]; consultor: readonly string[]; cliente: readonly string[]; apontamento: readonly string[]; status: readonly string[] }
export const FILTRO_CONFERENCIA_VAZIO: FiltroConferencia = { experience: [], consultor: [], cliente: [], apontamento: [], status: [] };
export function filtrarConferencia(ls: LinhaConferencia[], f: FiltroConferencia): LinhaConferencia[] {
  return ls.filter(l => passa(f.experience, l.experience) && passa(f.consultor, l.consultor_id) && passa(f.cliente, l.cliente_id)
    && passa(f.apontamento, l.apontamento) && passa(f.status, l.status));
}
/** Contagem por situação do Experience, na ordem dos cartões (as quatro conhecidas sempre aparecem, mesmo zeradas). */
export function totaisConferencia(ls: Pick<LinhaConferencia, 'experience'>[]): { situacao: string; n: number }[] {
  const m = new Map<string, number>(ORDEM_EXPERIENCE.map(s => [s, 0]));
  for (const l of ls) m.set(l.experience, (m.get(l.experience) ?? 0) + 1);
  const extras = [...m.keys()].filter(s => !ORDEM_EXPERIENCE.includes(s)).sort((a, b) => a.localeCompare(b));
  return [...ORDEM_EXPERIENCE, ...extras].map(s => ({ situacao: s, n: m.get(s) ?? 0 }));
}
/** Opções dos filtros a partir das próprias linhas. */
export function opcoesConferencia(ls: LinhaConferencia[]) {
  const par = (id: (l: LinhaConferencia) => string, nome: (l: LinhaConferencia) => string) =>
    [...new Map(ls.map(l => [id(l), nome(l)])).entries()].map(([valor, rotulo]) => ({ valor, rotulo })).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  return {
    consultores: par(l => l.consultor_id, l => l.consultor),
    clientes: par(l => l.cliente_id, l => l.cliente),
    apontamentos: [...new Set(ls.map(l => l.apontamento))].sort(),
    situacoes: totaisConferencia(ls).map(t => t.situacao),
    status: [...new Set(ls.map(l => l.status))].sort(),
  };
}
