import { describe, expect, it } from 'vitest';
import { podeDesviar } from './desvios';
import { marcadosPadrao, podeEnviar, proximaSemana, type ClienteEnvio } from './envioAgenda';

describe('desvio', () => {
  const hoje = '2026-10-31';
  it('só tarefa que chegou, aberta e sem horas', () => {
    expect(podeDesviar({ data: hoje, status: 'planejada' }, hoje)).toBe(true);
    expect(podeDesviar({ data: '2026-11-01', status: 'planejada' }, hoje)).toBe(false);
    expect(podeDesviar({ data: hoje, status: 'nao_executada' }, hoje)).toBe(false);
    expect(podeDesviar({ data: hoje, status: 'planejada', horas_reais: 2 }, hoje)).toBe(false);
  });
});

describe('envio de agendas', () => {
  const c = (id: string, ag: number, ct: number, sit?: 'enviado' | 'erro') => ({ cliente_id: id, agendas: Array(ag).fill({}), contatos: Array(ct).fill({}),
    ultimo_envio: sit ? { situacao: sit, em: '', erro: null } : null }) as unknown as ClienteEnvio;
  it('próxima semana é de segunda a domingo', () => {
    expect(proximaSemana('2026-10-31')).toEqual({ de: '2026-11-02', ate: '2026-11-08' });   // sábado
    expect(proximaSemana('2026-11-02')).toEqual({ de: '2026-11-09', ate: '2026-11-15' });   // segunda
    expect(proximaSemana('2026-11-08')).toEqual({ de: '2026-11-09', ate: '2026-11-15' });   // domingo
  });
  it('sem agenda ou sem contato não vai', () => {
    expect(podeEnviar(c('a', 1, 1))).toBe(true);
    expect(podeEnviar(c('a', 0, 1))).toBe(false);
    expect(podeEnviar(c('a', 1, 0))).toBe(false);
  });
  it('já enviado abre desmarcado; quem falhou volta marcado', () => {
    expect(marcadosPadrao([c('a', 1, 1), c('b', 1, 1, 'enviado'), c('c', 1, 1, 'erro'), c('d', 1, 0)])).toEqual(['a', 'c']);
  });
});
