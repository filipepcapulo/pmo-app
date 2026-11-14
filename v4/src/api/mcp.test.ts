import { describe, expect, it } from 'vitest';
import { comoConectar, diasParaVencer, ROTULO_FERRAMENTA, rotuloFerramenta, textoValidade, urlMcp } from './mcp';

describe('IA (MCP)', () => {
  it('monta o endereço do servidor a partir do projeto Supabase', () => {
    expect(urlMcp('https://abc.supabase.co')).toBe('https://abc.supabase.co/functions/v1/mcp');
    expect(urlMcp('https://abc.supabase.co/')).toBe('https://abc.supabase.co/functions/v1/mcp');
  });

  it('gera o comando do Claude Code e o JSON de configuração com o token no cabeçalho (nunca na URL)', () => {
    const c = comoConectar('https://abc.supabase.co/functions/v1/mcp', 'pmo_mcp_x');
    expect(c.claudeCode).toBe('claude mcp add --transport http pmo-bpms https://abc.supabase.co/functions/v1/mcp --header "Authorization: Bearer pmo_mcp_x"');
    const j = JSON.parse(c.json);
    expect(j.mcpServers['pmo-bpms']).toEqual({ type: 'http', url: 'https://abc.supabase.co/functions/v1/mcp', headers: { Authorization: 'Bearer pmo_mcp_x' } });
    expect(j.mcpServers['pmo-bpms'].url).not.toContain('pmo_mcp_');
  });

  it('descreve a validade do token', () => {
    const agora = new Date('2026-11-13T12:00:00Z');
    expect(diasParaVencer('2026-11-23T12:00:00Z', agora)).toBe(10);
    expect(textoValidade({ situacao: 'ativo', expira_em: '2026-11-23T12:00:00Z' }, agora)).toBe('vence em 10 dias');
    expect(textoValidade({ situacao: 'ativo', expira_em: '2026-11-14T10:00:00Z' }, agora)).toBe('vence amanhã');
    expect(textoValidade({ situacao: 'vencido', expira_em: '2026-11-01T00:00:00Z' }, agora)).toBe('vencido');
    expect(textoValidade({ situacao: 'revogado', expira_em: '2027-01-01T00:00:00Z' }, agora)).toBe('revogado');
  });

  it('SIGILO: nenhuma ferramenta conhecida da tela é do Financeiro', () => {
    const nomes = Object.keys(ROTULO_FERRAMENTA);
    expect(nomes).toHaveLength(22);
    for (const n of nomes) expect(n).not.toMatch(/fin|fech|rentab|remun|salar|valor|custo|margem|receita/i);
    expect(rotuloFerramenta('consultar_agenda')).toBe('Agenda');
    expect(rotuloFerramenta('ferramenta_nova')).toBe('ferramenta_nova');
  });
});
