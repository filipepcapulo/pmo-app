// Conferência de Planilhas (V13e-1, módulo 10 da Central BP-MS; 0067 + Edge Function `planilhas`): planilhas de horas dos
// consultores (Drive, "01. Planilhas Consultores") × agendas de planilha do banco no período. Fechar (depois do "Sim")
// preenche a OBS/VISTO nas planilhas e valida no banco as linhas conferidas (com quem validou); depois, outro "Sim" cria a
// aba vazia do próximo ciclo. Cópia de segurança antes de cada gravação. Nunca apaga tarefa.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';
export { dataBr, erroPeriodo, periodoPadrao } from './conferencia';
import { dataBr } from './conferencia';

export type SituacaoPl = 'conferido' | 'horario' | 'cliente' | 'falta' | 'sem_tarefa' | 'conflito' | 'duplicado';
export interface LinhaPlanilha extends Record<string, unknown> {
  id: string; situacao: SituacaoPl; usuario_id: string | null; consultor: string | null; data: string; tarefa_id: string | null;
  tarefa_nome: string | null; apontamento: string | null; janela: string | null; parceiro: string | null; cliente_planilha: string | null;
  hora_ini: string | null; hora_fim: string | null; intervalo_min: number | null; total_min: number | null; descricao: string | null;
  os: string | null; observacao: string | null; texto_conflito: string | null; arquivo_nome: string | null; aba: string | null;
  linha: number | null; obs_gravada: string | null; validado_em: string | null;
}
export interface ArquivoPl { id: string; nome: string; pasta: string; usuario_id: string | null; erro: string | null; linhas?: number; google?: boolean }
export interface ResumoPl {
  total?: number; conferido?: number; horario?: number; cliente?: number; falta?: number; sem_tarefa?: number; conflito?: number;
  duplicado?: number; com_os?: number; planilhas?: number; sem_planilha?: string[]; sem_cadastro?: string[]; com_erro?: string[]; linhas?: number;
}
export interface ResultadoArquivo { id: string; nome: string; pasta: string; escritas?: number; mantidas?: number; visto?: boolean; alvo?: string | null;
  criada?: boolean; ja_existia?: boolean; backup: string | null; erro: string | null }
export interface ExecucaoPl {
  id: string; de: string; ate: string; criado_em: string; consultor: string | null; executado_por: string | null; resumo?: ResumoPl;
  arquivos?: ArquivoPl[]; fechada_em: string | null; fechada_por?: string | null;
  fechamento?: { arquivos: ResultadoArquivo[]; criados: number; validados: number; ignorados: number } | null;
  aba_ciclo_em?: string | null; aba_ciclo_por?: string | null; aba_ciclo?: ResultadoArquivo[] | null;
}
export interface ConferenciaPl { todos: boolean; pode_gerenciar: boolean; execucoes: ExecucaoPl[]; execucao: ExecucaoPl | null; linhas: LinhaPlanilha[] }
export type ResultadoPl =
  | { ok: true; execucao?: string; resumo?: ResumoPl; arquivos?: ResultadoArquivo[]; resultado?: ResultadoArquivo[]; criados?: number; validados?: number; criadas?: number }
  | { ok: false; codigo: string; erro: string };

async function edge(corpo: Record<string, unknown>): Promise<ResultadoPl> {
  const { data, error } = await sb.functions.invoke('planilhas', { body: corpo });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as ResultadoPl;
}

export const planilhas = {
  listar: (esc: string, execucao?: string) =>
    rpc<ConferenciaPl>('v1_planilhas_listar', { p_escritorio: esc, ...(execucao ? { p_execucao: execucao } : {}) }),
  /** Lê as planilhas do Drive (só leitura), cruza com as agendas e grava o relatório. */
  conferir: (esc: string, de: string, ate: string, consultor?: string | null) =>
    edge({ acao: 'conferir', escritorio: esc, de, ate, ...(consultor ? { consultor } : {}) }),
  /** Depois do "Sim": OBS/VISTO nas planilhas + validação no banco. */
  fechar: (esc: string, execucao: string) => edge({ acao: 'fechar', escritorio: esc, execucao, confirmar: true }),
  /** Depois do segundo "Sim": aba vazia do próximo ciclo. */
  abaCiclo: (esc: string, execucao: string) => edge({ acao: 'aba_ciclo', escritorio: esc, execucao, confirmar: true }),
};

export const ROTULO_PL: Record<SituacaoPl, string> = {
  conferido: 'Conferido', horario: 'Horário diferente', cliente: 'Cliente diferente', falta: 'Falta na planilha',
  sem_tarefa: 'Sem agenda no app', conflito: 'Conflito de horário', duplicado: 'Lançamento duplicado',
};
export const pendentePl = (l: LinhaPlanilha) => l.situacao !== 'conferido' || !!l.os;
export const hm = (m: number | null | undefined) => (m ? `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` : '00:00');
export const horarioPl = (l: LinhaPlanilha) => (l.hora_ini && l.hora_fim ? `${l.hora_ini}-${l.hora_fim}` : '');

export interface TotaisPl extends Record<SituacaoPl, number> { com_os: number; pendencias: number; min_planilha: number; min_so_agenda: number }
export function totaisPl(ls: LinhaPlanilha[]): TotaisPl {
  const t: TotaisPl = { conferido: 0, horario: 0, cliente: 0, falta: 0, sem_tarefa: 0, conflito: 0, duplicado: 0, com_os: 0, pendencias: 0, min_planilha: 0, min_so_agenda: 0 };
  for (const l of ls) {
    t[l.situacao]++;
    if (l.os) t.com_os++;
    if (pendentePl(l)) t.pendencias++;
    if (l.linha) t.min_planilha += l.total_min ?? 0; else t.min_so_agenda += l.total_min ?? 0;
  }
  return t;
}

export interface GrupoPl { consultor: string; linhas: LinhaPlanilha[]; pendencias: LinhaPlanilha[]; totais: TotaisPl }
export function porConsultorPl(ls: LinhaPlanilha[]): GrupoPl[] {
  const m = new Map<string, LinhaPlanilha[]>();
  for (const l of ls) { const k = l.consultor ?? '—'; m.set(k, [...(m.get(k) ?? []), l]); }
  return [...m.entries()].map(([consultor, linhas]) => ({ consultor, linhas, pendencias: linhas.filter(pendentePl), totais: totaisPl(linhas) }))
    .sort((a, b) => b.pendencias.length - a.pendencias.length || a.consultor.localeCompare(b.consultor));
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
export function textoExecucaoPl(e: ExecucaoPl | null): string {
  if (!e) return 'Nenhuma conferência de planilhas rodada ainda.';
  return `Conferência de ${dataBr(e.de)} a ${dataBr(e.ate)}${e.consultor ? ` (só ${e.consultor})` : ''} · rodada em ${quando(e.criado_em)} por ${e.executado_por ?? '—'}`
    + (e.fechada_em ? ` · planilhas fechadas em ${quando(e.fechada_em)}${e.fechada_por ? ` por ${e.fechada_por}` : ''}` : '')
    + (e.aba_ciclo_em ? ` · aba do novo ciclo criada em ${quando(e.aba_ciclo_em)}` : '');
}

export function textoErroPl(r: { codigo: string; erro: string }): string {
  switch (r.codigo) {
    case 'NAO_CONFIGURADO': return 'A conta de serviço do Google ainda não foi configurada (segredos GOOGLE_SA_JSON e PLANILHAS_PASTA_ID do Supabase).';
    case 'SEM_ACESSO': return `O Google recusou o acesso às planilhas: ${r.erro}`;
    case 'JA_FECHADA': return 'Estas planilhas já foram fechadas. Rode a conferência de novo para fechar outra vez.';
    case 'NAO_FECHADA': return 'Feche as planilhas antes de criar a aba do novo ciclo.';
    default: return `Não foi possível falar com o Drive agora: ${r.erro}`;
  }
}

export function textoConferirPl(r: ResultadoPl): string {
  if (!r.ok) return textoErroPl(r);
  const s = r.resumo ?? {};
  const avisos = [
    s.com_erro?.length ? ` Não consegui ler: ${s.com_erro.join(', ')}.` : '',
    s.sem_planilha?.length ? ` Pasta sem planilha: ${s.sem_planilha.join(', ')}.` : '',
    s.sem_cadastro?.length ? ` Pasta sem consultor no cadastro: ${s.sem_cadastro.join(', ')}.` : '',
  ].join('');
  return `Conferência pronta: ${s.planilhas ?? 0} planilha(s). ${s.conferido ?? 0} conferido(s), ${(s.horario ?? 0) + (s.cliente ?? 0)} com diferença, `
    + `${s.falta ?? 0} falta(m) na planilha, ${s.sem_tarefa ?? 0} sem agenda, ${(s.conflito ?? 0) + (s.duplicado ?? 0)} conflito(s)/duplicado(s).${avisos}`;
}

export function textoFecharPl(r: ResultadoPl): string {
  if (!r.ok) return textoErroPl(r);
  const arqs = r.arquivos ?? [];
  const escritas = arqs.reduce((s, a) => s + (a.escritas ?? 0), 0), mantidas = arqs.reduce((s, a) => s + (a.mantidas ?? 0), 0);
  const vistos = arqs.filter((a) => a.visto).length, erros = arqs.filter((a) => a.erro);
  return `Planilhas fechadas: ${escritas} OBS preenchida(s)${mantidas ? `, ${mantidas} OBS com texto manual mantida(s)` : ''}`
    + `${vistos ? `, ${vistos} planilha(s) vazia(s) com VISTO` : ''}. ${r.criados ?? 0} apontamento(s) validado(s) criado(s), ${r.validados ?? 0} já existente(s) validado(s).`
    + (erros.length ? ` Não gravadas: ${erros.map((a) => `${a.pasta} (${a.erro})`).join('; ')}.` : '');
}

export function textoAbaCicloPl(r: ResultadoPl): string {
  if (!r.ok) return textoErroPl(r);
  const rs = r.resultado ?? [];
  const ja = rs.filter((a) => a.ja_existia).length, erros = rs.filter((a) => a.erro);
  return `Aba ${rs.find((a) => a.alvo)?.alvo ?? 'do novo ciclo'} criada em ${r.criadas ?? 0} planilha(s)${ja ? `; ${ja} já tinha(m)` : ''}.`
    + (erros.length ? ` Não criada: ${erros.map((a) => `${a.pasta} (${a.erro})`).join('; ')}.` : '');
}

/** Texto curto para o consultor: só as pendências. */
export function mensagemConsultorPl(g: GrupoPl, e: ExecucaoPl | null): string {
  const primeiro = g.consultor.split(' ')[0];
  const per = e ? ` de ${dataBr(e.de)} a ${dataBr(e.ate)}` : '';
  if (!g.pendencias.length) return `Olá, ${primeiro}! Conferência da planilha de horas${per}: tudo certo, obrigado!`;
  const ls = g.pendencias.map(l => `• ${dataBr(l.data)} ${horarioPl(l) || l.janela || ''} ${l.cliente_planilha || l.parceiro || ''}`.replace(/\s+/g, ' ').trim()
    + ` — ${ROTULO_PL[l.situacao]}${l.os ? ` (já tem OS ${l.os})` : ''}${l.observacao ? `: ${l.observacao}` : ''}`);
  return `Olá, ${primeiro}! Conferência da planilha de horas${per}: ${g.pendencias.length} ponto(s) para acertar:\n${ls.join('\n')}`;
}

const MESES = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
/** Nome da aba do ciclo seguinte ao da data final (ciclo 21–20): 2026-11-11 → "NOV-DEZ26". Mesma regra da Edge Function. */
export function abaProximoCiclo(ate: string): string {
  const a = +ate.slice(0, 4), m = +ate.slice(5, 7), d = +ate.slice(8, 10);
  const fimMes = d >= 21 ? (m === 12 ? 1 : m + 1) : m;           // mês em que o ciclo da data termina (dia 20)
  const fimAno = d >= 21 && m === 12 ? a + 1 : a;
  const ini = fimMes, fim = fimMes === 12 ? 1 : fimMes + 1, anoFim = fimMes === 12 ? fimAno + 1 : fimAno;
  return `${MESES[ini]}-${MESES[fim]}${String(anoFim).slice(2)}`;
}
