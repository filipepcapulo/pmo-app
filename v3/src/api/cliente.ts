// Conexão com o Supabase (D1): login pelo Auth e tudo o mais pelas funções `api.v1_*` (a tela nunca grava em tabela).
import { createClient } from '@supabase/supabase-js';
import { traduzirErro } from './mensagens';

const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const configurado = Boolean(URL_SB && CHAVE);

export const sb = createClient(URL_SB || 'http://sem-configuracao.invalid', CHAVE || 'sem-chave', {
  db: { schema: 'api' },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pmo3.sessao' },
});

export class FalhaApi extends Error {
  constructor(public codigo: string, mensagem: string) { super(mensagem); }
}

/** Chama `api.<funcao>`; erro do banco vira FalhaApi com a mensagem pronta para a tela. */
export async function rpc<T = unknown>(funcao: string, args: Record<string, unknown> = {}): Promise<T> {
  let r;
  try { r = await sb.rpc(funcao, args); } catch (e) { const t = traduzirErro(e); throw new FalhaApi(t.codigo, t.mensagem); }
  if (r.error) { const t = traduzirErro(r.error); throw new FalhaApi(t.codigo, t.mensagem); }
  return r.data as T;
}

/** id_operacao das gravações (idempotência no banco: repetir devolve a mesma resposta). */
export const novaOperacao = () => crypto.randomUUID();

// ---------------------------------------------------------------- tipos das respostas usadas pela casca
export interface Escritorio { id: string; nome: string; sigla: string; perfil: string }
export interface Eu {
  versao_api: number;
  usuario: { id: string; nome: string; email: string; iniciais: string | null; cor: string | null; papeis: string[] };
  escritorio_id: string | null;
  escritorios: Escritorio[];
  perfil: string | null;
  permissoes: string[];
}
export interface Favorito { entidade: 'cliente' | 'projeto' | 'demanda' | 'tarefa' | 'chamado'; entidade_id: string; nome: string }
export interface FiltroSalvo { id: string; tela: string; nome: string; filtros: Record<string, unknown>; padrao: boolean }
export interface ResultadoBusca {
  clientes: { id: string; nome: string; ativo: boolean }[];
  projetos: { id: string; nome: string; fase: string; cliente: string }[];
  demandas: { id: string; nome: string; status: string; projeto: string }[];
  tarefas: { id: string; nome: string; data: string; status: string }[];
  chamados: { id: string; numero: number; cliente: string; demanda: string | null; status_triagem: string }[];
}
