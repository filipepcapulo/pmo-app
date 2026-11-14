// IA (MCP) — F6, 0081. A pessoa gera um token pessoal e liga uma IA (Claude etc.) ao PMO pelo servidor MCP
// (Edge Function `mcp`). O MCP só tem dados OPERACIONAIS: nada do Financeiro (valores, salários, produtividade paga).
// O token aparece só na geração; o banco guarda o hash.
import { rpc } from './cliente';

export type SituacaoToken = 'ativo' | 'vencido' | 'revogado';
export interface TokenMcp extends Record<string, unknown> {
  id: string; nome: string; prefixo: string; usuario_id: string; usuario: string; meu: boolean;
  criado_em: string; expira_em: string; ultimo_uso: string | null; revogado_em: string | null;
  situacao: SituacaoToken; chamadas_30d: number; gravacoes_30d: number;
}
export interface PainelMcp { ver_todos: boolean; limite_minuto: number; consultas: string[]; gravacoes: string[]; tokens: TokenMcp[] }
export interface TokenGerado { ok: boolean; id: string; nome: string; expira_em: string; token: string; aviso: string }

export const mcp = {
  painel: (esc: string) => rpc<PainelMcp>('v1_mcp_tokens', { p_escritorio: esc }),
  gerar: (esc: string, nome: string, dias: number) => rpc<TokenGerado>('v1_mcp_token_gerar', { p_escritorio: esc, p_nome: nome, p_dias: dias }),
  revogar: (esc: string, id: string) => rpc<{ ok: boolean }>('v1_mcp_token_revogar', { p_escritorio: esc, p_id: id }),
};

export const VALIDADES = [
  { valor: '30', rotulo: '30 dias' }, { valor: '90', rotulo: '90 dias' }, { valor: '180', rotulo: '180 dias' }, { valor: '365', rotulo: '1 ano' },
];
export const ROTULO_SITUACAO: Record<SituacaoToken, string> = { ativo: 'Ativo', vencido: 'Vencido', revogado: 'Revogado' };

/** Nome que a pessoa lê para cada ferramenta (o nome técnico fica no title). */
export const ROTULO_FERRAMENTA: Record<string, string> = {
  quem_sou_eu: 'Quem sou eu', buscar: 'Busca global', listar_clientes: 'Clientes', listar_projetos: 'Projetos', ver_projeto: 'Projeto',
  listar_demandas: 'Demandas', minhas_demandas: 'Minhas demandas', ver_demanda: 'Demanda', ver_tarefa: 'Tarefa',
  consultar_agenda: 'Agenda', consultar_backlog: 'Backlog', consultar_ociosidade: 'Ociosidade', listar_apontamentos: 'Apontamentos (horas)',
  buscar_chamados: 'Chamados', ver_chamado: 'Chamado', listar_equipe: 'Equipe', ver_comentarios: 'Comentários',
  salvar_demanda: 'Criar ou alterar demanda', salvar_tarefas: 'Criar ou alterar tarefa (agenda)', mover_tarefas: 'Mover tarefas',
  salvar_apontamento: 'Apontar horas na própria tarefa', comentar: 'Comentar',
};
export const rotuloFerramenta = (nome: string) => ROTULO_FERRAMENTA[nome] ?? nome;

/** Endereço do servidor MCP (Edge Function `mcp` do mesmo projeto Supabase do app). */
export function urlMcp(base = import.meta.env.VITE_SUPABASE_URL as string | undefined): string {
  return `${(base ?? '').replace(/\/+$/, '')}/functions/v1/mcp`;
}

/** Comando do Claude Code e configuração JSON (Claude Desktop e outros clientes) já com o token. */
export function comoConectar(url: string, token: string) {
  return {
    claudeCode: `claude mcp add --transport http pmo-bpms ${url} --header "Authorization: Bearer ${token}"`,
    json: JSON.stringify({ mcpServers: { 'pmo-bpms': { type: 'http', url, headers: { Authorization: `Bearer ${token}` } } } }, null, 2),
  };
}

/** Dias até vencer (negativo = vencido). */
export function diasParaVencer(expiraEm: string, agora = new Date()): number {
  return Math.ceil((new Date(expiraEm).getTime() - agora.getTime()) / 86_400_000);
}
export function textoValidade(t: Pick<TokenMcp, 'situacao' | 'expira_em'>, agora = new Date()): string {
  if (t.situacao === 'revogado') return 'revogado';
  const d = diasParaVencer(t.expira_em, agora);
  if (t.situacao === 'vencido' || d <= 0) return 'vencido';
  return d === 1 ? 'vence amanhã' : `vence em ${d} dias`;
}
export const quando = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—');
