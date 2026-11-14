// V11d-3: notificações push no aparelho (#/notificacoes). Os avisos são os mesmos do 2.x (Ociosidade às 05:05,
// Reembolso KM às 18h), montados pelo servidor 2.x e enviados pela Edge Function "push" do banco. Aqui o aparelho
// se inscreve (api.v1_push_inscrever) com os tipos escolhidos; o teste sai pela Edge Function com o login do usuário.
import { FalhaApi, novaOperacao, rpc, sb } from './cliente';
import { traduzirErro } from './mensagens';

export type TipoAviso = 'ociosidade' | 'reembolso';
export interface TipoDisponivel { id: TipoAviso; titulo: string; descricao: string }
export interface AparelhoInscrito { id: string; aparelho: string; criadoEm: string; atualizadoEm: string; este: boolean }
export interface PushMeu {
  publica: string | null; disponiveis: TipoDisponivel[]; tipos: TipoAviso[]; escolhaGuardada: boolean; inscrito: boolean;
  aparelhos: AparelhoInscrito[];
}

export const pushSuportado = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

export const ehIos = (ua = navigator.userAgent) => /iphone|ipad|ipod/i.test(ua);
export const instaladoNaTela = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Chave VAPID (base64url) em bytes, como o pushManager.subscribe pede. */
export function bytesDaChave(b64u: string): Uint8Array<ArrayBuffer> {
  const b = (b64u + '='.repeat((4 - (b64u.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}

export function mesmaChave(atual: ArrayBuffer | null | undefined, nova: Uint8Array): boolean {
  if (!atual) return false;
  const a = new Uint8Array(atual);
  return a.length === nova.length && a.every((x, i) => x === nova[i]);
}

/** Nome curto do aparelho para a lista ("Chrome no Android", "Safari no iPhone"…). */
export function nomeAparelho(ua = navigator.userAgent): string {
  const so = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android'
    : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'aparelho';
  const nav = /edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
    : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Navegador';
  return `${nav} no ${so}`;
}

/** Tipos marcados, só os disponíveis, na ordem do catálogo. */
export const tiposValidos = (disp: TipoDisponivel[], marcados: Iterable<string>) => {
  const m = new Set(marcados);
  return disp.map(d => d.id).filter(id => m.has(id));
};

async function registro() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? navigator.serviceWorker.ready;
}

export async function inscricaoAtual(): Promise<PushSubscription | null> {
  if (!pushSuportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export const push = {
  meu: (esc: string, endpoint?: string | null) => rpc<PushMeu>('v1_push_meu', { p_escritorio: esc, p_endpoint: endpoint ?? null }),

  /** Pede a permissão, inscreve o aparelho (troca a inscrição se a chave mudou) e grava os tipos no banco. */
  async ativar(esc: string, publica: string | null, tipos: TipoAviso[]) {
    if (!pushSuportado()) throw new Error('Este navegador não aceita notificações.');
    if (!publica) throw new Error('As notificações ainda não foram configuradas no servidor. Tente de novo amanhã ou avise o PMO.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('As notificações estão bloqueadas para o app. Libere nas configurações do navegador (Configurações do site › Notificações).');
    const reg = await registro();
    const chave = bytesDaChave(publica);
    let sub = await reg.pushManager.getSubscription();
    if (sub && !mesmaChave(sub.options?.applicationServerKey, chave)) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
    const j = sub.toJSON();
    return rpc<{ ok: true; tipos: TipoAviso[] }>('v1_push_inscrever', {
      p_escritorio: esc, p_id_operacao: novaOperacao(),
      p_dados: { inscricao: { endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } }, tipos, aparelho: nomeAparelho() },
    });
  },

  /** Tira este aparelho (banco e navegador). */
  async desativar(esc: string) {
    const sub = await inscricaoAtual();
    if (!sub) return;
    try { await rpc('v1_push_cancelar', { p_escritorio: esc, p_endpoint: sub.endpoint }); } finally { await sub.unsubscribe().catch(() => false); }
  },

  /** Tira um aparelho da lista (outro celular/computador do próprio usuário). */
  remover: (esc: string, id: string) => rpc('v1_push_cancelar', { p_escritorio: esc, p_endpoint: null, p_id: id }),

  /** Teste só para este aparelho, pela Edge Function "push" (com o login do usuário). */
  async teste(esc: string, endpoint: string) {
    const { data, error } = await sb.functions.invoke('push', { body: { acao: 'teste', escritorio: esc, endpoint } });
    let r = data as { ok?: boolean; enviados?: number; vencidos?: string[]; erros?: string[]; erro?: string } | null;
    if (error) {
      try { r = await (error as { context?: Response }).context?.json(); } catch { /* sem corpo */ }
      if (!r?.erro) { const t = traduzirErro(error); throw new FalhaApi(t.codigo, t.mensagem); }
    }
    if (!r?.ok) throw new FalhaApi('PUSH', r?.erro || 'Não foi possível enviar o teste.');
    if (r.vencidos?.length) throw new FalhaApi('INVALIDO', 'A inscrição deste aparelho venceu. Toque em Ativar de novo.');
    if (!r.enviados) throw new FalhaApi('PUSH', `O serviço de notificações do aparelho recusou o envio${r.erros?.[0] ? ` (${r.erros[0]})` : ''}.`);
  },
};
