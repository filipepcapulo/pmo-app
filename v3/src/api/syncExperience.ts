// Sync com o Experience (V13d-2, módulo 02 da Central BP-MS; 0065 + Edge Function `sync-experience`): os lançamentos do
// Experience ficam iguais às tarefas com Apontamento "OS Experience"/"Hora Dobrada". O campo Experience da tarefa decide:
// vazio/"Não lançado" cria, "Alterar" altera, "Lixeira" exclui no Experience (só com a TAG da tarefa). Nunca exclui nada no
// app: a tarefa fica, com a observação do que foi feito. Modo SIMULAÇÃO (padrão) só lê e mostra o que faria.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type Modo = 'simulacao' | 'real';
export type AcaoSync = 'criar' | 'alterar' | 'excluir';
export type ResultadoSync = 'feito' | 'simulado' | 'sem_mudanca' | 'ignorado' | 'bloqueado' | 'erro';

export interface LinhaSync extends Record<string, unknown> {
  id: string; tarefa_id: string; tarefa: string; consultor: string; cliente: string; fap: string | null; data: string | null;
  janela: string | null; acao: AcaoSync; resultado: ResultadoSync; lancamento_id: string | null; mensagem: string | null;
}
export interface ResumoSync {
  modo?: Modo; tarefas?: number; feitos?: number; simulados?: number; sem_mudanca?: number; ignorados?: number; bloqueados?: number;
  erros?: number; criar?: number; alterar?: number; excluir?: number; linhas?: number; truncados?: string[]; erro?: string; codigo?: string;
  completa?: boolean;
}
export interface ExecucaoSync {
  id: string; de: string; ate: string; modo: Modo; fap: string | null; criado_em: string; concluido_em?: string | null; completa: boolean | null;
  resumo?: ResumoSync; consultor: string | null; tarefa?: string | null; executado_por: string | null; conta_de?: string | null;
}
export interface PainelSync {
  modo: Modo; modo_por: string | null; modo_em: string | null; pode_modo: boolean; rodando: { desde: string; por: string | null } | null;
  execucoes: ExecucaoSync[]; execucao: ExecucaoSync | null; linhas: LinhaSync[];
}
export type ResultadoRodar = { ok: true; execucao: string; modo: Modo; resumo: ResumoSync } | { ok: false; codigo: string; erro: string };

/** Bloco da ficha da Tarefa (api.v1_tarefa → experience_sync). */
export interface SyncDaTarefa {
  lancamento_id: string | null; acao: AcaoSync | null; resultado: Exclude<ResultadoSync, 'simulado'> | null; observacao: string | null;
  em: string | null; por: string | null;
  ultima: { acao: AcaoSync; resultado: ResultadoSync; mensagem: string | null; em: string; modo: Modo } | null;
}

export interface FiltroRodar { de: string; ate: string; fap?: string | null; consultor?: string | null; tarefa?: string | null }

export const syncExperience = {
  painel: (esc: string, execucao?: string) =>
    rpc<PainelSync>('v1_sync_experience_painel', { p_escritorio: esc, ...(execucao ? { p_execucao: execucao } : {}) }),
  modo: (esc: string, modo: Modo) => rpc<{ ok: true; modo: Modo }>('v1_sync_experience_modo', { p_escritorio: esc, p_modo: modo }),
  /** Roda no modo do escritório. Pode levar até 2 minutos (o resto fica para a próxima rodada). */
  async rodar(esc: string, f: FiltroRodar): Promise<ResultadoRodar> {
    const corpo = { acao: 'rodar', escritorio: esc, de: f.de, ate: f.ate, ...(f.fap ? { fap: f.fap } : {}),
      ...(f.consultor ? { consultor: f.consultor } : {}), ...(f.tarefa ? { tarefa: f.tarefa } : {}) };
    const { data, error } = await sb.functions.invoke('sync-experience', { body: corpo });
    if (error) {
      const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: c?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoRodar;
  },
};

export const ROTULO_ACAO: Record<AcaoSync, string> = { criar: 'Criar', alterar: 'Alterar', excluir: 'Excluir (Lixeira)' };
export const ROTULO_RESULTADO: Record<ResultadoSync, string> = {
  feito: 'Feito', simulado: 'Simulação', sem_mudanca: 'Já estava certo', ignorado: 'Ignorado', bloqueado: 'Bloqueado', erro: 'Erro',
};
export const ROTULO_MODO: Record<Modo, string> = { simulacao: 'Simulação (só mostra o que faria)', real: 'Real (grava no Experience)' };

/** Precisa de atenção: erro, bloqueado ou ignorado (o ignorado por tempo volta na próxima rodada). */
export const pendente = (l: Pick<LinhaSync, 'resultado'>) => l.resultado === 'erro' || l.resultado === 'bloqueado' || l.resultado === 'ignorado';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const soma = (dia: string, n: number) => iso(new Date(Date.parse(dia) + n * 864e5));
/** Período padrão: de hoje até 13 dias à frente (as agendas das próximas 2 semanas). */
export const periodoPadrao = (hoje: string) => ({ de: hoje, ate: soma(hoje, 13) });
/** Mesma regra da Edge Function: de ≤ até, no máximo 31 dias e até 62 dias de hoje. */
export function erroPeriodo(de: string, ate: string, hoje: string): string | null {
  if (!de || !ate) return 'Informe o período.';
  if (ate < de) return 'A data final é antes da inicial.';
  if ((Date.parse(ate) - Date.parse(de)) / 864e5 > 30) return 'Período de no máximo 31 dias.';
  if (de < soma(hoje, -62) || ate > soma(hoje, 62)) return 'Período até 62 dias de hoje.';
  return null;
}
export const fapValida = (s: string) => s === '' || /^\d{4,6}$/.test(s);

export const dataBr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

export function textoExecucao(e: ExecucaoSync | null): string {
  if (!e) return 'Nenhuma rodada ainda.';
  const filtros = [e.fap ? `FAP ${e.fap}` : '', e.consultor ? `só ${e.consultor}` : '', e.tarefa ? `tarefa "${e.tarefa}"` : ''].filter(Boolean).join(', ');
  return `${e.modo === 'real' ? 'Rodada real' : 'Simulação'} de ${dataBr(e.de)} a ${dataBr(e.ate)}${filtros ? ` (${filtros})` : ''} · ${quando(e.criado_em)} por ${e.executado_por ?? '—'}`
    + (e.conta_de !== undefined ? (e.conta_de ? ` · conta Sankhya de ${e.conta_de}` : ' · conta padrão') : '')
    + (e.completa === null ? ' · em andamento' : e.completa === false ? ' · incompleta (rode de novo para o que faltou)' : '');
}

export function textoResultado(r: ResultadoRodar): string {
  if (r.ok) {
    const s = r.resumo ?? {};
    const pend = (s.erros ?? 0) + (s.bloqueados ?? 0);
    const base = r.modo === 'real'
      ? `Sync feito: ${s.feitos ?? 0} gravado(s) no Experience, ${s.sem_mudanca ?? 0} já certo(s)`
      : `Simulação pronta: ${s.simulados ?? 0} ação(ões) que o sync faria, ${s.sem_mudanca ?? 0} já certa(s)`;
    return `${base}, ${pend} com pendência.${s.completa === false ? ' A rodada parou antes do fim: rode de novo para o que faltou.' : ''}${s.erro ? ` (${s.erro})` : ''}`;
  }
  switch (r.codigo) {
    case 'OCUPADO': return r.erro;
    case 'SENHA_RECUSADA': return `A Sankhya recusou o login, por isso nada foi feito. Atualize a senha em Equipe › ficha › Conta Sankhya. (${r.erro})`;
    case 'NAO_CONFIGURADO': case 'SEM_CADASTRO': return 'Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para rodar o sync.';
    case 'ESPERA': return 'A Sankhya recusou o último login: aguarde 60 segundos.';
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}

export interface TotaisSync { feito: number; simulado: number; sem_mudanca: number; ignorado: number; bloqueado: number; erro: number }
export function totaisSync(ls: Pick<LinhaSync, 'resultado'>[]): TotaisSync {
  const t: TotaisSync = { feito: 0, simulado: 0, sem_mudanca: 0, ignorado: 0, bloqueado: 0, erro: 0 };
  for (const l of ls) t[l.resultado]++;
  return t;
}

/** Linha da ficha da Tarefa: "Lançamento 4248364 criado no Experience. · 11/11/2026 09:05 por Ana". */
export function textoSyncTarefa(s: SyncDaTarefa | null | undefined): string | null {
  if (!s) return null;
  const real = s.resultado ? `${s.observacao ?? ROTULO_RESULTADO[s.resultado]}${s.em ? ` · ${quando(s.em)}` : ''}${s.por ? ` por ${s.por}` : ''}` : null;
  const ult = s.ultima && s.ultima.modo === 'simulacao' && (!s.em || s.ultima.em > s.em)
    ? `Última simulação (${quando(s.ultima.em)}): ${s.ultima.mensagem ?? ROTULO_RESULTADO[s.ultima.resultado]}` : null;
  return [real, ult].filter(Boolean).join(' — ') || null;
}
