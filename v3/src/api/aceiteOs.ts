// Aceite de OS (V13d-3, módulo 05 da Central BP-MS; 0066 + Edge Function `aceite-os`). Conferir (só leitura) as OS de cada
// FAP no período → PRONTA / BLOQUEADA (com os motivos) / VAZIA → enviar as marcadas: um aceite por OS, e o Experience manda o
// e-mail aos aprovadores do cliente. O envio NÃO TEM VOLTA e começa desligado no escritório (quem tem Integração libera).
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type SituacaoFap = 'PRONTA' | 'BLOQUEADA' | 'VAZIA';
export interface EnvioDaOs { aceite_id: string | null; etapa: 'gerar' | 'email' | 'reenvio_email'; ok: boolean; erro: string | null; em: string; por: string | null }
export interface OsAceite {
  id: string; num: string | null; data: string | null; realizado: string | null; ok: boolean; processo: string | null; executante: string | null;
  inicio: string | null; fim: string | null; intervalo: string | null; alertas: string[]; solucao: string | null; fora_periodo: boolean;
  envio: EnvioDaOs | null;
}
export interface FapAceite {
  fap: string; parceiro: string | null; situacao: SituacaoFap; horas: string | null; aprovadores: { nome: string; email: string }[];
  bloqueios: string[]; fora_periodo: number; recente: boolean; projeto_id: string | null; os: OsAceite[];
}
export interface ResumoConferencia {
  prontas?: number; bloqueadas?: number; vazias?: number; os?: number; verificar?: number; faps?: number; fora_em_andamento?: string[];
  aviso?: string; aviso_executantes?: string; sem_detalhe?: number; erro?: string; codigo?: string; completa?: boolean;
}
export interface Conferencia {
  id: string; de: string; ate: string; faps: string | null; criado_em: string; concluido_em?: string | null; completa: boolean | null;
  resumo?: ResumoConferencia; executado_por: string | null; conta_de?: string | null; recente?: boolean;
}
export interface EnvioAceite {
  id: string; fap: string; parceiro: string | null; os_id: string; num: string | null; horas: string | null; aceite_id: string | null;
  etapa: 'gerar' | 'email' | 'reenvio_email'; ok: boolean; erro: string | null; aprovadores: string[]; em: string; por: string | null;
}
export interface PainelAceite {
  envio_liberado: boolean; solicitante_person_id: number | null; config_por: string | null; config_em: string | null; pode_config: boolean;
  enviando: { desde: string; por: string | null } | null; conferencias: Conferencia[]; conferencia: Conferencia | null; faps: FapAceite[];
  envios: EnvioAceite[];
}
export type ResultadoConferir = { ok: true; conferencia: string; resumo: ResumoConferencia } | { ok: false; codigo: string; erro: string };
export interface SituacaoEnvio { fap: string; os: string; num: string | null; ok: boolean; aceite_id: string | null; mensagem: string }
export type ResultadoEnviar = { ok: true; enviados: number; total: number; situacao: SituacaoEnvio[] } | { ok: false; codigo: string; erro: string };

async function invocar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.functions.invoke('aceite-os', { body: corpo });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as T;
}

export const aceiteOs = {
  painel: (esc: string, conferencia?: string, fap?: string) =>
    rpc<PainelAceite>('v1_aceite_os_painel', { p_escritorio: esc, ...(conferencia ? { p_conferencia: conferencia } : {}), ...(fap ? { p_fap: fap } : {}) }),
  config: (esc: string, liberado: boolean, solicitante: number | null) =>
    rpc<{ ok: true }>('v1_aceite_os_config', { p_escritorio: esc, p_envio_liberado: liberado, p_solicitante: solicitante }),
  /** Só leitura no Experience. Pode levar até 2 minutos (com muitas FAPs, digite as que quer). */
  conferir: (esc: string, de: string, ate: string, faps: string[]) =>
    invocar<ResultadoConferir>({ acao: 'conferir', escritorio: esc, de, ate, ...(faps.length ? { faps } : {}) }),
  /** SEM VOLTA: gera um aceite por OS e o Experience manda o e-mail ao cliente. */
  enviar: (esc: string, conferencia: string, itens: { fap: string; os: string }[]) =>
    invocar<ResultadoEnviar>({ acao: 'enviar', escritorio: esc, conferencia, itens, confirmar: true }),
  reenviarEmail: (esc: string, aceite: string) =>
    invocar<{ ok: true; mensagem: string } | { ok: false; codigo: string; erro: string }>({ acao: 'reenviar_email', escritorio: esc, aceite, confirmar: true }),
};

/** Mesma regra do banco (app.fap_do_nome): 4 a 6 dígitos soltos no nome do projeto. */
export function fapDoNome(nome: string | null | undefined): string | null {
  return String(nome ?? '').match(/(?:^|[^0-9])([0-9]{4,6})(?:[^0-9]|$)/)?.[1] ?? null;
}
/** "33084, 31934; 33084" → ["31934","33084"]; inválida → null. */
export function lerFaps(txt: string): string[] | null {
  const fs = [...new Set(txt.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean))].sort();
  return fs.every(f => /^\d{4,6}$/.test(f)) && fs.length <= 60 ? fs : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Período padrão da Central: a semana anterior, de segunda a domingo. */
export function semanaAnterior(hoje: string): { de: string; ate: string } {
  const d = new Date(`${hoje}T12:00:00Z`);
  const seg = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5 - 7 * 864e5);
  return { de: iso(seg), ate: iso(new Date(seg.getTime() + 6 * 864e5)) };
}
/** Mesma regra da Edge Function: de ≤ até ≤ hoje, no máximo 62 dias e até 400 dias para trás. */
export function erroPeriodo(de: string, ate: string, hoje: string): string | null {
  if (!de || !ate) return 'Informe o período.';
  if (ate < de) return 'A data final é antes da inicial.';
  if ((Date.parse(ate) - Date.parse(de)) / 864e5 > 61) return 'Período de no máximo 62 dias.';
  if (ate > hoje) return 'O aceite é das OS já executadas: a data final não pode passar de hoje.';
  if ((Date.parse(hoje) - Date.parse(de)) / 864e5 > 400) return 'Período até 400 dias para trás.';
  return null;
}

export const dataBr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

export function textoConferencia(c: Conferencia | null): string {
  if (!c) return 'Nenhuma conferência ainda.';
  return `Conferência de ${dataBr(c.de)} a ${dataBr(c.ate)}${c.faps ? ` (FAP ${c.faps.split(',').join(', ')})` : ''} · ${quando(c.criado_em)} por ${c.executado_por ?? '—'}`
    + (c.conta_de !== undefined ? (c.conta_de ? ` · conta Sankhya de ${c.conta_de}` : ' · conta padrão') : '')
    + (c.completa === null ? ' · em andamento' : c.completa === false ? ' · incompleta (confira de novo o que faltou)' : '')
    + (c.recente === false ? ' · há uma conferência mais nova' : '');
}

function falha(r: { codigo: string; erro: string }, oque: string): string {
  switch (r.codigo) {
    case 'SENHA_RECUSADA': return `A Sankhya recusou o login, por isso nada foi ${oque}. Atualize a senha em Equipe › ficha › Conta Sankhya. (${r.erro})`;
    case 'NAO_CONFIGURADO': case 'SEM_CADASTRO': return 'Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para usar o Aceite de OS.';
    case 'ESPERA': return 'A Sankhya recusou o último login: aguarde 60 segundos.';
    case 'OCUPADO': case 'DESLIGADO': case 'CONFERIR': case 'DADOS': return r.erro;
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}
export function textoConferir(r: ResultadoConferir): string {
  if (!r.ok) return falha(r, 'conferido');
  const s = r.resumo;
  return `Conferência concluída: ${s.prontas ?? 0} pronta(s), ${s.bloqueadas ?? 0} bloqueada(s), ${s.vazias ?? 0} FAP(s) sem OS no período (ocultas), `
    + `${s.verificar ?? 0} OS para VERIFICAR. Nada foi enviado.${s.completa === false ? ' A conferência parou antes do fim: confira de novo o que faltou.' : ''}`
    + (s.erro ? ` (${s.erro})` : '');
}
export function textoEnviar(r: ResultadoEnviar): string {
  if (!r.ok) return falha(r, 'enviado');
  return `Envio concluído: ${r.enviados} de ${r.total} aceite(s) de OS enviado(s).`;
}

/** Situação da OS na tela: já enviada, e-mail pendente (gerado), ou nada. */
export function estadoEnvio(e: EnvioDaOs | null): 'enviada' | 'email_pendente' | 'falhou' | null {
  if (!e) return null;
  if (e.aceite_id && e.ok) return 'enviada';
  if (e.aceite_id) return 'email_pendente';
  return 'falhou';
}
/** Pode marcar: FAP PRONTA, da conferência mais recente que a trouxe, OS no período e sem aceite gerado. */
export const podeMarcar = (f: Pick<FapAceite, 'situacao' | 'recente'>, o: Pick<OsAceite, 'fora_periodo' | 'envio'>) =>
  f.situacao === 'PRONTA' && f.recente && !o.fora_periodo && !o.envio?.aceite_id;
