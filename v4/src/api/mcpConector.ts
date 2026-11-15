// Conector do Claude (0088): o chat comum, o Cowork, o Desktop e o celular ligam no MCP por OAuth, sem token colado.
// O Claude abre o app com o pedido na URL (?mcp_autorizar=1&…); a pessoa, logada, autoriza; o banco devolve um código de
// uso único e o app devolve a pessoa ao Claude com ele. O token nasce depois, na troca feita pelo Claude: nunca passa
// pelo navegador. Só dados operacionais, como todo o MCP.
import { rpc } from './cliente';

// Lista fechada (igual a app.mcp_conector_cliente / app.mcp_conector_retornos e a functions/mcp/conector.ts).
export const CLIENTE_CONECTOR = 'pmo-claude';
export const RETORNOS_CONECTOR = ['https://claude.ai/api/mcp/auth_callback', 'https://claude.com/api/mcp/auth_callback'];

export interface PedidoConector { client_id: string; redirect_uri: string; code_challenge: string; code_challenge_method: string; state: string | null }

/** Lê o pedido de autorização da URL. null = não é um pedido; `erro` = é um pedido, mas não pode seguir. */
export function lerPedido(busca: string): { pedido: PedidoConector | null; erro: string | null } | null {
  const b = new URLSearchParams(busca);
  if (b.get('mcp_autorizar') !== '1') return null;
  const pedido: PedidoConector = {
    client_id: b.get('client_id') ?? '', redirect_uri: b.get('redirect_uri') ?? '', code_challenge: b.get('code_challenge') ?? '',
    code_challenge_method: b.get('code_challenge_method') ?? '', state: b.get('state'),
  };
  if (pedido.client_id !== CLIENTE_CONECTOR || !RETORNOS_CONECTOR.includes(pedido.redirect_uri)) {
    return { pedido: null, erro: 'Este pedido não veio do conector do Claude. Nada foi autorizado.' };
  }
  if (pedido.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(pedido.code_challenge)) {
    return { pedido: null, erro: 'O pedido do Claude veio incompleto. Volte ao Claude e conecte de novo.' };
  }
  return { pedido, erro: null };
}

/** Endereço de volta ao Claude (só para retorno da lista fechada), com o código ou com o erro. */
export function urlDeVolta(p: PedidoConector, resultado: { codigo: string } | { erro: string }): string {
  if (!RETORNOS_CONECTOR.includes(p.redirect_uri)) throw new Error('Endereço de retorno fora da lista.');
  const u = new URL(p.redirect_uri);
  if ('codigo' in resultado) u.searchParams.set('code', resultado.codigo);
  else u.searchParams.set('error', resultado.erro);
  if (p.state) u.searchParams.set('state', p.state);
  return u.toString();
}

export const mcpConector = {
  autorizar: (esc: string, p: PedidoConector) => rpc<{ ok: boolean; codigo: string; expira_em: string }>('v1_mcp_conector_autorizar', {
    p_escritorio: esc,
    p_pedido: { client_id: p.client_id, redirect_uri: p.redirect_uri, code_challenge: p.code_challenge, code_challenge_method: p.code_challenge_method },
  }),
};
