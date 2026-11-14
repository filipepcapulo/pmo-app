// Chamados do portal Sankhya (V13e-2, módulo 15 da Central BP-MS; 0068 + Edge Function `chamados-portal`): cada chamado
// aberto no portal de suporte (ajuda.sankhya.com.br) vira um chamado no app, com status, última resposta, próximo
// acompanhamento e sinais. A leitura pela API do portal é só leitura e só funciona se o portal aceitar o login da Conta
// Sankhya; se não aceitar, a atualização é manual pela própria tela. Nada é respondido no portal.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type StatusPortal = 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
export interface SinaisPortal {
  rotulo: string | null; nova: boolean; aguardando: boolean; vencido: boolean; parado: boolean; resolvido: boolean;
  andamento: boolean; fechado: boolean; nao_lido: boolean; dias_parado: number | null;
}
export interface ComentarioPortal { autor: string; em: string | null; texto: string }
export interface ChamadoPortal {
  id: string; numero: number; parceiro: string | null; titulo: string | null; status: StatusPortal | null; status_rotulo: string | null;
  ultima_mov_em: string | null; resposta_autor: string | null; resposta_em: string | null; resposta_texto: string | null;
  comentarios: ComentarioPortal[]; proximo_acomp: string | null; nota: string | null; lido_em: string | null;
  lido_origem: 'api' | 'manual' | null; lido_por: string | null; erro: string | null; erro_codigo: string | null;
  visto_em: string | null; visto_por: string | null; criado_em: string; criado_por: string | null; chamado_id: string | null;
  chamado_numero: number | null; cliente: string | null; link: string; sinais: SinaisPortal;
}
export interface ListaPortal {
  eu: string;
  leitura: { ultima_auto_em: string | null; api_aceita: boolean | null; mensagem: string | null };
  linhas: ChamadoPortal[];
}
export interface CamposPortal {
  parceiro?: string | null; titulo?: string | null; nota?: string | null; proximo?: string | null; chamado?: string | null;
  status?: StatusPortal; rotulo?: string | null; resposta?: { autor?: string; em?: string; texto?: string };
}
export type ResultadoLeitura =
  | { ok: true; lidos: number; falhas: number; login_recusado: boolean; sem_conta: number; avisos: number; total: number }
  | { ok: false; codigo: string; erro: string };

export const portal = {
  listar: (esc: string, chamado?: string) =>
    rpc<ListaPortal>('v1_chamados_portal_listar', { p_escritorio: esc, ...(chamado ? { p_chamado: chamado } : {}) }),
  adicionar: (esc: string, texto: string, parceiro?: string | null, proximo?: string | null) =>
    rpc<{ novos: number[]; repetidos: number[] }>('v1_chamados_portal_adicionar',
      { p_escritorio: esc, p_texto: texto, p_parceiro: parceiro || null, p_proximo: proximo || null }),
  editar: (esc: string, id: string, campos: CamposPortal) =>
    rpc<ChamadoPortal>('v1_chamados_portal_editar', { p_escritorio: esc, p_id: id, p_campos: campos }),
  visto: (esc: string, id?: string) => rpc<{ vistos: number }>('v1_chamados_portal_visto', { p_escritorio: esc, ...(id ? { p_id: id } : {}) }),
  excluir: (esc: string, id: string) => rpc('v1_chamados_portal_excluir', { p_escritorio: esc, p_id: id, p_confirmar: true }),
  /** Lê o andamento no portal (SÓ LEITURA). Sem ids: todos menos os "Fechado". */
  atualizar: async (esc: string, ids?: string[]): Promise<ResultadoLeitura> => {
    const { data, error } = await sb.functions.invoke('chamados-portal', { body: { acao: 'atualizar', escritorio: esc, ...(ids?.length ? { ids } : {}) } });
    if (error) {
      const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: c?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoLeitura;
  },
};

/** Números de chamado (5 a 8 dígitos) num texto colado — a mesma regra do banco, para mostrar antes de gravar. */
export function numerosDoTexto(texto: string): number[] {
  const m = texto.match(/(?<!\d)\d{5,8}(?!\d)/g) ?? [];
  return [...new Set(m.map(Number))];
}

export type FiltroPortal = 'atencao' | 'nova' | 'aguardando' | 'vencido' | 'parado' | 'andamento' | 'resolvido' | 'todos';
export const FILTROS_PORTAL: { id: FiltroPortal; rotulo: string }[] = [
  { id: 'atencao', rotulo: 'Pedem atenção' }, { id: 'nova', rotulo: 'Resposta nova' }, { id: 'aguardando', rotulo: 'Aguardando você' },
  { id: 'vencido', rotulo: 'Vencidos' }, { id: 'parado', rotulo: 'Parados' }, { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'resolvido', rotulo: 'Resolvidos' }, { id: 'todos', rotulo: 'Todos' },
];
export function passa(c: ChamadoPortal, f: FiltroPortal): boolean {
  const s = c.sinais;
  switch (f) {
    case 'atencao': return s.nova || s.aguardando || s.vencido || s.parado;
    case 'nova': return s.nova;
    case 'aguardando': return s.aguardando;
    case 'vencido': return s.vencido;
    case 'parado': return s.parado;
    case 'andamento': return s.andamento;
    case 'resolvido': return s.resolvido;
    default: return true;
  }
}
export const contagens = (ls: ChamadoPortal[]) =>
  Object.fromEntries(FILTROS_PORTAL.map(f => [f.id, ls.filter(c => passa(c, f.id)).length])) as Record<FiltroPortal, number>;

/** Cor do status pelo significado (RF-04b). */
export function corStatus(c: ChamadoPortal): 'vermelho' | 'verde' | 'roxo' | 'laranja' | 'azul' | 'cinza' {
  const r = (c.sinais.rotulo ?? '').toLowerCase();
  if (c.sinais.nao_lido && !c.status) return 'cinza';
  if (c.sinais.aguardando) return 'vermelho';
  if (c.sinais.resolvido) return 'verde';
  if (/escalon|investiga|p&d|desenvolv/.test(r)) return 'roxo';
  if (c.status === 'hold' || /espera/.test(r)) return 'laranja';
  return 'azul';
}

export const STATUS_MANUAL: { id: StatusPortal; rotulo: string }[] = [
  { id: 'new', rotulo: 'Novo' }, { id: 'open', rotulo: 'Aberto' }, { id: 'pending', rotulo: 'Aguardando você' },
  { id: 'hold', rotulo: 'Em espera' }, { id: 'solved', rotulo: 'Resolvido' }, { id: 'closed', rotulo: 'Fechado' },
];

/** "há N dias" a partir de uma data/hora. */
export function haDias(iso: string | null, hoje = new Date()): string {
  if (!iso) return '';
  const d = Math.floor((hoje.getTime() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

/** Data + n dias (AAAA-MM-DD), a partir de hoje (RF-07). */
export function adiar(n: number, hoje = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mensagemLeitura(r: ResultadoLeitura): { texto: string; tipo: 'ok' | 'erro' | 'info' } {
  if (!r.ok) return { texto: r.erro, tipo: 'erro' };
  if (r.total === 0) return { texto: 'Nada a ler (os "Fechado" não são mais lidos).', tipo: 'info' };
  if (r.login_recusado) return { texto: 'O portal recusou o login pela API: atualize os chamados à mão (botão "Atualizar à mão").', tipo: 'erro' };
  if (r.sem_conta) return { texto: `${r.sem_conta} sem Conta Sankhya cadastrada (Equipe › Conta Sankhya): atualize à mão.`, tipo: 'erro' };
  return { texto: `${r.lidos} de ${r.total} lido(s) no portal${r.falhas ? `, ${r.falhas} com falha` : ''}.`, tipo: r.falhas ? 'info' : 'ok' };
}
