// V13a-2: ordem do Backlog de chamados — padrão prioridade × idade e ordem escolhida guardada no layout.
import { describe, expect, it } from 'vitest';
import { idadeDias, ordenarBacklog, rankPrioridade } from '../api/chamados';
import { normalizar, proximaOrdem } from './colunas';

describe('ordem do Backlog (V13a-2)', () => {
  it('padrão: prioridade (urgente → baixa) e depois o mais antigo', () => {
    const l = [
      { numero: 1, prioridade: 'baixa', criado_em: '2026-01-01T00:00:00Z' },
      { numero: 2, prioridade: 'urgente', criado_em: '2026-03-01T00:00:00Z' },
      { numero: 3, prioridade: 'alta', criado_em: '2026-02-01T00:00:00Z' },
      { numero: 4, prioridade: 'urgente', criado_em: '2026-02-01T00:00:00Z' },
      { numero: 5, prioridade: 'x', criado_em: '2025-01-01T00:00:00Z' },
    ];
    expect(ordenarBacklog(l).map(x => x.numero)).toEqual([4, 2, 3, 1, 5]);
    expect(rankPrioridade('urgente')).toBe(0);
    expect(rankPrioridade('baixa')).toBe(3);
  });
  it('idade em dias inteiros', () => {
    expect(idadeDias('2026-11-01T12:00:00Z', Date.parse('2026-11-10T11:00:00Z'))).toBe(8);
    expect(idadeDias('2026-11-11T00:00:00Z', Date.parse('2026-11-10T00:00:00Z'))).toBe(0);
  });
  it('clique: crescente → decrescente → padrão; outra coluna recomeça crescente', () => {
    expect(proximaOrdem(null, 'idade')).toEqual({ chave: 'idade', desc: false });
    expect(proximaOrdem({ chave: 'idade', desc: false }, 'idade')).toEqual({ chave: 'idade', desc: true });
    expect(proximaOrdem({ chave: 'idade', desc: true }, 'idade')).toBeNull();
    expect(proximaOrdem({ chave: 'idade', desc: true }, 'sla')).toEqual({ chave: 'sla', desc: false });
  });
  it('layout guarda a ordenação e descarta coluna que sumiu', () => {
    expect(normalizar(['a', 'b'], { ordenar: { chave: 'b', desc: true } }).ordenar).toEqual({ chave: 'b', desc: true });
    expect(normalizar(['a', 'b'], { ordenar: { chave: 'z', desc: true } }).ordenar).toBeUndefined();
    expect(normalizar(['a', 'b'], null).ordenar).toBeUndefined();
  });
});
