// Conector do Claude (0088): leitura do pedido de autorização e endereço de volta.
import { describe, expect, it } from 'vitest';
import { CLIENTE_CONECTOR, lerPedido, RETORNOS_CONECTOR, urlDeVolta, type PedidoConector } from './mcpConector';

const DESAFIO = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const busca = (o: Record<string, string>) => '?' + new URLSearchParams(o).toString();
const BOM = { mcp_autorizar: '1', client_id: CLIENTE_CONECTOR, redirect_uri: RETORNOS_CONECTOR[0], code_challenge: DESAFIO, code_challenge_method: 'S256', state: 'xyz' };

describe('conector do Claude', () => {
  it('URL comum do app não é pedido de autorização', () => {
    expect(lerPedido('')).toBeNull();
    expect(lerPedido('?v3=1')).toBeNull();
    expect(lerPedido(busca({ ...BOM, mcp_autorizar: '0' }))).toBeNull();
  });
  it('lê o pedido válido dos dois endereços do Claude', () => {
    for (const r of RETORNOS_CONECTOR) {
      const l = lerPedido(busca({ ...BOM, redirect_uri: r }))!;
      expect(l.erro).toBeNull();
      expect(l.pedido).toEqual({ client_id: CLIENTE_CONECTOR, redirect_uri: r, code_challenge: DESAFIO, code_challenge_method: 'S256', state: 'xyz' });
    }
    expect(lerPedido(busca({ ...BOM, state: '' }))!.pedido!.state).toBe('');
  });
  it('recusa cliente ou endereço de retorno fora da lista (nunca devolve pedido)', () => {
    for (const ruim of [{ client_id: 'outro' }, { redirect_uri: 'https://evil.example/cb' }, { redirect_uri: RETORNOS_CONECTOR[0] + '/x' }, { redirect_uri: 'http://localhost:3000/callback' }]) {
      const l = lerPedido(busca({ ...BOM, ...ruim }))!;
      expect(l.pedido).toBeNull();
      expect(l.erro).toMatch(/não veio do conector do Claude/);
    }
  });
  it('recusa pedido sem PKCE S256', () => {
    for (const ruim of [{ code_challenge_method: 'plain' }, { code_challenge: 'curto' }]) {
      const l = lerPedido(busca({ ...BOM, ...ruim }))!;
      expect(l.pedido).toBeNull();
      expect(l.erro).toMatch(/incompleto/);
    }
  });
  it('volta ao Claude com o código (ou o erro) e o state; nunca para endereço fora da lista', () => {
    const p = lerPedido(busca(BOM))!.pedido!;
    expect(urlDeVolta(p, { codigo: 'pmo_cod_abc' })).toBe(`${RETORNOS_CONECTOR[0]}?code=pmo_cod_abc&state=xyz`);
    expect(urlDeVolta(p, { erro: 'access_denied' })).toBe(`${RETORNOS_CONECTOR[0]}?error=access_denied&state=xyz`);
    expect(urlDeVolta({ ...p, state: null }, { codigo: 'c' })).toBe(`${RETORNOS_CONECTOR[0]}?code=c`);
    expect(() => urlDeVolta({ ...p, redirect_uri: 'https://evil.example/cb' } as PedidoConector, { codigo: 'c' })).toThrow();
  });
});
