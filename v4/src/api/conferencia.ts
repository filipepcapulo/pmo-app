// Conferência de OS (V13c-3, módulo 03 da Central BP-MS; 0063 + Edge Function `conferencia`): OS do Experience × agendas
// (tarefas) do banco no período. Fase 1 pela TAG/nº da OS, depois data + consultor + cliente + horário; gêmeas dividem as
// horas; relatório por consultor. "Gravar vínculo" (o "Atualizar ClickUp" da Central) grava a OS como apontamento da tarefa,
// com quem validou. Nunca apaga tarefa.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type Situacao = 'conferida' | 'sem_os' | 'aguardando_gp' | 'tempo_alterado' | 'os_sem_tarefa';
export interface LinhaConferencia extends Record<string, unknown> {
  id: string; tipo: 'tarefa' | 'os'; situacao: Situacao; fase: 'tag' | 'numero' | 'data' | 'gemea' | null; tarefa_id: string | null;
  usuario_id: string | null; consultor: string | null; executante: string | null; cliente: string | null; fap: string | null; data: string | null;
  tarefa_nome: string | null; janela: string | null; experience_id: string | null; numero_os: string | null; os_ini: string | null;
  os_fim: string | null; intervalo_min: number | null; horas: number | null; horas_antes: number | null; horas_divididas: boolean;
  horario_divergente: boolean; solucao: string | null; substitui_tarefa: string | null; substitui_os: string | null; mensagem: string | null;
  vinculado_em: string | null; vinculado_por: string | null;
}
export interface ResumoConferencia {
  tarefas?: number; ja_validadas?: number; os?: number; conferidas?: number; sem_os?: number; aguardando_gp?: number; tempo_alterado?: number;
  os_sem_tarefa?: number; por_tag?: number; gemeas?: number; horas_divididas?: number; horario_divergente?: number; faps?: number;
  projetos?: number; sem_projeto?: string[]; falhas?: string[]; gestores?: number; sem_detalhe?: number; linhas?: number;
}
export interface ExecucaoConferencia {
  id: string; de: string; ate: string; criado_em: string; completa?: boolean; consultor: string | null; executado_por: string | null;
  conta_de?: string | null; resumo?: ResumoConferencia;
}
export interface Conferencia {
  todos: boolean; pode_gerenciar: boolean; execucoes: ExecucaoConferencia[]; execucao: ExecucaoConferencia | null; linhas: LinhaConferencia[];
}
export type ResultadoConferir = { ok: true; execucao: string; resumo: ResumoConferencia } | { ok: false; codigo: string; erro: string };
export interface ResultadoVinculo { ok: true; criados: number; atualizados: number; iguais: number; ignorados: number; conferidos_mantidos: number }

export const conferencia = {
  listar: (esc: string, execucao?: string) =>
    rpc<Conferencia>('v1_conferencia_listar', { p_escritorio: esc, ...(execucao ? { p_execucao: execucao } : {}) }),
  vincular: (esc: string, execucao: string, itens: string[]) =>
    rpc<ResultadoVinculo>('v1_conferencia_vincular', { p_escritorio: esc, p_execucao: execucao, p_itens: itens }),
  /** Lê as OS do período no Experience, cruza com as agendas e grava o relatório. Pode levar 1–2 minutos (um detalhe por OS). */
  async conferir(esc: string, de: string, ate: string, consultor?: string | null): Promise<ResultadoConferir> {
    const { data, error } = await sb.functions.invoke('conferencia', { body: { acao: 'conferir', escritorio: esc, de, ate, ...(consultor ? { consultor } : {}) } });
    if (error) {
      const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: c?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoConferir;
  },
};

export const ROTULO: Record<Situacao, string> = {
  conferida: 'Conferida', sem_os: 'Sem apontamento no Sankhya', aguardando_gp: 'Aguardando aprovação do GP',
  tempo_alterado: 'Tempo alterado no Sankhya', os_sem_tarefa: 'OS sem tarefa',
};
export const ROTULO_FASE: Record<string, string> = { tag: 'TAG', numero: 'Nº da OS', data: 'Data/consultor/cliente', gemea: 'Tarefa-gêmea' };

/** Precisa de ação: tudo que não é conferida limpa (conferida com horas divididas ou horário divergente também). */
export const pendente = (l: LinhaConferencia) => l.situacao !== 'conferida' || l.horas_divididas || l.horario_divergente;
/** Pode gravar o vínculo: linha de tarefa conferida/tempo alterado com nº de OS e ainda não gravada. */
export const vinculavel = (l: LinhaConferencia) =>
  l.tipo === 'tarefa' && (l.situacao === 'conferida' || l.situacao === 'tempo_alterado') && !!l.numero_os && !l.vinculado_em;

/** Período padrão: o ciclo 21–20 atual até hoje. */
export function periodoPadrao(hoje: string): { de: string; ate: string } {
  const a = +hoje.slice(0, 4), m = +hoje.slice(5, 7), d = +hoje.slice(8, 10);
  const [aa, mm] = d >= 21 ? [a, m] : m === 1 ? [a - 1, 12] : [a, m - 1];
  return { de: `${aa}-${String(mm).padStart(2, '0')}-21`, ate: hoje };
}
/** Mesma regra da Edge Function: de ≤ até ≤ hoje e no máximo 63 dias. */
export function erroPeriodo(de: string, ate: string, hoje: string): string | null {
  if (!de || !ate) return 'Informe o período.';
  if (ate < de) return 'A data final é antes da inicial.';
  if (ate > hoje) return 'A data final não pode passar de hoje.';
  if ((Date.parse(ate) - Date.parse(de)) / 864e5 > 62) return 'Período de no máximo 63 dias.';
  return null;
}

export const dataBr = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

/** "Conferido em 11/11/2026 09:05 por Ana · conta Sankhya de Ana · 01/11 a 10/11". */
export function textoExecucao(e: ExecucaoConferencia | null): string {
  if (!e) return 'Nenhuma conferência rodada ainda.';
  return `Conferência de ${dataBr(e.de)} a ${dataBr(e.ate)}${e.consultor ? ` (só ${e.consultor})` : ''} · rodada em ${quando(e.criado_em)} por ${e.executado_por ?? '—'}`
    + (e.conta_de !== undefined ? (e.conta_de ? ` · conta Sankhya de ${e.conta_de}` : ' · conta padrão') : '')
    + (e.completa === false ? ' · consulta incompleta: alguma FAP não respondeu' : '');
}

/** Mensagem do botão Conferir. */
export function textoResultado(r: ResultadoConferir): string {
  if (r.ok) {
    const s = r.resumo ?? {};
    const falhas = s.falhas?.length ? ` FAP(s) sem resposta do Experience: ${s.falhas.join(', ')}.` : '';
    return `Conferência pronta: ${s.os ?? 0} OS × ${s.tarefas ?? 0} agenda(s). ${s.conferidas ?? 0} conferida(s), ${s.sem_os ?? 0} sem apontamento, `
      + `${s.aguardando_gp ?? 0} aguardando o GP, ${s.os_sem_tarefa ?? 0} OS sem tarefa.${falhas}`;
  }
  switch (r.codigo) {
    case 'SENHA_RECUSADA': return `A Sankhya recusou o login, por isso nada foi conferido. Atualize a senha em Equipe › ficha › Conta Sankhya. (${r.erro})`;
    case 'NAO_CONFIGURADO': case 'SEM_CADASTRO': return 'Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para rodar a conferência.';
    case 'ESPERA': return 'A Sankhya recusou o último login: aguarde 60 segundos.';
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}

export function textoVinculo(r: ResultadoVinculo): string {
  const p = [`${r.criados} gravado(s)`];
  if (r.atualizados) p.push(`${r.atualizados} atualizado(s)`);
  if (r.iguais) p.push(`${r.iguais} já estava(m) igual(is)`);
  if (r.conferidos_mantidos) p.push(`${r.conferidos_mantidos} já conferido(s) pela gerência, mantido(s)`);
  if (r.ignorados) p.push(`${r.ignorados} ignorado(s)`);
  return `Vínculos: ${p.join(', ')}.`;
}

export interface TotaisConferencia { conferida: number; sem_os: number; aguardando_gp: number; tempo_alterado: number; os_sem_tarefa: number; conferir: number; vinculaveis: number }
export function totaisConferencia(ls: LinhaConferencia[]): TotaisConferencia {
  const t: TotaisConferencia = { conferida: 0, sem_os: 0, aguardando_gp: 0, tempo_alterado: 0, os_sem_tarefa: 0, conferir: 0, vinculaveis: 0 };
  for (const l of ls) {
    t[l.situacao]++;
    if (l.situacao === 'conferida' && (l.horas_divididas || l.horario_divergente)) t.conferir++;
    if (vinculavel(l)) t.vinculaveis++;
  }
  return t;
}

/** Relatório por consultor (RN-05 sem o envio: a mensagem fica pronta para copiar). */
export interface GrupoConsultor { consultor: string; linhas: LinhaConferencia[]; pendencias: LinhaConferencia[]; totais: TotaisConferencia }
export function porConsultor(ls: LinhaConferencia[]): GrupoConsultor[] {
  const m = new Map<string, LinhaConferencia[]>();
  for (const l of ls) { const k = l.consultor ?? l.executante ?? '—'; m.set(k, [...(m.get(k) ?? []), l]); }
  return [...m.entries()].map(([consultor, linhas]) => ({ consultor, linhas, pendencias: linhas.filter(pendente), totais: totaisConferencia(linhas) }))
    .sort((a, b) => b.pendencias.length - a.pendencias.length || a.consultor.localeCompare(b.consultor));
}

/** Texto curto para o consultor (WhatsApp/e-mail): só as pendências, uma por linha. */
export function mensagemConsultor(g: GrupoConsultor, e: ExecucaoConferencia | null): string {
  const primeiro = g.consultor.split(' ')[0];
  if (!g.pendencias.length) return `Olá, ${primeiro}! Conferência de OS${e ? ` de ${dataBr(e.de)} a ${dataBr(e.ate)}` : ''}: tudo certo, obrigado!`;
  const linhas = g.pendencias.map(l => `• ${dataBr(l.data)} ${l.janela ?? (l.os_ini && l.os_fim ? `${l.os_ini}-${l.os_fim}` : '')} ${l.cliente ?? ''}`.trim()
    + ` — ${ROTULO[l.situacao]}${l.numero_os ? ` (OS ${l.numero_os})` : ''}${l.mensagem ? `: ${l.mensagem}` : ''}`);
  return `Olá, ${primeiro}! Conferência de OS${e ? ` de ${dataBr(e.de)} a ${dataBr(e.ate)}` : ''}: ${g.pendencias.length} ponto(s) para acertar:\n${linhas.join('\n')}`;
}
