// Erros da tela vão para app.erros (api.v1_erro_registrar) quando há login; sem login, só no console.
import { rpc } from './cliente';
import { VERSAO } from '../versao';

let contexto: { logado: boolean; escritorio: string | null } = { logado: false, escritorio: null };
let enviando = 0;

export function definirContextoErros(c: typeof contexto) { contexto = c; }

export function registrarErro(e: unknown, extra: Record<string, unknown> = {}) {
  const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e));
  console.error('[PMO v3]', err, extra);
  if (!contexto.logado || enviando > 3) return;
  enviando++;
  rpc('v1_erro_registrar', {
    p_escritorio: contexto.escritorio,
    p_dados: {
      mensagem: err.message, pilha: err.stack, rota: location.hash, versao: VERSAO,
      navegador: navigator.userAgent, contexto: extra,
    },
  }).catch(() => { /* registrar erro nunca pode gerar outro erro */ }).finally(() => { enviando--; });
}

export function instalarCapturaErros() {
  window.addEventListener('error', ev => registrarErro(ev.error ?? ev.message, { tipo: 'onerror' }));
  window.addEventListener('unhandledrejection', ev => registrarErro(ev.reason, { tipo: 'promessa' }));
}
