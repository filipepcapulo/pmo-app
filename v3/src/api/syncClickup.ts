// Status da sincronização com o ClickUp (0076, api.v1_sync_clickup_status): só leitura. Mostra os modos do sync (última
// execução boa, falhas seguidas, último erro), as 4 filas do espelho, os itens com erro ou parados, o webhook e o merge
// completo — para uma parada como a de 11 a 13/11/2026 (projetar falhando a cada minuto) aparecer na hora.
import { rpc } from './cliente';

export type ModoSync = 'puxar' | 'merge' | 'completo' | 'enviar' | 'projetar';
export type FilaSync = 'entrada' | 'saida' | 'espelho_fila' | 'espelho_saida';
export type Nivel = 'verde' | 'amarelo' | 'vermelho';

export interface ModoStatus extends Record<string, unknown> {
  modo: ModoSync; ultima_em: string | null; ultima_ok: boolean | null; ultima_cota: boolean | null; ultima_duracao_ms: number | null;
  ultima_boa_em: string | null; falhas_seguidas: number; falhando_desde: string | null; ultimo_erro: string | null; ultimo_erro_em: string | null;
}
export interface ExecucaoLog extends Record<string, unknown> {
  em: string; modo: string; ok: boolean; duracao_ms: number | null; req_cu: number | null; erro: string | null;
}
export interface ItemParado extends Record<string, unknown> {
  fila: FilaSync; tipo: string; nome: string; cliente: string | null; clickup_id: string | null;
  clickup_tipo: 'tarefa' | 'lista' | 'pasta' | null; desde: string; tentativas: number; erro: string | null; estado: string | null;
  /** Nova tentativa agendada ou saída segurada: só aparece na lista por ter erro (0077). */
  espera_ate: string | null;
}
interface FilaEspelho {
  total: number; vencidos: number; com_erro: number; mais_antiga: string | null; mais_antiga_vencida: string | null;
  em_espera_ate: string | null; por_tipo: Record<string, number>;
}
export interface StatusSync {
  agora: string; destino: 'clickup' | 'local'; parado_min: number; trava_ate: string | null; ultima_execucao_em: string | null;
  modos: ModoStatus[]; execucoes: ExecucaoLog[];
  filas: {
    entrada: { pendentes: number; com_erro: number; mais_antiga: string | null };
    saida: { pendente: number; enviando: number; erro: number; ok_24h: number; mais_antiga: string | null; vencidos: number; mais_antiga_vencida: string | null };
    espelho_fila: FilaEspelho; espelho_saida: FilaEspelho;
  };
  itens: ItemParado[]; itens_total: number;
  webhook: {
    registrado: boolean; criado_em: string | null; eventos: number | null; ultimo_evento_em: string | null;
    saude: { em: string; status: string | null; alerta: string | null; reativado: boolean | null; falhas: number | null } | null;
  };
  merge: {
    ultimo_em: string | null; marca: string | null;
    completo: { estado: string | null; inicio: string | null; pagina: number | null; recebidas: number | null; excluidas: number | null;
      alerta: string | null; atualizado_em: string | null } | null;
  };
}

export const syncClickup = {
  status: (esc: string, minutos = 10) => rpc<StatusSync>('v1_sync_clickup_status', { p_escritorio: esc, p_minutos: minutos }),
};

export const MODOS: ModoSync[] = ['puxar', 'merge', 'completo', 'enviar', 'projetar'];
export const ROTULO_MODO: Record<ModoSync, string> = {
  puxar: 'Puxar', merge: 'Merge', completo: 'Merge completo', enviar: 'Enviar', projetar: 'Projetar',
};
export const AJUDA_MODO: Record<ModoSync, string> = {
  puxar: 'aplica os eventos do webhook do ClickUp no banco',
  merge: 'confere o que mudou no ClickUp (a cada 15 min no expediente, 60 min fora)',
  completo: 'varredura diária de todas as tarefas (3h de MS)',
  enviar: 'manda para o ClickUp o que está na fila de saída',
  projetar: 'leva o espelho para o app e as mudanças do app para a fila de saída',
};
export const ROTULO_FILA: Record<FilaSync, string> = {
  entrada: 'Eventos do ClickUp', saida: 'Saída para o ClickUp', espelho_fila: 'ClickUp → app', espelho_saida: 'App → ClickUp',
};
export const ROTULO_NIVEL: Record<Nivel, string> = { verde: 'Tudo em dia', amarelo: 'Atenção', vermelho: 'Parado' };
export const COR_NIVEL: Record<Nivel, string> = { verde: 'var(--verde)', amarelo: 'var(--laranja)', vermelho: 'var(--vermelho)' };

/** Limites da situação: fila parada, falhas seguidas de um modo e silêncio do sync (o merge roda ao menos de hora em hora). */
export const LIMITE = { filaVermelhoMin: 30, falhasVermelho: 3, silencioVermelhoMin: 90, mergeAmareloMin: 75 };

const ms = (s: string | null | undefined) => (s ? Date.parse(s) : NaN);
/** Minutos entre `desde` e `agora` (a hora do servidor, para o relógio do aparelho não enganar). */
export const minutosDesde = (desde: string | null | undefined, agora: string): number | null => {
  const d = ms(desde), a = ms(agora);
  return Number.isNaN(d) || Number.isNaN(a) ? null : Math.max(0, Math.floor((a - d) / 60000));
};
/** "agora", "3 min", "2 h 10 min", "2 d 4 h". */
export function duracao(min: number | null): string {
  if (min === null) return '—';
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24), hr = h % 24;
  return hr ? `${d} d ${hr} h` : `${d} d`;
}
export const haQuanto = (desde: string | null | undefined, agora: string) => {
  const m = minutosDesde(desde, agora);
  return m === null ? '—' : m < 1 ? 'agora' : `há ${duracao(m)}`;
};
export const quando = (s: string | null | undefined) => (s
  ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—');

/** Situação de um modo: sem execução em 7 dias fica neutro (o `completo` só roda quando há varredura). */
export function nivelModo(m: ModoStatus): Nivel | null {
  if (!m.ultima_em) return null;
  if (m.falhas_seguidas >= LIMITE.falhasVermelho) return 'vermelho';
  if (m.falhas_seguidas > 0 || m.ultima_cota) return 'amarelo';
  return 'verde';
}
export function textoModo(m: ModoStatus, agora: string): string {
  if (!m.ultima_em) return 'Sem execução nos últimos 7 dias';
  if (m.falhas_seguidas > 0) return `Falhando ${haQuanto(m.falhando_desde, agora)} (${m.falhas_seguidas} ${m.falhas_seguidas === 1 ? 'execução' : 'execuções seguidas'})`;
  if (m.ultima_cota) return 'Cota do ClickUp esgotada na última execução';
  return 'Funcionando';
}

/** Uma fila na tela: `mais_antiga` é a do item VENCIDO mais antigo (item em espera — nova tentativa agendada ou saída
 *  segurada de propósito — não conta como parado; 0077). */
export interface ResumoFila { fila: FilaSync; pendentes: number; vencidos: number; com_erro: number; mais_antiga: string | null; detalhe: string }
export function resumoFilas(s: StatusSync): ResumoFila[] {
  const f = s.filas;
  const tipos = (p: Record<string, number>) => Object.entries(p).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(' · ');
  const esp = (x: FilaEspelho) => [tipos(x.por_tipo), x.total > x.vencidos ? `${x.total - x.vencidos} em espera${x.em_espera_ate ? ` até ${quando(x.em_espera_ate)}` : ''}` : ''].filter(Boolean).join(' · ');
  return [
    { fila: 'entrada', pendentes: f.entrada.pendentes, vencidos: f.entrada.pendentes, com_erro: f.entrada.com_erro, mais_antiga: f.entrada.mais_antiga, detalhe: '' },
    { fila: 'saida', pendentes: f.saida.pendente + f.saida.enviando, vencidos: f.saida.vencidos, com_erro: f.saida.erro, mais_antiga: f.saida.mais_antiga_vencida,
      detalhe: `${f.saida.pendente} pendente(s) · ${f.saida.enviando} enviando · ${f.saida.ok_24h} enviado(s) em 24 h` },
    { fila: 'espelho_fila', pendentes: f.espelho_fila.total, vencidos: f.espelho_fila.vencidos, com_erro: f.espelho_fila.com_erro, mais_antiga: f.espelho_fila.mais_antiga_vencida, detalhe: esp(f.espelho_fila) },
    { fila: 'espelho_saida', pendentes: f.espelho_saida.total, vencidos: f.espelho_saida.vencidos, com_erro: f.espelho_saida.com_erro, mais_antiga: f.espelho_saida.mais_antiga_vencida, detalhe: esp(f.espelho_saida) },
  ];
}
export function nivelFila(r: Pick<ResumoFila, 'vencidos' | 'com_erro' | 'mais_antiga'>, s: Pick<StatusSync, 'agora' | 'parado_min'>): Nivel {
  const min = r.vencidos > 0 ? minutosDesde(r.mais_antiga, s.agora) ?? 0 : 0;
  if (min >= LIMITE.filaVermelhoMin) return 'vermelho';
  if (min >= s.parado_min || r.com_erro > 0) return 'amarelo';
  return 'verde';
}

/** Situação geral: o pior dos sinais, com os motivos (os vermelhos primeiro). */
export function situacaoGeral(s: StatusSync): { nivel: Nivel; motivos: string[] } {
  const verm: string[] = [], amar: string[] = [];
  const local = s.destino === 'local';
  if (!local) {
    for (const m of s.modos) {
      const n = nivelModo(m);
      if (n === 'vermelho' || n === 'amarelo') {
        (n === 'vermelho' ? verm : amar).push(`${ROTULO_MODO[m.modo]}: ${textoModo(m, s.agora).toLowerCase()}`
          + (m.falhas_seguidas > 0 ? `; última execução boa ${m.ultima_boa_em ? haQuanto(m.ultima_boa_em, s.agora) : 'há mais de 7 dias'}` : ''));
      }
    }
    const silencio = minutosDesde(s.ultima_execucao_em, s.agora);
    if (silencio === null) verm.push('O sync nunca registrou uma execução.');
    else if (silencio >= LIMITE.silencioVermelhoMin) verm.push(`O sync não roda há ${duracao(silencio)}.`);
    else if ((minutosDesde(s.merge.ultimo_em, s.agora) ?? Infinity) >= LIMITE.mergeAmareloMin) amar.push(`O merge não roda ${haQuanto(s.merge.ultimo_em, s.agora)}.`);
    if (!s.webhook.registrado) verm.push('O webhook do ClickUp não está registrado.');
    else if (s.webhook.saude?.alerta) verm.push(`Webhook: ${s.webhook.saude.alerta}`);
    else if (s.webhook.saude?.reativado) amar.push('O webhook estava suspenso no ClickUp e foi reativado na última conferência.');
    if (s.merge.completo?.alerta) amar.push(`Merge completo: ${s.merge.completo.alerta}`);
  }
  for (const r of resumoFilas(s)) {
    const n = nivelFila(r, s);
    if (n === 'verde') continue;
    const min = r.vencidos > 0 ? minutosDesde(r.mais_antiga, s.agora) ?? 0 : 0;
    const partes = [min >= s.parado_min ? `${r.vencidos} item(ns), o mais antigo ${haQuanto(r.mais_antiga, s.agora)}` : '', r.com_erro > 0 ? `${r.com_erro} com erro` : ''];
    (n === 'vermelho' ? verm : amar).push(`Fila ${ROTULO_FILA[r.fila]}: ${partes.filter(Boolean).join(', ')}.`);
  }
  if (local && !verm.length && !amar.length) return { nivel: 'verde', motivos: ['ClickUp desligado: o banco processa as filas sozinho (sem Edge Function, webhook nem merge).'] };
  return { nivel: verm.length ? 'vermelho' : amar.length ? 'amarelo' : 'verde', motivos: [...verm, ...amar] };
}

const TIME = '9013912851';
/** Link do item no ClickUp (tarefa, lista ou pasta). */
export function linkClickup(i: Pick<ItemParado, 'clickup_id' | 'clickup_tipo'>): string | null {
  if (!i.clickup_id || !i.clickup_tipo) return null;
  const id = encodeURIComponent(i.clickup_id);
  return i.clickup_tipo === 'tarefa' ? `https://app.clickup.com/t/${id}`
    : `https://app.clickup.com/${TIME}/v/${i.clickup_tipo === 'lista' ? 'li' : 'f'}/${id}`;
}
