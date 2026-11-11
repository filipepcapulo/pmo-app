// Verificação de Pedidos (V13c-1, módulo 11 da Central BP-MS; 0061 + Edge Function `pedidos`): saldo dos pedidos de horas
// do Experience (naturezas 110401/110501, liberados) × horas das tarefas do período no app. Só leitura no Experience.
// O resultado fica no banco: Projeto › Horas mostra a linha da FAP do projeto; o Portfólio mostra todas.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type Situacao = 'FALTAM HORAS' | 'SEM PEDIDO' | 'SALDO BAIXO' | 'CONFERIR' | 'OK';
export const ALERTAS: Situacao[] = ['FALTAM HORAS', 'SEM PEDIDO', 'SALDO BAIXO'];
export const ORDEM: Record<Situacao, number> = { 'FALTAM HORAS': 0, 'SEM PEDIDO': 1, 'SALDO BAIXO': 2, CONFERIR: 3, OK: 4 };

export interface TarefaPedido { id: string; nome: string; data: string; periodo: string; horas: number | null; minutos: number | null; status: string; responsavel: string }
export interface LinhaPedido extends Record<string, unknown> {
  fap: string; parceiro: string; projetos: { id: string; nome: string; gp_id: string | null }[];
  pedidos: { rotulo: string; natureza: string; tipo: string; medicao: boolean }[]; medicao: boolean | null;
  /** minutos */
  negociado: number | null; consumido: number | null; saldo: number | null; horas: number; sobra: number | null;
  qtd_tarefas: number; sem_periodo: number; situacao: Situacao; observacao: string; tarefas: TarefaPedido[];
}
export interface Verificacao {
  id: string; de: string; ate: string; origem: 'manual' | 'agenda'; criado_em: string; alertas: number; aviso: string | null;
  executado_por: string | null; conta_de: string | null; avisos: string[]; ignoradas: Record<string, number>;
}
export interface PedidosUltima {
  pode_verificar: boolean; checagem: { ultima_ok: string | null; ultimo_erro: string | null };
  verificacao: Verificacao | null; linhas: LinhaPedido[];
}
export type ResultadoVerificar = { ok: true; id: string; alertas: number; aviso: string; fap: number } | { ok: false; codigo: string; erro: string };

export const pedidos = {
  ultima: (esc: string, projeto?: string) => rpc<PedidosUltima>('v1_pedidos_ultima', { p_escritorio: esc, ...(projeto ? { p_projeto: projeto } : {}) }),
  /** Verifica agora (sem datas: a semana atual). Pode levar até 1 minuto (uma consulta ao Experience por FAP). */
  async verificar(esc: string, de?: string, ate?: string): Promise<ResultadoVerificar> {
    const { data, error } = await sb.functions.invoke('pedidos', { body: { acao: 'verificar', escritorio: esc, ...(de ? { de, ate } : {}) } });
    if (error) {
      const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: c?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoVerificar;
  },
};

/** minutos → "12:30 h" / "-5:00 h" / "—". */
export function fmtMin(min: number | null | undefined, sufixo = ' h'): string {
  if (min === null || min === undefined) return '—';
  const a = Math.abs(Math.round(min));
  return `${min < 0 ? '-' : ''}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}${sufixo}`;
}

export const emAlerta = (l: Pick<LinhaPedido, 'situacao'>) => ALERTAS.includes(l.situacao);

/** RN-09: filtros da tela. */
export const FILTROS = [
  { id: 'alerta', rotulo: 'Em alerta' }, { id: 'medicao', rotulo: 'Medição' }, { id: 'empreito', rotulo: 'Empreito' },
  { id: 'banco', rotulo: 'Banco de Horas' }, { id: 'todos', rotulo: 'Todos' },
] as const;
export type Filtro = typeof FILTROS[number]['id'];
const temTipo = (l: LinhaPedido, re: RegExp) => l.pedidos.some(p => re.test(p.tipo));
export function filtrarPedidos(linhas: LinhaPedido[], f: Filtro): LinhaPedido[] {
  switch (f) {
    case 'alerta': return linhas.filter(emAlerta);
    case 'medicao': return linhas.filter(l => l.medicao === true);
    case 'empreito': return linhas.filter(l => temTipo(l, /empreit/i));
    case 'banco': return linhas.filter(l => temTipo(l, /banco/i));
    default: return linhas;
  }
}

/** Situação de cada projeto (pela FAP) na última verificação; a pior se o projeto aparecer em mais de uma linha. */
export function porProjeto(linhas: LinhaPedido[]): Map<string, LinhaPedido> {
  const m = new Map<string, LinhaPedido>();
  for (const l of linhas) for (const p of l.projetos ?? []) {
    const ant = m.get(p.id);
    if (!ant || ORDEM[l.situacao] < ORDEM[ant.situacao]) m.set(p.id, l);
  }
  return m;
}

/** Cor do selo (mesmos tons dos selos do 2.x). */
export function corSituacao(s: Situacao): string {
  return s === 'FALTAM HORAS' ? 'var(--vermelho)' : s === 'SEM PEDIDO' ? 'var(--vermelho)' : s === 'SALDO BAIXO' ? 'var(--laranja)'
    : s === 'CONFERIR' ? 'var(--texto-2)' : 'var(--verde)';
}

const dt = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
/** "Verificado em 10/11/2026 08:05 (09/11/2026 a 15/11/2026) por Ana · conta de Ana" / "pela checagem das 08h". */
export function textoVerificacao(v: Verificacao | null): string {
  if (!v) return 'Ainda não verificado.';
  const quando = new Date(v.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  const quem = v.origem === 'agenda' ? 'pela checagem das 08h' : `por ${v.executado_por ?? '—'}`;
  return `Verificado em ${quando} (${dt(v.de)} a ${dt(v.ate)}) ${quem}${v.conta_de ? ` · conta Sankhya de ${v.conta_de}` : ' · conta padrão'}`;
}

/** Mensagem do botão Verificar. */
export function textoResultado(r: ResultadoVerificar): string {
  if (r.ok) return `Verificação concluída: ${r.alertas ? `${r.alertas} pedido(s) em alerta` : 'nenhum alerta'}. ${r.aviso}`;
  switch (r.codigo) {
    case 'SENHA_RECUSADA': return `A Sankhya recusou o login, por isso a verificação parou e nada foi avisado. Atualize a senha em Equipe › ficha › Conta Sankhya. (${r.erro})`;
    case 'NAO_CONFIGURADO': case 'SEM_CADASTRO': return 'Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para verificar os pedidos.';
    case 'ESPERA': return 'A Sankhya recusou o último login: aguarde 60 segundos.';
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}
